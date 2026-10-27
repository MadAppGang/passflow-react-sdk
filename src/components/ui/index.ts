export { CountryFlag, type CountryFlagProps } from './country-flag';
export { Icon } from './icon';
export { Button } from './button';
export * from './fields';
export * from './providers-box';
export { Link } from './link';
export { Spinner, type SpinnerProps, type SpinnerSize } from './spinner';
export { Switch } from './switch';
export * from './popover';
export * from './dialog';
export * from './login-screen';
// Assurance-upgrade dialog (§13). `AssuranceBar`, `UpgradeFactorType` and
// `UpgradeFactorInput` are deliberately NOT re-exported here: the package root
// also re-exports `@passflow/core`, which owns those three names, and two
// `export *` sources for one name resolve to nothing. The dialog's local copies
// are structurally identical; the protocol package is the canonical source.
export {
  UpgradeDialog,
  UpgradeChallengeView,
  UpgradeFactorList,
  UpgradeStatus,
  type UpgradeStatusState,
  DEFAULT_FACTOR_LABELS,
  dialogOutcomeFromError,
  describeAssuranceBar,
  readAssuranceBar,
  UPGRADE_FACTOR_CODE_CONTRACTS,
  toDialogFactors,
  toDialogState,
  upgradeDialogDismissHandler,
  type ToDialogStateInput,
  type UpgradeChallengeSnapshot,
  type UpgradeDialogErrorKind,
  type UpgradeDialogHandlers,
  type UpgradeDialogLabels,
  type UpgradeDialogOutcome,
  type UpgradeDialogUiState,
  type UpgradeFactorSnapshot,
  type UpgradePromptSnapshot,
  type UpgradeDialogCancelledState,
  type UpgradeDialogChallengeState,
  type UpgradeDialogExhaustedState,
  type UpgradeDialogFactor,
  type UpgradeDialogInsufficientState,
  type UpgradeDialogProps,
  type UpgradeDialogState,
  type UpgradeDialogSuccessState,
  type UpgradeDialogTransportState,
  type UpgradeDialogUnavailableState,
  type UpgradeDialogUnsatisfiableState,
  type UpgradeDialogWorkingState,
  type UpgradeFactorCodeContract,
} from './upgrade-dialog';
