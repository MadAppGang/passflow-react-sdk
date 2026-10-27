/**
 * `UpgradeProvider` — the React side of the assurance-upgrade flow (§8.3).
 *
 * It owns the controller (through `passflow.upgrade`), bridges the
 * promise-returning `UpgradePromptHandler` to React state, and mounts the
 * dialog from `src/components/ui/upgrade-dialog`. It selects a state and maps
 * domain data onto that component's props; it renders no UI of its own and
 * styles nothing, per the project's component-library boundary.
 *
 * Three properties fall out of the shipped controller, and they are why this
 * is small:
 *
 * 1. **The wrong-code loop needs no plumbing.** The controller catches the
 *    recoverable failure, sets `previousError` and calls `prompt()` again, so
 *    the provider simply receives a new request and the dialog re-renders with
 *    the error, still open.
 * 2. **Attempt budgeting needs no plumbing.** `maxAttempts` bounds the loop in
 *    the controller and then fails the flight, which arrives here as the
 *    `exhausted` terminal state.
 * 3. **Passkey has no code field.** `factors[i].input === 'none'` submits with
 *    no code and the dialog shows `working` while the platform authenticator
 *    runs.
 *
 * **The anti-leak rule is the single most important line in this file.** On
 * unmount, on teardown and on a session change, the pending prompt is resolved
 * `{ type: 'cancel' }`. A dangling `resolve` is an Observer leak wearing a
 * promise: the controller awaits forever, the elevation never settles, and
 * every request that joined the single flight hangs.
 *
 * **The session-change reset.** A challenge is server-bound to the session, so
 * an abandoned flight must never elevate a NEW session. The core discards its
 * controller on `SignIn` / `SignOut`; this provider discards its view of it in
 * the same breath, and the waiter that was mid-flight settles as
 * `session changed`, which the hook reports as `idle` — nothing that did not
 * happen is reported as though it had.
 */

import { UpgradeDialog, dialogOutcomeFromError, readAssuranceBar, toDialogState } from '@/components/ui/upgrade-dialog';
import type { UpgradeDialogLabels, UpgradeDialogOutcome, UpgradeDialogProps } from '@/components/ui/upgrade-dialog';
import {
  UpgradeContext,
  type UpgradeContextValue,
  type UpgradeElevateOptions,
  type UpgradeErrorStatusKind,
  type UpgradeHookState,
  type UpgradePromptView,
  type UpgradeSettledState,
} from '@/context/upgrade-context';
import { usePassflow } from '@/hooks/use-passflow';
import { registerUpgradeAuthInstance, upgradeAuthInstance } from '@/utils/upgrade-auth';
import {
  type AssuranceBar,
  PassflowEvent,
  type PassflowSubscriber,
  type ReplayPolicy,
  type UpgradeChallenge,
  type UpgradeDiagnosticSink,
  type UpgradeFactor,
  type UpgradeFactorType,
  type UpgradeFlightSummary,
  type UpgradePromptHandler,
  type UpgradePromptResult,
  type UpgradeReplayInfo,
  type Waiter,
  requiredAcrLevel,
} from '@passflow/core';
import { type FC, type ReactElement, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type UpgradeProviderProps = {
  children?: ReactNode;
  /** Default `true`. `false` installs nothing and leaves the hook inert. */
  enabled?: boolean;
  /**
   * Where the customer's own API is — domain 2 (§13.5). Nothing outside this
   * and Passflow's own API is ever observed, and there is no allow-all opt-in.
   */
  backend?: string | string[];
  /**
   * Patches `globalThis.fetch` through the core's registry. **Off by default**,
   * and a different decision from enabling the UI: one prop for both would
   * bundle "show me the verification prompt" with "patch the global", and only
   * the second has the blast radius.
   */
  interceptFetch?: boolean;
  /** Requires the RFC 9470 channel. The body is then never read for a challenge. */
  requireChallengeChannel?: 'header';
  /** NARROWING ONLY: `false` excludes an admitted URL; `true` cannot widen. */
  shouldIntercept?: (url: string) => boolean;
  replay?: ReplayPolicy;
  /** The fetch surface's only cancellation option. Default `'resolve-original'`. */
  onCancel?: 'resolve-original' | 'reject';
  onUpgradeDiagnostic?: UpgradeDiagnosticSink;
  factors?: readonly UpgradeFactor[];
  maxAttempts?: number;
  relyingPartyId?: string;
  /** Per-factor wording for the dialog. */
  labels?: UpgradeDialogLabels;
  title?: string;
  /**
   * FR5's render-prop override. It receives the **exact** props the built-in
   * dialog would render — a typed, constrained override with no `className` or
   * `style` leak.
   *
   * It carries the same obligations as the built-in dialog, the selection
   * signal included: the `challenge` state's `onSelectFactor` must be called
   * when the user picks a factor, because that is the only thing that reports
   * §13.2's selection boundary to the controller. An override that never calls
   * it leaves the controller `collecting` for the whole ceremony, so a late
   * join re-ranks mid-entry — degraded, not silent.
   */
  renderDialog?: (props: UpgradeDialogProps) => ReactElement | null;
};

type PendingResolve = ((result: UpgradePromptResult) => void) | undefined;

/** §13.3's settlement table, hook column, for a flight that produced no proof. */
const errorStateOf = (error: Error): UpgradeSettledState => {
  switch (dialogOutcomeFromError(error)) {
    case 'cancelled':
    case 'session-changed':
      // Cancellation is not a status (§13.3): it is `elevate()` resolving null.
      return { status: 'idle' };
    case 'insufficient':
      return {
        status: 'insufficient',
        obtained: readAssuranceBar((error as { obtained?: unknown }).obtained) ?? {},
        required: readAssuranceBar((error as { required?: unknown }).required) ?? {},
      };
    case 'exhausted':
      return { status: 'error', kind: 'exhausted', error };
    case 'unsatisfiable':
      return { status: 'error', kind: 'unsatisfiable', error };
    case 'unavailable':
      return { status: 'error', kind: 'unavailable', error };
    default:
      return { status: 'error', kind: 'transport' satisfies UpgradeErrorStatusKind, error };
  }
};

const summaryError = (summary: UpgradeFlightSummary): Error =>
  summary.error ??
  (summary.proof.status === 'failed' ? summary.proof.reason : undefined) ??
  new Error('The verification flight failed without reporting a reason.');

/** One terminal state per flight, taken from the controller's summary (§13.4). */
const summaryToState = (summary: UpgradeFlightSummary): UpgradeSettledState => {
  if (summary.terminal === 'success') return { status: 'success' };
  if (summary.terminal === 'insufficient') {
    return {
      status: 'insufficient',
      obtained: summary.insufficient?.obtained ?? {},
      required: summary.insufficient?.required ?? {},
    };
  }
  return errorStateOf(summaryError(summary));
};

const summaryToOutcome = (summary: UpgradeFlightSummary): UpgradeDialogOutcome => {
  if (summary.terminal === 'success') return { kind: 'elevated' };
  if (summary.terminal === 'insufficient') {
    return {
      kind: 'insufficient',
      obtained: summary.insufficient?.obtained ?? {},
      required: summary.insufficient?.required ?? {},
    };
  }
  return { kind: 'failed', error: summaryError(summary) };
};

const asError = (value: unknown): Error => (value instanceof Error ? value : new Error(String(value)));

const statedBar = (options?: UpgradeElevateOptions): AssuranceBar | undefined => {
  if (options === undefined) return undefined;
  const bar = readAssuranceBar({
    acrValues: options.acrValues,
    level: requiredAcrLevel(options.acrValues),
    maxAge: options.maxAge,
  });
  return bar;
};

/**
 * The imperative seam's challenge. A caller asking for a bar states it here;
 * the parsing of `acrValues` is the core's `requiredAcrLevel`, never a second
 * reading of the ACR list.
 */
const imperativeChallenge = (options?: UpgradeElevateOptions): UpgradeChallenge => ({
  acrValues: options?.acrValues,
  requiredLevel: requiredAcrLevel(options?.acrValues),
  maxAge: options?.maxAge,
  status: 403,
  channels: [],
});

/**
 * Value identity for `factors`, so a fresh array literal with the same factors
 * does not tear down and reinstall the interceptors (H13).
 *
 * The factor TYPE is the identity: everything else on an `UpgradeFactor` is the
 * `assert` implementation, and the registry is keyed by type. A caller who
 * swaps one type's implementation for another keeps the installed one until the
 * type list itself changes — the same trade the `backend` join already makes,
 * and the alternative is an unconditional reinstall on every render.
 */
const factorsSignature = (factors?: readonly UpgradeFactor[]): string =>
  factors === undefined ? '\u0000default' : factors.map((factor) => factor.type).join('\u0000');

/**
 * Value identity for `replay` (H13). The policy is a union, so each arm gets
 * its own comparable signature:
 *
 * - a mode string compares as itself;
 * - a limits object compares by its two fields;
 * - a PREDICATE compares as the constant `fn`, because a function's identity is
 *   never stable across renders. The current closure is reached through a ref
 *   and called by a stable proxy, which is the same pattern `shouldIntercept`
 *   and `onUpgradeDiagnostic` already use here.
 */
const replaySignature = (replay?: ReplayPolicy): string => {
  if (replay === undefined) return 'none';
  if (typeof replay === 'string') return `mode:${replay}`;
  if (typeof replay === 'function') return 'fn';
  return `limits:${replay.maxBodyBytes ?? ''}:${replay.allowStreamingBody ?? ''}`;
};

export const UpgradeProvider: FC<UpgradeProviderProps> = ({
  children,
  enabled = true,
  backend,
  interceptFetch = false,
  requireChallengeChannel,
  shouldIntercept,
  replay,
  onCancel,
  onUpgradeDiagnostic,
  factors,
  maxAttempts,
  relyingPartyId,
  labels,
  title,
  renderDialog,
}) => {
  const passflow = usePassflow();

  const [prompt, setPrompt] = useState<UpgradePromptView | null>(null);
  const [state, setState] = useState<UpgradeHookState>({ status: 'idle' });
  const [selectedFactor, setSelectedFactor] = useState<UpgradeFactorType | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [outcome, setOutcome] = useState<UpgradeDialogOutcome | undefined>(undefined);
  const [installed, setInstalled] = useState(false);

  /** The open prompt's resolver. Cleared the instant it is used — H3's "once". */
  const resolveRef = useRef<PendingResolve>(undefined);
  /** The open request, so the selection signal reaches the controller. */
  const requestRef = useRef<Parameters<UpgradePromptHandler>[0] | null>(null);
  /** Whether this prompt already reported a selection (§13.2 T3 fires once). */
  const reportedSelectionRef = useRef(false);
  /** Set by `cancel()`: the user closed the dialog, so no terminal panel is shown. */
  const userCancelledRef = useRef(false);
  /**
   * H11 — cancellation is STICKY for the rest of the flight.
   *
   * After a submit the prompt's resolver is already spent, so `cancel()` has
   * nothing to answer and the cancellation was simply lost: the flight ran on,
   * and the controller re-prompted the user it had just been told to stop
   * asking. The intent is recorded here and answered at the first boundary the
   * controller offers — its next `prompt()` call — which settles the flight as
   * `UpgradeCancelledError` and so puts every surface on §13.3's asymmetric
   * contract (fetch resolves the untouched 401/403, axios and the imperative
   * seam reject, `useUpgrade().elevate` resolves `null`). Cleared when the
   * flight settles, so it can never leak into the next one.
   *
   * It cannot abort a request already on the wire: the core exposes no abort
   * channel for a round in progress, and inventing one here would be a second
   * lifecycle authority beside the controller (§13.2).
   */
  const cancelRequestedRef = useRef(false);

  // Callback props are read through refs so that re-rendering with a new inline
  // closure never tears down and reinstalls the interceptors.
  const shouldInterceptRef = useRef(shouldIntercept);
  const diagnosticRef = useRef(onUpgradeDiagnostic);
  shouldInterceptRef.current = shouldIntercept;
  diagnosticRef.current = onUpgradeDiagnostic;

  // H13: `factors` and `replay` are compared by VALUE in the install effect's
  // dependencies (see `factorsSignature` / `replaySignature`) and read through
  // these refs, so an inline array or an inline predicate no longer reinstalls
  // the interceptors on every render. `onCancel` needs neither: it is a string
  // union, so it already compares by value.
  const factorsRef = useRef(factors);
  const replayRef = useRef(replay);
  factorsRef.current = factors;
  replayRef.current = replay;

  /**
   * The stable stand-in for a caller-supplied replay PREDICATE. The non-function
   * arms are passed through untouched; this is only ever installed when the
   * policy is a function, and a change of arm changes the signature and
   * reinstalls, which is why the fallback is unreachable rather than a decision.
   */
  const replayPredicate = useCallback((info: UpgradeReplayInfo): boolean => {
    const policy = replayRef.current;
    return typeof policy === 'function' ? policy(info) : true;
  }, []);

  /** Resolves a pending prompt exactly once. The anti-leak primitive. */
  const settlePrompt = useCallback((result: UpgradePromptResult): boolean => {
    const resolve = resolveRef.current;
    if (resolve === undefined) return false;
    resolveRef.current = undefined;
    resolve(result);
    return true;
  }, []);

  const clearPromptView = useCallback(() => {
    requestRef.current = null;
    reportedSelectionRef.current = false;
    setPrompt(null);
    setSelectedFactor(null);
    setShowAlternatives(false);
    setBusy(false);
  }, []);

  const promptHandler = useCallback<UpgradePromptHandler>(
    (request) =>
      new Promise<UpgradePromptResult>((resolve) => {
        // H11: the user cancelled after submitting and the controller came back
        // for another answer. Answer the cancellation instead of re-opening a
        // dialog they already closed.
        if (cancelRequestedRef.current) {
          resolve({ type: 'cancel' });
          return;
        }

        // Branch 2's channel (§13.2 T2): the controller pushes a raised bar and
        // a re-ranked list into the OPEN prompt, which updates without
        // resolving. Subscribed synchronously, before anything is awaited.
        request.onRequirementRaised = (next) => {
          setPrompt({ challenge: next.challenge, factors: next.factors, previousError: request.previousError });
          setState({ status: 'challenged', challenge: next.challenge, factors: next.factors.map((f) => f.type) });
        };

        resolveRef.current = resolve;
        requestRef.current = request;
        reportedSelectionRef.current = false;
        userCancelledRef.current = false;
        setOutcome(undefined);
        setSelectedFactor(null);
        setShowAlternatives(false);
        setBusy(false);
        setPrompt({ challenge: request.challenge, factors: request.factors, previousError: request.previousError });
        setState({
          status: 'challenged',
          challenge: request.challenge,
          factors: request.factors.map((factor) => factor.type),
        });
      }),
    [],
  );

  const handleFlightSettled = useCallback(
    (summary: UpgradeFlightSummary) => {
      cancelRequestedRef.current = false;
      setState(summaryToState(summary));
      setOutcome(userCancelledRef.current ? undefined : summaryToOutcome(summary));
      clearPromptView();
    },
    [clearPromptView],
  );

  useEffect(() => {
    if (!enabled) {
      setInstalled(false);
      return;
    }

    const teardown = passflow.upgrade.enable({
      prompt: promptHandler,
      backend,
      interceptFetch,
      requireChallengeChannel,
      shouldIntercept: shouldIntercept === undefined ? undefined : (url) => shouldInterceptRef.current?.(url) !== false,
      replay: typeof replayRef.current === 'function' ? replayPredicate : replayRef.current,
      onCancel,
      onUpgradeDiagnostic: onUpgradeDiagnostic === undefined ? undefined : (d) => diagnosticRef.current?.(d),
      factors: factorsRef.current,
      maxAttempts,
      relyingPartyId,
      onFlightSettled: handleFlightSettled,
    });
    setInstalled(true);

    return () => {
      // The anti-leak rule: never leave the controller awaiting an answer.
      settlePrompt({ type: 'cancel' });
      teardown();
      setInstalled(false);
    };
    // `backend` is compared by value so a fresh array literal does not reinstall.
  }, [
    passflow,
    enabled,
    Array.isArray(backend) ? backend.join('\u0000') : backend,
    interceptFetch,
    requireChallengeChannel,
    shouldIntercept === undefined,
    onUpgradeDiagnostic === undefined,
    // H13: compared by value, never by identity — an inline policy object, an
    // inline predicate or a fresh factor array must not reinstall.
    replaySignature(replay),
    replayPredicate,
    onCancel,
    factorsSignature(factors),
    maxAttempts,
    relyingPartyId,
    promptHandler,
    handleFlightSettled,
    settlePrompt,
  ]);

  /**
   * Publishes this provider's instance to the free-function adapters, twice,
   * for two different reasons — and both are load-bearing.
   *
   * **The render-phase write** exists because React runs a child's effects
   * before the parent's in the same commit, so the documented
   * `useEffect(() => attachAuth(api), [])` in a child would otherwise reach
   * `requireInstance` with nothing registered and throw — and a throw inside an
   * effect unmounts the tree. Publishing in render makes attach order
   * irrelevant. It is guarded and idempotent, so a re-render or a discarded
   * Strict-Mode render changes nothing.
   *
   * **The effect re-registers and releases through the same call**, so the pair
   * is symmetric: `registerUpgradeAuthInstance` returns the release for its own
   * registration, and that release is deferred by a microtask and cancelled by
   * any registration in the meantime (see `utils/upgrade-auth`). React Strict
   * Mode mounts, unmounts and remounts effects in development, and a cleanup
   * that released immediately would leave the registry empty for the remount —
   * render does not run again, and the child-before-parent effect order holds
   * on the remount pass as well, so the re-registration here cannot be early
   * enough on its own. Measured, not assumed: with an immediate release the
   * remounting child's `attachAuth` throws.
   *
   * A ref cannot be the publication channel, which is why this is not the ref
   * shape: the free functions are bare module imports called by code that never
   * sees this component's context or refs, so the module-level registry is the
   * only channel children can read.
   */
  if (upgradeAuthInstance() !== passflow) registerUpgradeAuthInstance(passflow);
  useEffect(() => registerUpgradeAuthInstance(passflow), [passflow]);

  /**
   * The session-change reset. The core discards its controller here; the view
   * of it must go with it, or a dialog from the old session would collect an
   * answer that can only elevate the new one.
   */
  useEffect(() => {
    const subscriber: PassflowSubscriber = {
      onAuthChange: () => {
        cancelRequestedRef.current = false;
        settlePrompt({ type: 'cancel' });
        clearPromptView();
        setOutcome(undefined);
        setState({ status: 'idle' });
      },
    };
    const events = [PassflowEvent.SignIn, PassflowEvent.SignOut];
    passflow.subscribe(subscriber, events);
    return () => passflow.unsubscribe(subscriber, events);
  }, [passflow, settlePrompt, clearPromptView]);

  const selectFactor = useCallback((factor: UpgradeFactorType) => {
    setSelectedFactor(factor);
    // §13.2 T3: the selection boundary, reported before any answer is
    // submitted. `selected` is defined off this call and off nothing else.
    requestRef.current?.onFactorSelected(factor);
    reportedSelectionRef.current = true;
  }, []);

  const submit = useCallback(
    (code?: string) => {
      const request = requestRef.current;
      if (request === null || resolveRef.current === undefined) return;
      const factor = selectedFactor ?? request.factors[0]?.type;
      if (factor === undefined) return;
      if (!reportedSelectionRef.current) {
        // A submit that skipped the picker still selected a factor — the
        // suggested one — and the controller must hear it before the ceremony.
        request.onFactorSelected(factor);
        reportedSelectionRef.current = true;
      }
      setBusy(true);
      setState({ status: 'submitting' });
      settlePrompt({ type: 'submit', factor, code });
    },
    [selectedFactor, settlePrompt],
  );

  const cancel = useCallback(() => {
    userCancelledRef.current = true;
    cancelRequestedRef.current = true;
    if (!settlePrompt({ type: 'cancel' })) {
      // Nothing was pending: either a terminal panel is on screen, or an answer
      // is in flight. Close it either way — the sticky flag answers the
      // controller's next prompt, and leaving a busy dialog open would ask the
      // user to wait for a flight they have abandoned.
      setOutcome(undefined);
    }
    clearPromptView();
    setState({ status: 'idle' });
  }, [settlePrompt, clearPromptView]);

  const dismiss = useCallback(() => {
    setOutcome(undefined);
  }, []);

  const toggleAlternatives = useCallback(() => {
    setShowAlternatives((shown) => !shown);
  }, []);

  const elevate = useCallback(
    async (options?: UpgradeElevateOptions): Promise<UpgradeSettledState | null> => {
      const requested = statedBar(options);
      const waiter: Waiter = requested === undefined ? { kind: 'imperative' } : { kind: 'imperative', requested };
      try {
        await passflow.upgrade.elevate(imperativeChallenge(options), waiter);
        return { status: 'success' };
      } catch (error) {
        // The one surface where cancellation resolves `null`: there the
        // cancellation IS the whole value (§13.3).
        if (dialogOutcomeFromError(error) === 'cancelled') return null;
        return errorStateOf(asError(error));
      }
    },
    [passflow],
  );

  const value = useMemo<UpgradeContextValue>(
    () => ({
      enabled: enabled && installed,
      state,
      prompt,
      selectedFactor,
      selectFactor,
      submit,
      cancel,
      dismiss,
      elevate,
    }),
    [enabled, installed, state, prompt, selectedFactor, selectFactor, submit, cancel, dismiss, elevate],
  );

  const dialogState = toDialogState({
    prompt:
      prompt === null ? null : { challenge: prompt.challenge, factors: prompt.factors, previousError: prompt.previousError },
    outcome,
    ui: { selected: selectedFactor, busy, showAlternatives },
    labels,
    handlers: {
      onSelectFactor: selectFactor,
      onToggleAlternatives: toggleAlternatives,
      onSubmit: submit,
      onCancel: cancel,
      onDismiss: dismiss,
    },
  });

  const dialogProps: UpgradeDialogProps = {
    open: prompt !== null || outcome !== undefined,
    title,
    state: dialogState,
  };

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      {/* Mounted after `children` so it overlays them. */}
      {renderDialog === undefined ? <UpgradeDialog {...dialogProps} /> : renderDialog(dialogProps)}
    </UpgradeContext.Provider>
  );
};
