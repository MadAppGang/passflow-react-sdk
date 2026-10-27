/**
 * Pure mapping from the controller's prompt request plus local UI state to the
 * dialog's rendering union. No React, no DOM, no styling — architecture §10.2
 * classifies this as non-visual state mapping, which is why it is the one file
 * in this folder a Vitest spec may cover.
 *
 * The inputs are declared structurally — `UpgradePromptSnapshot` is the shape of
 * `UpgradePromptRequest` that the dialog actually reads — but the one judgement
 * that is NOT structural is which kind of failure an error is: that belongs to
 * `@passflow/core`, which raises the errors, and is imported from it.
 */

import { type UpgradeErrorKind, classifyUpgradeError } from '@passflow/core';
import type {
  AssuranceBar,
  UpgradeDialogFactor,
  UpgradeDialogState,
  UpgradeFactorCodeContract,
  UpgradeFactorInput,
  UpgradeFactorType,
} from './types';

export type UpgradeChallengeSnapshot = {
  requiredLevel?: number;
  acrValues?: string;
  maxAge?: number;
};

export type UpgradeFactorSnapshot = {
  type: UpgradeFactorType;
  input: UpgradeFactorInput;
};

export type UpgradePromptSnapshot = {
  challenge: UpgradeChallengeSnapshot;
  /** Already ranked by `selectFactors`; index 0 is the suggested factor. */
  factors: readonly UpgradeFactorSnapshot[];
  previousError?: unknown;
};

export type UpgradeDialogLabels = Partial<Record<UpgradeFactorType, { label: string; hint?: string }>>;

/** How the flight ended, as the controller's outcome summary reports it (§13.4). */
export type UpgradeDialogOutcome =
  | { kind: 'elevated' }
  | { kind: 'insufficient'; obtained: AssuranceBar; required: AssuranceBar }
  | { kind: 'cancelled' }
  | { kind: 'failed'; error: unknown };

export type UpgradeDialogUiState = {
  selected?: UpgradeFactorType | null;
  busy?: boolean;
  showAlternatives?: boolean;
};

export type UpgradeDialogHandlers = {
  onSelectFactor: (factor: UpgradeFactorType) => void;
  onToggleAlternatives: () => void;
  onSubmit: (code?: string) => void;
  onCancel: () => void;
  onDismiss: () => void;
  onRetry?: () => void;
};

export type ToDialogStateInput = {
  prompt: UpgradePromptSnapshot | null;
  outcome?: UpgradeDialogOutcome;
  ui?: UpgradeDialogUiState;
  labels?: UpgradeDialogLabels;
  handlers: UpgradeDialogHandlers;
  testId?: string;
};

/**
 * How an elevation failure reads to the user. `rejected` is the retryable
 * wrong-answer case, which keeps the dialog open on the challenge.
 */
export type UpgradeDialogErrorKind =
  | 'rejected'
  | 'cancelled'
  | 'exhausted'
  | 'unsatisfiable'
  | 'unavailable'
  | 'transport'
  | 'insufficient'
  | 'session-changed';

export const DEFAULT_FACTOR_LABELS: Record<UpgradeFactorType, { label: string; hint?: string }> = {
  totp: { label: 'Authenticator app', hint: 'Enter the code from your authenticator app' },
  passkey: { label: 'Passkey', hint: 'Confirm with your device' },
  recovery_codes: { label: 'Recovery code', hint: 'Enter one of your single-use recovery codes' },
  email_otp: { label: 'Email code', hint: 'Enter the code we emailed you' },
  sms_otp: { label: 'SMS code', hint: 'Enter the code we texted you' },
};

const CHALLENGE_REASON = 'This action needs extra verification';

/** A six-digit numeric one-time code — TOTP and the two OTP transports. */
const OTP_CODE_CONTRACT: UpgradeFactorCodeContract = Object.freeze({
  maxLength: 6,
  inputMode: 'numeric',
  autoComplete: 'one-time-code',
  autoCapitalize: 'off',
});

/**
 * Per-factor code contracts, keyed by the factor type, which is the only thing
 * about a factor the protocol guarantees.
 *
 * `recovery_codes` is the reason this table exists. The server generates them
 * at `DefaultRecoveryCodeLength` (12) from a 32-character alphanumeric charset
 * and accepts a configured length anywhere in 6..16, so the cap is the server's
 * MAXIMUM — capping at the default would reject a valid code on a deployment
 * that raised it, and capping at six (the old single hardcoded number) rejected
 * every code on every deployment. A shorter configured code simply types
 * shorter; a cap can only ever do harm by being too small.
 *
 * `null` means the factor collects nothing typed: its proof comes from the
 * ceremony, so there is no field and no contract to state.
 */
export const UPGRADE_FACTOR_CODE_CONTRACTS: Readonly<{
  totp: UpgradeFactorCodeContract;
  email_otp: UpgradeFactorCodeContract;
  sms_otp: UpgradeFactorCodeContract;
  recovery_codes: UpgradeFactorCodeContract;
  passkey: null;
}> = Object.freeze({
  totp: OTP_CODE_CONTRACT,
  email_otp: OTP_CODE_CONTRACT,
  sms_otp: OTP_CODE_CONTRACT,
  recovery_codes: Object.freeze({
    maxLength: 16,
    inputMode: 'text',
    autoComplete: 'off',
    autoCapitalize: 'characters',
  }),
  passkey: null,
});

/**
 * The contract for a factor that collects a typed answer. A `'code'` factor the
 * table has no entry for falls back to the OTP shape rather than to no cap at
 * all, so an unknown future code factor is merely sub-optimal, never broken.
 */
const codeContractFor = (type: UpgradeFactorType): UpgradeFactorCodeContract =>
  UPGRADE_FACTOR_CODE_CONTRACTS[type] ?? OTP_CODE_CONTRACT;

/** Index 0 stays index 0: `selectFactors` already ranked the list, and ranking is not filtering. */
export const toDialogFactors = (
  factors: readonly UpgradeFactorSnapshot[],
  labels?: UpgradeDialogLabels,
): UpgradeDialogFactor[] =>
  factors.map((factor) => {
    const fallback = DEFAULT_FACTOR_LABELS[factor.type];
    const override = labels?.[factor.type];
    const base = {
      type: factor.type,
      label: override?.label ?? fallback.label,
      hint: override?.hint ?? fallback.hint,
    };
    return factor.input === 'code'
      ? { ...base, input: 'code' as const, code: codeContractFor(factor.type) }
      : { ...base, input: 'none' as const };
  });

const readString = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined);

const readRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

/**
 * Every kind `@passflow/core` can classify, mapped to the panel the user sees.
 *
 * **This table is the fix for PFL-497's headline defect, and its totality is
 * the mechanism.** The previous version read `code` first, and since every
 * classified transport failure carries the same fixed literal
 * `code === 'upgrade_transport'`, that catch-all swallowed the kinds with their
 * own route — a mistyped code (`wrong_code`, retryable) landed on a terminal
 * panel. Routing by `kind` through a `Record<UpgradeErrorKind, …>` makes the
 * catch-all unnecessary and a missing route a TYPE error: a new kind added to
 * core cannot compile here until someone decides where it goes.
 *
 * `attempts_exhausted` is terminal (H3). It is the controller's local attempt
 * budget being spent, so the challenge the server holds will never be accepted
 * again; routing it with the retryable kinds re-prompted forever. It shares the
 * `exhausted` panel with the server's own `challenge_too_many_attempts`, which
 * is the same row of §13.3's settlement table.
 */
const DIALOG_KIND_BY_UPGRADE_KIND: Readonly<Record<UpgradeErrorKind, UpgradeDialogErrorKind>> = Object.freeze({
  // Retryable: the user answers again, the prompt stays open (§3.3, §13.3).
  wrong_code: 'rejected',
  challenge_spent: 'rejected',
  not_registered: 'rejected',
  prepare_not_required: 'rejected',
  // Terminal.
  exhausted: 'exhausted',
  attempts_exhausted: 'exhausted',
  unavailable: 'unavailable',
  session_changed: 'session-changed',
  fatal: 'transport',
  protocol: 'transport',
  network: 'transport',
});

const isUpgradeErrorKind = (value: string | undefined): value is UpgradeErrorKind =>
  value !== undefined && Object.hasOwn(DIALOG_KIND_BY_UPGRADE_KIND, value);

/**
 * Whether the value carries enough HTTP fact for core's classifier to say
 * anything at all. Without one of these, `classifyUpgradeError` would read the
 * value as a network failure, so a stray non-protocol object would be reported
 * to the user as a transport outcome it has no evidence for.
 */
const hasTransportFacts = (record: Record<string, unknown>): boolean =>
  typeof record.status === 'number' || typeof record.id === 'string' || readRecord(record.response) !== undefined;

/**
 * The kind, as core determines it. The dialog states no kinds of its own.
 *
 * The already-tagged `kind` is read FIRST, and that order is load-bearing:
 * `classifyUpgradeError` passes a `UpgradeTransportError` through by
 * `instanceof`, which fails across a duplicated bundle or a structured clone,
 * and re-classifying an already-classified error by its bare status re-buckets
 * a `wrong_code` 401 into `session_changed`. The string is validated against
 * the route table, so a kind core does not know still falls through to the
 * classifier.
 */
const upgradeKindOf = (error: unknown, record: Record<string, unknown>): UpgradeErrorKind | undefined => {
  const tagged = readString(record.kind);
  if (isUpgradeErrorKind(tagged)) return tagged;
  if (!hasTransportFacts(record)) return undefined;
  // `'refresh'` is the commit round: the dialog only ever sees a failure that
  // already travelled through a flight, and the one round-dependent id
  // (`token.invalid`) means a session change there, which is the terminal
  // reading and the safe one for an un-tagged error.
  return classifyUpgradeError(error, 'refresh').kind;
};

/**
 * How a failure reads to the user, as the dialog's own vocabulary.
 *
 * Named `dialogOutcomeFromError`, not `classifyUpgradeError`: that name belongs
 * to `@passflow/core`, and holding it here shadowed core's symbol in the
 * package's own star exports, which made the real classifier unreachable to
 * consumers. This function decides nothing about what the error IS — core's
 * classifier does — only which panel that kind is shown on.
 *
 * The dedicated error classes are matched before the kind table because they
 * are not transport failures at all: they carry no `kind`, and core's
 * classifier has nothing to say about them.
 */
export const dialogOutcomeFromError = (error: unknown): UpgradeDialogErrorKind => {
  const record = readRecord(error);
  if (!record) return 'rejected';
  const code = readString(record.code);
  const name = readString(record.name);

  if (code === 'upgrade_cancelled' || name === 'UpgradeCancelledError' || record.cancelled === true) return 'cancelled';
  if (code === 'upgrade_unsatisfiable' || name === 'UpgradeUnsatisfiableError') return 'unsatisfiable';
  if (code === 'upgrade_unavailable' || name === 'UpgradeUnavailableError') return 'unavailable';
  if (code === 'upgrade_exhausted' || name === 'UpgradeExhaustedError') return 'exhausted';
  if (code === 'upgrade_insufficient' || name === 'UpgradeInsufficientError') return 'insufficient';
  if (code === 'upgrade_session_changed' || name === 'UpgradeSessionChangedError') return 'session-changed';

  const kind = upgradeKindOf(error, record);
  // Nothing identifiable: keep the prompt open rather than inventing a terminal
  // outcome. The controller's attempt budget bounds the re-prompting.
  return kind === undefined ? 'rejected' : DIALOG_KIND_BY_UPGRADE_KIND[kind];
};

export const readAssuranceBar = (value: unknown): AssuranceBar | undefined => {
  const record = readRecord(value);
  if (!record) return undefined;
  const bar: AssuranceBar = {};
  if (typeof record.acrValues === 'string') bar.acrValues = record.acrValues;
  if (typeof record.level === 'number') bar.level = record.level;
  if (typeof record.maxAge === 'number') bar.maxAge = record.maxAge;
  return bar.acrValues === undefined && bar.level === undefined && bar.maxAge === undefined ? undefined : bar;
};

/** Human wording for a bar, on whichever axis it constrains. */
export const describeAssuranceBar = (bar?: AssuranceBar): string => {
  if (!bar) return 'an unknown level';
  const parts: string[] = [];
  if (bar.level !== undefined) parts.push(`AAL${bar.level}`);
  else if (bar.acrValues) parts.push(`acr ${bar.acrValues}`);
  if (bar.maxAge !== undefined) parts.push(`verified within ${bar.maxAge}s`);
  return parts.length > 0 ? parts.join(', ') : 'an unknown level';
};

const challengeBar = (challenge: UpgradeChallengeSnapshot): AssuranceBar | undefined =>
  readAssuranceBar({
    acrValues: challenge.acrValues,
    level: challenge.requiredLevel,
    maxAge: challenge.maxAge,
  });

const errorMessage = (error: unknown, fallback: string): string => {
  const record = readRecord(error);
  return readString(record?.message) ?? fallback;
};

const terminalFromError = (input: ToDialogStateInput, error: unknown): UpgradeDialogState => {
  const { handlers, testId } = input;
  switch (dialogOutcomeFromError(error)) {
    case 'cancelled':
      return {
        kind: 'cancelled',
        message: 'Verification cancelled',
        detail: 'The action that needed extra verification was not completed.',
        testId,
        onDismiss: handlers.onDismiss,
      };
    case 'exhausted':
      return {
        kind: 'exhausted',
        message: 'Too many attempts',
        detail: errorMessage(error, 'No attempts are left for this verification. Start the action again to retry.'),
        testId,
        onDismiss: handlers.onDismiss,
      };
    case 'unsatisfiable':
      return {
        kind: 'unsatisfiable',
        message: 'No usable verification method',
        detail: errorMessage(error, 'None of your verification methods can answer this request.'),
        required: input.prompt ? challengeBar(input.prompt.challenge) : undefined,
        testId,
        onDismiss: handlers.onDismiss,
      };
    case 'unavailable':
      return {
        kind: 'unavailable',
        message: 'Verification is unavailable',
        detail: errorMessage(error, 'This deployment cannot raise your assurance level right now.'),
        testId,
        onDismiss: handlers.onDismiss,
      };
    case 'session-changed':
      return {
        kind: 'cancelled',
        message: 'Verification stopped',
        detail: errorMessage(error, 'Your session changed while verifying, so the request was abandoned.'),
        testId,
        onDismiss: handlers.onDismiss,
      };
    case 'insufficient': {
      const record = readRecord(error);
      return {
        kind: 'insufficient',
        message: errorMessage(error, 'Verified, but not enough for this action'),
        obtained: readAssuranceBar(record?.obtained) ?? {},
        required: readAssuranceBar(record?.required) ?? {},
        testId,
        onDismiss: handlers.onDismiss,
      };
    }
    default:
      return {
        kind: 'transport',
        message: 'Verification could not be completed',
        detail: errorMessage(error, 'The verification request failed before it reached the server.'),
        retryable: readRecord(error)?.retryable === true,
        testId,
        onRetry: handlers.onRetry,
        onDismiss: handlers.onDismiss,
      };
  }
};

/**
 * The single projection. A terminal `outcome` always wins over an open prompt;
 * an empty offered factor list is the `no usable factor` outcome; a `busy`
 * ceremony with no code to type is `working`; everything else is the challenge.
 */
export const toDialogState = (input: ToDialogStateInput): UpgradeDialogState => {
  const { prompt, outcome, ui, labels, handlers, testId } = input;

  if (outcome) {
    switch (outcome.kind) {
      case 'elevated':
        return {
          kind: 'success',
          message: 'Verification complete',
          detail: 'Your request is continuing.',
          testId,
          // The happy path must clear itself: §13.4's "reports success and
          // closes". Without this the modal's focus trap covers the app after
          // every elevation.
          onDismiss: handlers.onDismiss,
        };
      case 'insufficient':
        return {
          kind: 'insufficient',
          message: `Verified to ${describeAssuranceBar(outcome.obtained)}; this action requires ${describeAssuranceBar(outcome.required)}`,
          obtained: outcome.obtained,
          required: outcome.required,
          detail: 'The elevation succeeded but the action was challenged again. Nothing was completed.',
          testId,
          onDismiss: handlers.onDismiss,
        };
      case 'cancelled':
        return {
          kind: 'cancelled',
          message: 'Verification cancelled',
          detail: 'The action that needed extra verification was not completed.',
          testId,
          onDismiss: handlers.onDismiss,
        };
      default:
        return terminalFromError(input, outcome.error);
    }
  }

  if (!prompt) {
    return {
      kind: 'working',
      message: 'Preparing verification…',
      testId,
      onCancel: handlers.onCancel,
    };
  }

  const previousKind = prompt.previousError === undefined ? undefined : dialogOutcomeFromError(prompt.previousError);
  if (previousKind !== undefined && previousKind !== 'rejected') {
    return terminalFromError(input, prompt.previousError);
  }

  const factors = toDialogFactors(prompt.factors, labels);
  const required = challengeBar(prompt.challenge);
  const suggested = factors[0];

  if (suggested === undefined) {
    return {
      kind: 'unsatisfiable',
      message: 'No usable verification method',
      detail: `This action requires ${describeAssuranceBar(required)}, and no verification method is available to answer it.`,
      required,
      testId,
      onDismiss: handlers.onDismiss,
    };
  }

  const selected = factors.find((factor) => factor.type === ui?.selected)?.type ?? suggested.type;
  const active = factors.find((factor) => factor.type === selected);
  const busy = ui?.busy === true;

  if (busy && active?.input === 'none') {
    return {
      kind: 'working',
      message: 'Waiting for your passkey…',
      detail: 'Follow the prompt from your device to confirm it is you.',
      testId,
      onCancel: handlers.onCancel,
    };
  }

  return {
    kind: 'challenge',
    factors,
    selected,
    reason: CHALLENGE_REASON,
    busy,
    error: previousKind === 'rejected' ? errorMessage(prompt.previousError, 'That code was not accepted. Try again.') : null,
    showAlternatives: ui?.showAlternatives === true,
    testId,
    onSelectFactor: handlers.onSelectFactor,
    onToggleAlternatives: handlers.onToggleAlternatives,
    onSubmit: handlers.onSubmit,
    onCancel: handlers.onCancel,
  };
};

/**
 * What Escape and an overlay click mean in each state. Cancellation must reach
 * the controller or the caller's promise hangs (§8.1), so this is never a bare
 * close; `success` has nothing to cancel, so it closes instead of cancelling —
 * returning `undefined` there made Escape and the overlay inert on the one
 * state every user reaches.
 */
export const upgradeDialogDismissHandler = (state: UpgradeDialogState): (() => void) | undefined => {
  switch (state.kind) {
    case 'challenge':
      return state.onCancel;
    case 'working':
      return state.onCancel;
    default:
      return state.onDismiss;
  }
};
