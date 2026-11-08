import type { PassflowPasswordPolicySettings, Providers } from '@passflow/core';
import type { AuthUiError, DefaultMethod } from '@/types';

export type LoginScreenChrome = {
  title: string;
  subtitle?: string;
  /**
   * `sign-in` and `reset-password` keep the wrapper class (`passflow-signin-wrapper`,
   * `passflow-reset-password-wrapper`) that an app's custom CSS may target.
   */
  variant?: 'sign-in' | 'reset-password';
  customCss?: string;
  customLogo?: string;
  customLogoAlt?: string;
  removeBranding?: boolean;
};

export type LoginCredentialsValues = {
  method: DefaultMethod | null;
  emailOrUsername: string;
  phone: string;
  password: string;
};

export type LoginScreenLink = {
  prompt: string;
  label: string;
  to: string;
  search?: string;
};

export type LoginScreenNotice = {
  code?: string;
  appName: string;
  message: string;
  codeTestId?: string;
  appNameTestId?: string;
};

export type LoginIdentityMethod = {
  id: DefaultMethod;
  label: string;
  selectLabel: string;
  requiredMessage: string;
  format?: 'email';
  password: boolean;
  passwordlessLabel?: string;
};

export type LoginMethodConfig = {
  identities: LoginIdentityMethod[];
  passkey: boolean;
  providers: Providers[];
};

export type LoginCredentialsState = {
  kind: 'credentials';
  methods: LoginMethodConfig;
  passwordPolicy: PassflowPasswordPolicySettings | null;
  credentialPurpose?: 'sign-in' | 'sign-up';
  initialMethod?: DefaultMethod | null;
  forcePasskey?: boolean;
  allowPasskeyToggle?: boolean;
  disabled?: boolean;
  busy?: boolean;
  error?: AuthUiError | null;
  primaryLabel?: string;
  passwordlessLabelPrefix?: string;
  passkeyLabel?: string;
  testId?: string;
  primaryTestId?: string;
  notice?: LoginScreenNotice;
  forgotPassword?: {
    to: string;
    getSearch?: (method: DefaultMethod | null) => string;
  };
  footer?: LoginScreenLink;
  onPassword?: (values: LoginCredentialsValues) => void;
  onPasswordless?: (values: LoginCredentialsValues) => void;
  onPasskey?: () => void;
  onProvider?: (provider: Providers) => void;
  onReset?: () => void;
  /** Shown beside the alert when `error.startAgain` is set: the request behind this form is gone. */
  onStartAgain?: () => void;
};

export type LoginCodeEntryState = {
  kind: 'code-entry';
  label?: string;
  initialCode?: string;
  error?: string | null;
  busy?: boolean;
  submitLabel?: string;
  testId?: string;
  onSubmit: (code: string) => void;
};

/** The resend control of the emailed-code step. Omitted when the code cannot be sent again. */
export type LoginEmailCodeResend = {
  /** Seconds the control waits before it can be pressed. Default 30; restarts on every press and on `restartKey` change. */
  cooldownSeconds?: number;
  /** Changes when a new code was sent (pass the challenge id): restarts the cooldown and clears the typed code. */
  restartKey?: string;
  /** A resend is in flight. */
  busy?: boolean;
  /** Default `Resend code`. */
  label?: string;
  onResend: () => void;
};

/** The way back out of the step, such as `Use a different email` or `Back to sign in`. */
export type LoginScreenAction = {
  label: string;
  onClick: () => void;
};

/**
 * The emailed verification code step: the server's prompt, a row of code boxes,
 * Verify, Resend and a way back.
 */
export type LoginEmailCodeState = {
  kind: 'email-code';
  /** The server's prompt, such as "We sent a code to a***@example.com."; it also names the code field. */
  message: string;
  /** Digits in the code. Default 6. */
  length?: number;
  /** The server's answer to a failed verify or resend; clears the typed code. */
  error?: string | null;
  /** A verify is in flight: the code, Resend and the way back are locked. */
  busy?: boolean;
  /** Default `Verify`. */
  submitLabel?: string;
  resend?: LoginEmailCodeResend;
  secondaryAction?: LoginScreenAction;
  testId?: string;
  onSubmit: (code: string) => void;
};

/** Choosing a new password: for a reset, or to finish an account started by email. */
export type LoginNewPasswordState = {
  kind: 'new-password';
  passwordPolicy: PassflowPasswordPolicySettings | null;
  /** Default `New password`. */
  label?: string;
  /** Default `Enter your new password below.` */
  hint?: string;
  error?: string | null;
  /** The password is being saved: the field and the button are locked. */
  busy?: boolean;
  /** Default `Save new password`. */
  submitLabel?: string;
  testId?: string;
  onSubmit: (password: string) => void;
};

export type LoginPasskeyProgressState = {
  kind: 'passkey-progress';
  working: boolean;
  message: string;
  actionLabel?: string;
  error?: string | null;
  recoverable?: boolean;
  retryLabel?: string;
  testId?: string;
  onAction?: () => void;
  onRetry?: () => void;
};

export type LoginDeviceApprovalState = {
  kind: 'device-approval';
  appName: string;
  code?: string;
  identity?: string | null;
  busy?: boolean;
  error?: string | null;
  actionLabel?: string;
  busyLabel?: string;
  testId?: string;
  actionTestId?: string;
  codeTestId?: string;
  appNameTestId?: string;
  onApprove: () => void;
};

/** A second factor the screen can take, named as the server names it. */
export type LoginSecondFactorMethod = 'totp' | 'recovery_codes';

export type LoginSecondFactorState = {
  kind: 'second-factor';
  /** The factors on offer; the first is shown first. */
  methods: LoginSecondFactorMethod[];
  identity?: string | null;
  busy?: boolean;
  error?: string | null;
  submitLabel?: string;
  testId?: string;
  onSubmit: (method: LoginSecondFactorMethod, code: string) => void;
  /** Called when the user switches factor, so a stale error can be cleared. */
  onMethodChange?: () => void;
};

/** Which factor `two-factor-code` asks for: authenticator boxes, or a recovery code field. */
export type LoginTwoFactorCodeFactor = { type: 'totp'; digits: number } | { type: 'recovery'; placeholder?: string };

/** The line under the code. `error` marks the code invalid; `info` does not. */
export type LoginTwoFactorCodeAlert = {
  message: string;
  tone: 'error' | 'info';
};

/** The "trust this device" option. */
export type LoginTwoFactorTrustDevice = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** The other factor: `prompt` is a sentence, `label` the link that follows it. */
export type LoginTwoFactorCodeAlternate = {
  prompt: string;
  label: string;
  onClick: () => void;
};

/** Code entry at sign-in, for the verify and recovery forms. The code is controlled and all copy comes through props. */
export type LoginTwoFactorCodeState = {
  kind: 'two-factor-code';
  factor: LoginTwoFactorCodeFactor;
  /** Names the code field. */
  label: string;
  code: string;
  trustDevice: LoginTwoFactorTrustDevice;
  /** A check is in flight: the code, the switch and every action are locked, and Verify shows `busyLabel`. */
  busy?: boolean;
  canSubmit: boolean;
  /** No further code can be taken: the code and the switch are disabled, and Verify and `alternate` are gone. */
  locked?: boolean;
  alert?: LoginTwoFactorCodeAlert;
  submitLabel: string;
  busyLabel: string;
  alternate?: LoginTwoFactorCodeAlternate;
  /** The way out. It stays when `locked`. */
  secondaryAction?: LoginScreenAction;
  autoFocus?: boolean;
  testId?: string;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
};

/** Enrolment before anything was requested from the server. */
export type LoginTwoFactorSetupStartState = {
  kind: 'two-factor-setup';
  step: 'start';
  startLabel: string;
  busyLabel: string;
  busy?: boolean;
  error?: string | null;
  secondaryAction?: LoginScreenAction;
  testId?: string;
  onStart: () => void;
};

/** Enrolment with a secret: scan it or type it, then confirm a code. A new `secret` clears the typed code. */
export type LoginTwoFactorSetupCodeState = {
  kind: 'two-factor-setup';
  step: 'code';
  /** Bare base64 PNG. When empty, no image shows and the secret is always visible. */
  qrCode: string;
  qrAlt: string;
  secret: string;
  /** Introduces the secret wherever it is visible. */
  secretLabel: string;
  showSecretLabel: string;
  hideSecretLabel: string;
  /** Digits in the code, from the server's `totp_digits`. */
  digits: number;
  /** Names the code field. */
  codeLabel: string;
  submitLabel: string;
  busyLabel: string;
  busy?: boolean;
  alert?: LoginTwoFactorCodeAlert;
  secondaryAction?: LoginScreenAction;
  testId?: string;
  onSubmit: (code: string) => void;
};

export type LoginTwoFactorSetupState = LoginTwoFactorSetupStartState | LoginTwoFactorSetupCodeState;

/** The recovery codes, shown once after enrolment. */
export type LoginTwoFactorRecoveryCodesState = {
  kind: 'two-factor-recovery-codes';
  /** That the codes will not be shown again. */
  warning: string;
  codes: string[];
  copyLabel: string;
  continueLabel: string;
  busyLabel: string;
  /** `onContinue` is in flight: Continue is locked, the codes can still be copied. */
  busy?: boolean;
  error?: string | null;
  testId?: string;
  onCopy: () => void;
  onContinue: () => void;
};

export type LoginInvitationState = {
  kind: 'invitation';
  identity?: string | null;
  inviterName?: string | null;
  busy?: boolean;
  error?: string | null;
  acceptLabel?: string;
  busyLabel?: string;
  switchAccountLabel?: string;
  createAccountLabel?: string;
  testId?: string;
  acceptTestId?: string;
  onAccept: () => void;
  onSwitchAccount: () => void;
  onCreateAccount: () => void;
};

export type LoginGeneralErrorState = {
  kind: 'general-error';
  message?: string;
  detail?: string;
  actionLabel?: string;
  testId?: string;
  onAction: () => void;
};

export type LoginConsentScope = {
  scope: string;
  label: string;
  description?: string;
  granted: boolean;
};

export type LoginConsentState = {
  kind: 'consent';
  appName: string;
  scopes: LoginConsentScope[];
  prompt?: string;
  busy?: boolean;
  error?: string | null;
  allowLabel?: string;
  denyLabel?: string;
  busyLabel?: string;
  testId?: string;
  allowTestId?: string;
  denyTestId?: string;
  appNameTestId?: string;
  onToggleScope: (scope: string) => void;
  onAllow: () => void;
  onDeny: () => void;
};

export type LoginStatusState = {
  kind: 'status';
  /**
   * `info` is a neutral notice, such as "check your email"; it keeps the normal logo. `working` is a progress message,
   * for a request the screen waits on.
   */
  tone: 'success' | 'error' | 'disabled' | 'info' | 'working';
  message: string;
  detail?: string;
  /** A failure beside the message, under any tone, such as a send that failed on an `info` notice. */
  error?: string | null;
  recoverable?: boolean;
  retryLabel?: string;
  testId?: string;
  onRetry?: () => void;
  primaryAction?: LoginScreenAction & {
    /** Its request is in flight: the action and `secondaryAction` are locked. Pass the in-flight wording as `label`. */
    busy?: boolean;
  };
  /** The way back out, such as `Back to sign in`. It shows beside `primaryAction`, the retry, or alone. */
  secondaryAction?: LoginScreenAction;
};

/**
 * The tab that started a cross-device sign-in, waiting while the link is approved. The outcome messages use `status`,
 * with a primary action labelled `Start again`.
 */
export type LoginPasswordlessWaitingState = {
  kind: 'passwordless-waiting';
  /** The answer to a failed resend. */
  error?: string | null;
  /** The label defaults to `Resend email`. */
  resend?: LoginEmailCodeResend;
  testId?: string;
};

/**
 * The device that opened the link, approving or denying the sign-in. It shows no identity, and the final messages use
 * `status`.
 */
export type LoginPasswordlessApprovalFormState = {
  kind: 'passwordless-approval';
  loading?: false;
  appName: string;
  browser: string;
  os: string;
  /** Omitted from the screen when null. */
  location: string | null;
  /** Ready to display. */
  requestedAt: string;
  /** Why the last answer failed. */
  error?: string | null;
  /** An answer is in flight: both actions are locked. */
  busy?: boolean;
  testId?: string;
  onApprove: () => void;
  onDeny: () => void;
};

/** The sign-in request is still being read: only a progress message shows. */
export type LoginPasswordlessApprovalLoadingState = {
  kind: 'passwordless-approval';
  loading: true;
};

export type LoginPasswordlessApprovalState = LoginPasswordlessApprovalFormState | LoginPasswordlessApprovalLoadingState;

export type LoginScreenState =
  | LoginCredentialsState
  | LoginCodeEntryState
  | LoginEmailCodeState
  | LoginPasswordlessWaitingState
  | LoginPasswordlessApprovalState
  | LoginNewPasswordState
  | LoginPasskeyProgressState
  | LoginDeviceApprovalState
  | LoginSecondFactorState
  | LoginTwoFactorCodeState
  | LoginTwoFactorSetupState
  | LoginTwoFactorRecoveryCodesState
  | LoginInvitationState
  | LoginGeneralErrorState
  | LoginConsentState
  | LoginStatusState;

export type LoginScreenProps = {
  chrome: LoginScreenChrome;
  state: LoginScreenState;
};
