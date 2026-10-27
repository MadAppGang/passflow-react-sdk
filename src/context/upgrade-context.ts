/**
 * The assurance-upgrade context — the one channel between `UpgradeProvider`
 * and `useUpgrade` (architecture §8.2, §13.3).
 *
 * The provider owns the controller, the prompt handler and every transition;
 * this module owns only the shape they are read through. Two hooks each
 * installing a prompt handler would produce two prompts and defeat
 * single-flight, so nothing here installs anything.
 *
 * `status` is §13.5's `UpgradeHookState`, which is §13.3's settlement table
 * read down the hook column. Two consequences the types enforce:
 *
 * - **`insufficient` is a first-class state, not an error and not a success.**
 *   "Elevated to AAL2; this action requires AAL3" is the normal path for an
 *   AAL3 endpoint and a TOTP-only user, and a design cannot both claim the
 *   server is the authority and delete the path by which its second refusal
 *   reaches the user.
 * - **Cancellation is not a status.** It is `elevate()` resolving `null`. The
 *   hook is the one surface where that is right, because there the
 *   cancellation IS the whole value: the consumer is rendering a decision, not
 *   handling a transport outcome.
 */

import type { AssuranceBar, UpgradeChallenge, UpgradeFactor, UpgradeFactorType } from '@passflow/core';
import { createContext } from 'react';

/** What a protected elevation can fail with, in the hook's vocabulary (§13.3's table). */
export type UpgradeErrorStatusKind = 'exhausted' | 'unsatisfiable' | 'unavailable' | 'transport';

/**
 * The hook's observable state. Exactly one terminal state per flight, taken
 * from the controller's outcome summary (§13.4).
 *
 * `idle` is also where a flight abandoned by a session change lands: nothing
 * happened, and nothing is reported as though it had.
 */
export type UpgradeHookState =
  | { status: 'idle' }
  | { status: 'challenged'; challenge: UpgradeChallenge; factors: UpgradeFactorType[] }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'insufficient'; obtained: AssuranceBar; required: AssuranceBar }
  | { status: 'error'; kind: UpgradeErrorStatusKind; error: Error };

/** The states a flight can settle in. `null` alongside these is cancellation. */
export type UpgradeSettledState = Extract<UpgradeHookState, { status: 'idle' | 'success' | 'insufficient' | 'error' }>;

/** A bar a caller states for itself on the imperative seam (§13.2 T10 / H-6). */
export type UpgradeElevateOptions = {
  acrValues?: string;
  maxAge?: number;
};

/** The open prompt, as the dialog and the hook read it. */
export type UpgradePromptView = {
  challenge: UpgradeChallenge;
  /** Already ranked by `selectFactors`; index 0 is the suggested factor. */
  factors: readonly UpgradeFactor[];
  /** The previous attempt's failure, when the controller re-prompted. */
  previousError?: Error;
};

export type UpgradeContextValue = {
  /** True when the provider installed a prompt handler on this `Passflow` instance. */
  enabled: boolean;
  state: UpgradeHookState;
  /** The open prompt, or `null` when no elevation is collecting an answer. */
  prompt: UpgradePromptView | null;
  selectedFactor: UpgradeFactorType | null;
  /**
   * The factor-selection signal. Reports the user's choice to the controller
   * through `UpgradePromptRequest.onFactorSelected` the moment it is made and
   * before any answer is submitted — §13.2's late-join boundary (T3), which is
   * selection and not submission.
   */
  selectFactor: (factor: UpgradeFactorType) => void;
  /** Answers the open prompt. Resolves the controller's promise exactly once. */
  submit: (code?: string) => void;
  /** Declines the open prompt. Exactly once; never leaves the promise pending. */
  cancel: () => void;
  /** Acknowledges a terminal state, closing the dialog. Settles nothing. */
  dismiss: () => void;
  /**
   * Drives an elevation directly — a "verify now" button, or a headless
   * caller. Resolves **`null`** when the user cancelled, and otherwise the
   * flight's terminal state; it never rejects, because the hook's contract is
   * a rendered decision rather than a thrown transport outcome.
   */
  elevate: (options?: UpgradeElevateOptions) => Promise<UpgradeSettledState | null>;
};

export const UpgradeContext = createContext<UpgradeContextValue | undefined>(undefined);

const noop = (): void => undefined;

/**
 * What `useUpgrade` reads outside an `UpgradeProvider`: idle, inert, and it
 * does not throw (§9.5 H8) — a component that merely wants to know whether an
 * elevation is running is not a bug.
 *
 * `elevate` resolves `{ status: 'idle' }` rather than `null`: nothing was
 * asked and nothing was declined, and `null` means the user declined.
 */
export const INERT_UPGRADE_CONTEXT: UpgradeContextValue = {
  enabled: false,
  state: { status: 'idle' },
  prompt: null,
  selectedFactor: null,
  selectFactor: noop,
  submit: noop,
  cancel: noop,
  dismiss: noop,
  elevate: () => Promise.resolve({ status: 'idle' }),
};
