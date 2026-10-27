/**
 * Presentational contract for the assurance-upgrade dialog.
 *
 * The dialog is a pure projection: it takes a discriminated state and emits
 * callbacks. Every transition belongs to the controller (architecture §13.2),
 * so nothing here is a state machine — it is the rendering union.
 *
 * `UpgradeFactorType` is declared locally on purpose: P4a must build and run
 * with no `@passflow/core` runtime import, and the union is the only type the
 * dialog needs from the protocol. A later phase re-points it at the package.
 */

/** Factor types the upgrade protocol understands, named as `upgrade.type` on the wire. */
export type UpgradeFactorType = 'totp' | 'recovery_codes' | 'passkey' | 'email_otp' | 'sms_otp';

/** What the UI must collect before the factor can be asserted. */
export type UpgradeFactorInput = 'code' | 'none';

/**
 * An assurance requirement or achievement, carrying both axes (§13.4).
 * `level` is the parsed bar, `acrValues` the raw winning list, `maxAge` the
 * freshness constraint when freshness is what was demanded.
 */
export type AssuranceBar = {
  acrValues?: string;
  level?: number;
  maxAge?: number;
};

/**
 * What a factor's typed answer actually accepts — the factor's own contract,
 * not the dialog's guess.
 *
 * It exists because the field used to cap input at a TOTP-shaped six
 * characters for every factor, which silently truncated a recovery code: the
 * server issues those from `services/totp/recovery.go` at
 * `DefaultRecoveryCodeLength` (12) and validates a configured length anywhere
 * in 6..16 (`model/two_factor.go`), from an alphanumeric charset. A six-digit
 * numeric keypad is wrong for that answer on every axis — length, charset and
 * autofill — so all three travel together with the factor instead of being
 * restated at the input.
 */
export type UpgradeFactorCodeContract = {
  /** The longest answer the server can accept for this factor. */
  maxLength: number;
  /** A numeric OTP gets the numeric keypad; a recovery code is alphanumeric. */
  inputMode: 'numeric' | 'text';
  /** Only a genuine one-time code claims the OTP autofill contract. */
  autoComplete: 'one-time-code' | 'off';
  /** Recovery codes are issued upper-case; an OTP must not be re-cased. */
  autoCapitalize: 'off' | 'characters';
};

type UpgradeDialogFactorBase = {
  type: UpgradeFactorType;
  /** 'Authenticator app' */
  label: string;
  /** 'Enter the code from your authenticator app' */
  hint?: string;
};

/**
 * A factor as the dialog renders it. The `input` discriminant carries the code
 * contract rather than leaving it optional: a `'code'` factor with no contract
 * is unrepresentable, so the truncation defect cannot return by omission.
 */
export type UpgradeDialogFactor =
  | (UpgradeDialogFactorBase & { input: 'none' })
  | (UpgradeDialogFactorBase & { input: 'code'; code: UpgradeFactorCodeContract });

export type UpgradeDialogChallengeState = {
  kind: 'challenge';
  /** Already ranked; index 0 is the suggested factor. */
  factors: readonly UpgradeDialogFactor[];
  selected: UpgradeFactorType;
  reason?: string;
  busy?: boolean;
  error?: string | null;
  showAlternatives?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  alternativesLabel?: string;
  testId?: string;
  /**
   * Reports the user's factor choice. Called the moment a factor is picked and
   * always before `onSubmit`, which is the late-join boundary of §13.2 (T3).
   */
  onSelectFactor: (factor: UpgradeFactorType) => void;
  onToggleAlternatives: () => void;
  onSubmit: (code?: string) => void;
  onCancel: () => void;
};

export type UpgradeDialogWorkingState = {
  kind: 'working';
  message: string;
  detail?: string;
  testId?: string;
  onCancel?: () => void;
};

/**
 * Every waiter replayed cleanly and no stated bar went unmet (§13.4).
 *
 * Success is the happy path, so it is the one state that must never be able to
 * trap the user: §13.4's story table says the modal "reports success and
 * closes". `onDismiss` is therefore required, not optional — it is what Escape,
 * an overlay click, the Done control and the auto-close timer all call.
 * `autoCloseMs` is the timer's dwell; `0` disables it and leaves the explicit
 * control as the only path out.
 */
export type UpgradeDialogSuccessState = {
  kind: 'success';
  message: string;
  detail?: string;
  dismissLabel?: string;
  /** Milliseconds before the dialog closes itself. Omitted: the component's default. */
  autoCloseMs?: number;
  testId?: string;
  onDismiss: () => void;
};

/**
 * Elevated, and still not enough: the replay was re-challenged (§13.3, §13.4).
 * This state must never read as success — it is the honest
 * "elevated to AAL2; this action requires AAL3" message.
 */
export type UpgradeDialogInsufficientState = {
  kind: 'insufficient';
  message: string;
  obtained: AssuranceBar;
  required: AssuranceBar;
  detail?: string;
  dismissLabel?: string;
  testId?: string;
  onDismiss: () => void;
};

/** The offered factor list is empty — `no usable factor` of §13.3's table. */
export type UpgradeDialogUnsatisfiableState = {
  kind: 'unsatisfiable';
  message: string;
  /** The diagnostic line: what was demanded, and why nothing could answer it. */
  detail?: string;
  required?: AssuranceBar;
  dismissLabel?: string;
  testId?: string;
  onDismiss: () => void;
};

/** 501 / BFF — the deployment cannot elevate at all. */
export type UpgradeDialogUnavailableState = {
  kind: 'unavailable';
  message: string;
  detail?: string;
  dismissLabel?: string;
  testId?: string;
  onDismiss: () => void;
};

/** The attempt budget ran out. */
export type UpgradeDialogExhaustedState = {
  kind: 'exhausted';
  message: string;
  detail?: string;
  dismissLabel?: string;
  testId?: string;
  onDismiss: () => void;
};

/** A transport failure — FR1's non-retryable 400, or a retryable network fault. */
export type UpgradeDialogTransportState = {
  kind: 'transport';
  message: string;
  detail?: string;
  retryable?: boolean;
  retryLabel?: string;
  dismissLabel?: string;
  testId?: string;
  onRetry?: () => void;
  onDismiss: () => void;
};

/** The user dismissed the dialog, or a passkey ceremony was cancelled. */
export type UpgradeDialogCancelledState = {
  kind: 'cancelled';
  message: string;
  detail?: string;
  dismissLabel?: string;
  testId?: string;
  onDismiss: () => void;
};

export type UpgradeDialogState =
  | UpgradeDialogChallengeState
  | UpgradeDialogWorkingState
  | UpgradeDialogSuccessState
  | UpgradeDialogInsufficientState
  | UpgradeDialogUnsatisfiableState
  | UpgradeDialogUnavailableState
  | UpgradeDialogExhaustedState
  | UpgradeDialogTransportState
  | UpgradeDialogCancelledState;

export type UpgradeDialogProps = {
  open: boolean;
  title?: string;
  state: UpgradeDialogState;
};
