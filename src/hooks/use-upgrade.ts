/**
 * `useUpgrade` — the read side of the assurance-upgrade flow (§8.2, §13.3).
 *
 * It **reads `UpgradeContext` and installs nothing**. Installation belongs to
 * `UpgradeProvider` and only to it: two hooks each installing a prompt handler
 * would open two prompts and defeat single-flight.
 *
 * Outside an `UpgradeProvider` it returns `status: 'idle'` with no-op actions
 * rather than throwing (§9.5 H8).
 */

import {
  INERT_UPGRADE_CONTEXT,
  UpgradeContext,
  type UpgradeContextValue,
  type UpgradeElevateOptions,
  type UpgradeErrorStatusKind,
  type UpgradeHookState,
  type UpgradePromptView,
  type UpgradeSettledState,
} from '@/context/upgrade-context';
import type { AssuranceBar, UpgradeChallenge, UpgradeFactor, UpgradeFactorType } from '@passflow/core';
import { useContext, useMemo } from 'react';

export type UseUpgradeResult = {
  /** True when an `UpgradeProvider` installed a prompt handler. */
  enabled: boolean;
  /** The whole state, as the discriminated union (§13.5's `UpgradeHookState`). */
  state: UpgradeHookState;
  /** The discriminant, for the common `status === 'challenged'` read. */
  status: UpgradeHookState['status'];
  /** What the server demanded — the MERGED requirement when challenges joined. */
  challenge: UpgradeChallenge | null;
  /** Usable factors, already ranked; index 0 is the suggested one. */
  factors: readonly UpgradeFactor[];
  /** The ranked factor types, which is what `UpgradeHookState.challenged` carries. */
  factorTypes: readonly UpgradeFactorType[];
  selectedFactor: UpgradeFactorType | null;
  /**
   * Elevated, and still not enough: the replay was re-challenged (§13.4).
   * Non-null **only** in the `insufficient` state, and it never coexists with
   * `status === 'success'` — this must not read as success.
   */
  insufficient: { obtained: AssuranceBar; required: AssuranceBar } | null;
  /** The terminal failure, in the `error` state only. */
  error: Error | null;
  /** Which failure class, in the `error` state only. */
  errorKind: UpgradeErrorStatusKind | null;
  /** The previous attempt's failure while the prompt is re-shown (a wrong code). */
  previousError: Error | null;
  /** True while a ceremony is on the wire. */
  busy: boolean;
  /** The factor-selection signal — §13.2's late-join boundary (T3). */
  selectFactor: (factor: UpgradeFactorType) => void;
  submit: (code?: string) => void;
  cancel: () => void;
  dismiss: () => void;
  /** Resolves `null` on cancellation; otherwise the flight's terminal state. */
  elevate: (options?: UpgradeElevateOptions) => Promise<UpgradeSettledState | null>;
};

const EMPTY_FACTORS: readonly UpgradeFactor[] = [];

const readPromptFactors = (prompt: UpgradePromptView | null): readonly UpgradeFactor[] =>
  prompt === null ? EMPTY_FACTORS : prompt.factors;

export const useUpgrade = (): UseUpgradeResult => {
  const context: UpgradeContextValue = useContext(UpgradeContext) ?? INERT_UPGRADE_CONTEXT;
  const { enabled, state, prompt, selectedFactor, selectFactor, submit, cancel, dismiss, elevate } = context;

  return useMemo<UseUpgradeResult>(() => {
    const factors = readPromptFactors(prompt);

    return {
      enabled,
      state,
      status: state.status,
      challenge: state.status === 'challenged' ? state.challenge : (prompt?.challenge ?? null),
      factors,
      factorTypes: state.status === 'challenged' ? state.factors : factors.map((factor) => factor.type),
      selectedFactor,
      insufficient: state.status === 'insufficient' ? { obtained: state.obtained, required: state.required } : null,
      error: state.status === 'error' ? state.error : null,
      errorKind: state.status === 'error' ? state.kind : null,
      previousError: prompt?.previousError ?? null,
      busy: state.status === 'submitting',
      selectFactor,
      submit,
      cancel,
      dismiss,
      elevate,
    };
  }, [enabled, state, prompt, selectedFactor, selectFactor, submit, cancel, dismiss, elevate]);
};
