export { Button } from './button';
export { ContinuingStatus, type ContinuingStatusProps } from './continuing-status';
export { CountryFlag, type CountryFlagProps } from './country-flag';
export * from './dialog';
export * from './fields';
export { Icon } from './icon';
export { Link } from './link';
export * from './login-screen';
export * from './popover';
export * from './providers-box';
export { Spinner, type SpinnerProps, type SpinnerSize } from './spinner';
export { Switch } from './switch';
// Assurance-upgrade dialog (§13). `AssuranceBar`, `UpgradeFactorType` and
// `UpgradeFactorInput` are deliberately NOT re-exported here: the package root
// also re-exports `@passflow/core`, which owns those three names, and two
// `export *` sources for one name resolve to nothing. The dialog's local copies
// are structurally identical; the protocol package is the canonical source.
export {
  DEFAULT_FACTOR_LABELS,
  describeAssuranceBar,
  dialogOutcomeFromError,
  readAssuranceBar,
  type ToDialogStateInput,
  toDialogFactors,
  toDialogState,
  UPGRADE_FACTOR_CODE_CONTRACTS,
  type UpgradeChallengeSnapshot,
  UpgradeChallengeView,
  UpgradeDialog,
  type UpgradeDialogCancelledState,
  type UpgradeDialogChallengeState,
  type UpgradeDialogErrorKind,
  type UpgradeDialogExhaustedState,
  type UpgradeDialogFactor,
  type UpgradeDialogHandlers,
  type UpgradeDialogInsufficientState,
  type UpgradeDialogLabels,
  type UpgradeDialogOutcome,
  type UpgradeDialogProps,
  type UpgradeDialogState,
  type UpgradeDialogSuccessState,
  type UpgradeDialogTransportState,
  type UpgradeDialogUiState,
  type UpgradeDialogUnavailableState,
  type UpgradeDialogUnsatisfiableState,
  type UpgradeDialogWorkingState,
  type UpgradeFactorCodeContract,
  UpgradeFactorList,
  type UpgradeFactorSnapshot,
  type UpgradePromptSnapshot,
  UpgradeStatus,
  type UpgradeStatusState,
  upgradeDialogDismissHandler,
} from './upgrade-dialog';
