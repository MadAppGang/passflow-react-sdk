import type { AuthUiError, DefaultMethod } from '@/types';
import type { PassflowPasswordPolicySettings, Providers } from '@passflow/core';

export type LoginScreenChrome = {
  title: string;
  subtitle?: string;
  variant?: 'sign-in';
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

export type LoginStatusState = {
  kind: 'status';
  tone: 'success' | 'error' | 'disabled';
  message: string;
  detail?: string;
  recoverable?: boolean;
  retryLabel?: string;
  testId?: string;
  onRetry?: () => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
};

export type LoginScreenState =
  | LoginCredentialsState
  | LoginCodeEntryState
  | LoginPasskeyProgressState
  | LoginDeviceApprovalState
  | LoginInvitationState
  | LoginGeneralErrorState
  | LoginStatusState;

export type LoginScreenProps = {
  chrome: LoginScreenChrome;
  state: LoginScreenState;
};
