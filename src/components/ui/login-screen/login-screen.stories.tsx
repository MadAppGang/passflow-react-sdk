import { type PassflowPasswordPolicySettings, Providers } from '@passflow/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { type FC, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { getTwoFactorEnrollmentScreenProps } from '@/components/flow/two-factor-verify/screen';
import {
  getTwoFactorRecoveryCodesScreen,
  getTwoFactorSetupCodeScreen,
  getTwoFactorSetupStartScreen,
} from '@/components/form/two-factor-setup/setup-screen';
import type { TwoFactorEnrollmentScreen } from '@/hooks/use-two-factor-enrollment';
import {
  approvalAlreadyDecidedMessage,
  approvalApprovedMessage,
  approvalAttemptsMessage,
  approvalConnectionMessage,
  approvalDeniedMessage,
  approvalInvalidMessage,
  approvalUnavailableMessage,
  authErrorFrom,
  deviceErrorOfType,
  passwordlessLinkExpiredMessage,
  passwordlessSignInFailedMessage,
  passwordlessWaitCompletedMessage,
  passwordlessWaitDeniedMessage,
} from '@/utils';
import {
  twoFactorBackToSignInLabel,
  twoFactorRateLimitedMessage,
  twoFactorSendFailedMessage,
  twoFactorSetupCodeChangedMessage,
  twoFactorSetupSavedNewCodeMessage,
  twoFactorSignInOverMessage,
  twoFactorTryAgainMessage,
  twoFactorWrongCodeMessage,
  twoFactorWrongRecoveryCodeMessage,
} from '@/utils/auth-error';
import { LoginScreen } from './login-screen';
import type {
  LoginConsentState,
  LoginCredentialsState,
  LoginEmailCodeState,
  LoginMethodConfig,
  LoginNewPasswordState,
  LoginPasswordlessApprovalFormState,
  LoginPasswordlessWaitingState,
  LoginScreenChrome,
  LoginScreenProps,
  LoginTwoFactorCodeState,
} from './types';

const passwordPolicy: PassflowPasswordPolicySettings = {
  restrict_min_password_length: true,
  min_password_length: 8,
  reject_compromised: true,
  enforce_password_strength: 'average',
  require_lowercase: true,
  require_uppercase: true,
  require_number: true,
  require_symbol: false,
};

const chrome = {
  title: 'Sign In to your account',
  subtitle: 'To Passflow by Madappgang',
  variant: 'sign-in',
};

const handlers = {
  onPassword: fn(),
  onPasswordless: fn(),
  onPasskey: fn(),
  onProvider: fn(),
  onReset: fn(),
  onApprove: fn(),
  onAcceptInvitation: fn(),
  onSwitchAccount: fn(),
  onCreateAccount: fn(),
  onCode: fn(),
  onRetry: fn(),
  onToggleScope: fn(),
  onAllow: fn(),
  onDeny: fn(),
  onEmailCode: fn(),
  onResendCode: fn(),
  onLeaveEmailCode: fn(),
  onNewPassword: fn(),
  onBackToSignIn: fn(),
  onStartAgain: fn(),
  onResendLink: fn(),
  onApproveSignIn: fn(),
  onDenySignIn: fn(),
  onTwoFactorCodeChange: fn(),
  onTwoFactorSubmit: fn(),
  onTrustDevice: fn(),
  onUseRecoveryCode: fn(),
  onUseAuthenticator: fn(),
  onSetupStart: fn(),
  onSetupCode: fn(),
  onCopyRecoveryCodes: fn(),
  onSavedRecoveryCodes: fn(),
  onSendSetupLink: fn(),
};

type MethodOptions = {
  emailPassword?: boolean;
  emailOtp?: boolean;
  emailMagicLink?: boolean;
  usernamePassword?: boolean;
  phonePassword?: boolean;
  phoneOtp?: boolean;
  phoneMagicLink?: boolean;
  passkey?: boolean;
  providers?: Providers[];
};

const methods = ({
  emailPassword = false,
  emailOtp = false,
  emailMagicLink = false,
  usernamePassword = false,
  phonePassword = false,
  phoneOtp = false,
  phoneMagicLink = false,
  passkey = false,
  providers = [],
}: MethodOptions): LoginMethodConfig => {
  const identities: LoginMethodConfig['identities'] = [];
  const hasEmailOrUsername = emailPassword || emailOtp || emailMagicLink || usernamePassword;

  if (hasEmailOrUsername) {
    const label =
      usernamePassword && (emailPassword || emailOtp || emailMagicLink)
        ? 'Email or username'
        : usernamePassword
          ? 'Username'
          : 'Email';
    identities.push({
      id: 'email_or_username',
      label,
      selectLabel: label === 'Username' ? 'Use username' : 'Use email',
      requiredMessage: `${label} is required`,
      format: usernamePassword ? undefined : 'email',
      password: emailPassword || usernamePassword,
      passwordlessLabel: emailOtp ? 'email code' : emailMagicLink ? 'email link' : undefined,
    });
  }

  if (phonePassword || phoneOtp || phoneMagicLink) {
    identities.push({
      id: 'phone',
      label: 'Phone number',
      selectLabel: 'Use phone',
      requiredMessage: 'Phone number is required',
      password: phonePassword,
      passwordlessLabel: phoneOtp ? 'SMS code' : phoneMagicLink ? 'SMS link' : undefined,
    });
  }

  return { identities, passkey, providers };
};

const credentials = (
  methodsConfig: LoginMethodConfig,
  overrides: Partial<LoginCredentialsState> = {},
): LoginCredentialsState => ({
  kind: 'credentials',
  methods: methodsConfig,
  passwordPolicy,
  forgotPassword: { to: '/forgot-password' },
  footer: { prompt: "Don't have an account?", label: 'Sign Up', to: '/signup' },
  onPassword: handlers.onPassword,
  onPasswordless: handlers.onPasswordless,
  onPasskey: handlers.onPasskey,
  onProvider: handlers.onProvider,
  onReset: handlers.onReset,
  ...overrides,
});

const story = (state: LoginScreenProps['state'], storyChrome = chrome): LoginScreenProps => ({
  chrome: storyChrome,
  state,
});

const meta = {
  title: 'Components/LoginScreen',
  component: LoginScreen,
  tags: ['autodocs'],
  parameters: {
    controls: { disable: true },
  },
} satisfies Meta<typeof LoginScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultSignIn: Story = {
  args: story(credentials(methods({ passkey: true, providers: [Providers.google] }))),
};

export const EmailAndPassword: Story = {
  args: story(credentials(methods({ emailPassword: true }))),
};

export const UsernameAndPassword: Story = {
  args: story(credentials(methods({ usernamePassword: true }))),
};

export const EmailOrUsernameAndPassword: Story = {
  args: story(credentials(methods({ emailPassword: true, usernamePassword: true }))),
};

export const PhoneAndPassword: Story = {
  args: story(credentials(methods({ phonePassword: true }))),
};

export const CreateAccount: Story = {
  args: story(
    credentials(methods({ emailPassword: true, emailMagicLink: true, phonePassword: true, phoneOtp: true, passkey: true }), {
      credentialPurpose: 'sign-up',
      primaryLabel: 'Sign Up',
      passwordlessLabelPrefix: 'Sign Up with',
      passkeyLabel: 'Sign Up with a Passkey',
      allowPasskeyToggle: true,
      forgotPassword: undefined,
      footer: { prompt: 'Already have an account?', label: 'Sign In', to: '/signin' },
    }),
    { title: 'Create your account', subtitle: 'For Passflow by Madappgang', variant: 'sign-in' },
  ),
};

export const PhoneSignUp: Story = {
  args: story(
    credentials(methods({ phonePassword: true }), {
      credentialPurpose: 'sign-up',
      primaryLabel: 'Sign Up',
      forgotPassword: undefined,
      footer: { prompt: 'Already have an account?', label: 'Sign In', to: '/signin' },
    }),
    { title: 'Create your account', subtitle: 'For Passflow by Madappgang', variant: 'sign-in' },
  ),
};

export const PhonePasswordless: Story = {
  args: story(credentials(methods({ phoneOtp: true }))),
};

export const EmailOtpOnly: Story = {
  args: story(credentials(methods({ emailOtp: true }))),
};

export const EmailMagicLinkOnly: Story = {
  args: story(credentials(methods({ emailMagicLink: true }))),
};

export const PasswordAndPasswordless: Story = {
  args: story(credentials(methods({ emailPassword: true, emailMagicLink: true }))),
};

export const PasskeyOnly: Story = {
  args: story(credentials(methods({ passkey: true }))),
};

export const MixedMethods: Story = {
  args: story(
    credentials(
      methods({
        emailPassword: true,
        emailMagicLink: true,
        phonePassword: true,
        phoneOtp: true,
        passkey: true,
      }),
      { allowPasskeyToggle: true },
    ),
  ),
};

export const ForcedPasskeyExperience: Story = {
  args: story(
    credentials(methods({ emailPassword: true, emailMagicLink: true, passkey: true }), {
      allowPasskeyToggle: true,
      forcePasskey: true,
    }),
  ),
};

export const OneProvider: Story = {
  args: story(credentials(methods({ providers: [Providers.google] }))),
};

export const TwoProviders: Story = {
  args: story(credentials(methods({ providers: [Providers.google, Providers.facebook] }))),
};

export const CredentialsWithProviders: Story = {
  args: story(credentials(methods({ emailPassword: true, providers: [Providers.google, Providers.facebook] }))),
};

export const Submitting: Story = {
  args: story(
    credentials(methods({ emailPassword: true, emailMagicLink: true, passkey: true }), {
      allowPasskeyToggle: true,
      busy: true,
      primaryLabel: 'Signing in…',
    }),
  ),
};

export const ServerError: Story = {
  args: story(
    credentials(methods({ emailPassword: true }), {
      error: { message: deviceErrorOfType('bad_credentials').message, scope: 'credentials' },
    }),
  ),
};

export const GeneralError: Story = {
  args: story(
    {
      kind: 'general-error',
      message: 'Network Error',
      onAction: handlers.onRetry,
    },
    { title: '' },
  ),
};

export const ValidationError: Story = {
  args: story(credentials(methods({ emailPassword: true }))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const email = canvas.getByLabelText('Email');
    await userEvent.type(email, 'a');
    await userEvent.clear(email);
    await expect(canvas.getByText('Email is required')).toBeVisible();
  },
};

export const DarkTheme: Story = {
  args: story(credentials(methods({ emailPassword: true, emailMagicLink: true, passkey: true }))),
  globals: { theme: 'Dark' },
};

const customLogo =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="28" viewBox="0 0 96 28"%3E%3Crect width="96" height="28" rx="6" fill="%237447eb"/%3E%3Ctext x="48" y="19" text-anchor="middle" font-family="Arial" font-size="12" fill="white"%3EACME%3C/text%3E%3C/svg%3E';

export const CustomBrand: Story = {
  args: story(credentials(methods({ emailPassword: true, passkey: true })), {
    ...chrome,
    subtitle: 'Continue to ACME',
    customLogo,
    customLogoAlt: 'ACME logo',
    customCss: '.passflow-form-title { letter-spacing: 0.04em; text-transform: uppercase; }',
    removeBranding: true,
  }),
  globals: { theme: 'Brand' },
};

export const MobileViewport: Story = {
  args: story(credentials(methods({ emailPassword: true, emailMagicLink: true, passkey: true }))),
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const InvitationSignIn: Story = {
  args: story(credentials(methods({ emailPassword: true, emailMagicLink: true, passkey: true })), {
    title: 'Sign in to join My Workspace.',
    subtitle: "Alex Morgan invited you. After you sign in, you'll continue to the invitation.",
    variant: 'sign-in',
  }),
};

export const InvitationCreateAccount: Story = {
  args: story(
    credentials(methods({ emailPassword: true, emailMagicLink: true, passkey: true }), {
      credentialPurpose: 'sign-up',
      primaryLabel: 'Sign Up',
      passwordlessLabelPrefix: 'Sign Up with',
      passkeyLabel: 'Sign Up with a Passkey',
      allowPasskeyToggle: true,
      forgotPassword: undefined,
      footer: { prompt: 'Already have an account?', label: 'Sign In', to: '/signin' },
    }),
    {
      title: 'Create your account to join My Workspace.',
      subtitle: "Alex Morgan invited you. After you create your account, you'll continue to the invitation.",
      variant: 'sign-in',
    },
  ),
};

const invitationChrome = {
  title: "You've been invited to join My Workspace.",
  subtitle: 'Review the invitation before continuing.',
};
const invitationState = {
  kind: 'invitation' as const,
  identity: 'test+1@test.com',
  inviterName: 'Alex Morgan',
  testId: 'invitation-join',
  acceptTestId: 'invitation-accept',
  onAccept: handlers.onAcceptInvitation,
  onSwitchAccount: handlers.onSwitchAccount,
  onCreateAccount: handlers.onCreateAccount,
};

export const InvitationSignedIn: Story = {
  args: story(invitationState, invitationChrome),
};

export const InvitationAccepting: Story = {
  args: story({ ...invitationState, busy: true }, invitationChrome),
};

export const InvitationError: Story = {
  args: story(
    {
      ...invitationState,
      error: "We couldn't accept this invitation. Try again.",
    },
    invitationChrome,
  ),
};

const deviceMethods = methods({ emailPassword: true, passkey: true });
const deviceNotice = {
  code: 'WDJB-MJHT',
  appName: 'Passflow CLI',
  message: "requested this sign-in. Confirm that the code matches your terminal. If it doesn't, close this page.",
};
const deviceConsentChrome = {
  title: 'Approve sign-in to Passflow CLI',
  subtitle: 'Confirm the code, then sign in to approve this request.',
  variant: 'sign-in' as const,
};
const deviceFullLoginChrome = {
  title: 'Sign in to approve Passflow CLI',
  subtitle: 'Confirm the code, then sign in to continue.',
  variant: 'sign-in' as const,
};
const deviceApprovalChrome = {
  title: 'Approve sign-in to Passflow CLI',
  subtitle: 'Confirm that the code matches your terminal before approving.',
};

export const DeviceCodeEntry: Story = {
  args: story(
    {
      kind: 'code-entry',
      onSubmit: handlers.onCode,
    },
    { title: 'Enter the code', subtitle: 'Type the code shown on your device.' },
  ),
};

export const DeviceCodeEntryBusy: Story = {
  args: story(
    {
      kind: 'code-entry',
      initialCode: 'WDJB-MJHT',
      busy: true,
      onSubmit: handlers.onCode,
    },
    { title: 'Enter the code', subtitle: 'Type the code shown on your device.' },
  ),
};

export const DeviceCodeEntryInvalid: Story = {
  args: story(
    {
      kind: 'code-entry',
      error: deviceErrorOfType('code_invalid').message,
      onSubmit: handlers.onCode,
    },
    { title: 'Enter the code', subtitle: 'Type the code shown on your device.' },
  ),
};

export const DeviceConsent: Story = {
  args: story(
    credentials(deviceMethods, {
      notice: deviceNotice,
      primaryLabel: 'Approve',
      passkeyLabel: 'Approve with a Passkey',
      footer: undefined,
      forgotPassword: undefined,
      onPasswordless: undefined,
      onProvider: undefined,
    }),
    deviceConsentChrome,
  ),
};

export const DeviceConsentWorking: Story = {
  args: story(
    credentials(deviceMethods, {
      notice: deviceNotice,
      primaryLabel: 'Approving…',
      passkeyLabel: 'Approve with a Passkey',
      busy: true,
      footer: undefined,
      forgotPassword: undefined,
      onPasswordless: undefined,
      onProvider: undefined,
    }),
    deviceConsentChrome,
  ),
};

export const DeviceConsentError: Story = {
  args: story(
    credentials(deviceMethods, {
      notice: deviceNotice,
      primaryLabel: 'Approve',
      passkeyLabel: 'Approve with a Passkey',
      error: { message: deviceErrorOfType('bad_credentials').message, scope: 'credentials' },
      footer: undefined,
      forgotPassword: undefined,
      onPasswordless: undefined,
      onProvider: undefined,
    }),
    deviceConsentChrome,
  ),
};

export const DeviceFullLogin: Story = {
  args: story(
    credentials(deviceMethods, {
      notice: deviceNotice,
      footer: undefined,
      forgotPassword: undefined,
      onPasswordless: undefined,
      onProvider: undefined,
    }),
    deviceFullLoginChrome,
  ),
};

export const DeviceFullLoginError: Story = {
  args: story(
    credentials(deviceMethods, {
      notice: deviceNotice,
      error: { message: deviceErrorOfType('bad_credentials').message, scope: 'credentials' },
      footer: undefined,
      forgotPassword: undefined,
      onPasswordless: undefined,
      onProvider: undefined,
    }),
    deviceFullLoginChrome,
  ),
};

export const DeviceFullLoginSignedIn: Story = {
  args: story(
    {
      kind: 'device-approval',
      appName: 'Passflow CLI',
      code: 'WDJB-MJHT',
      identity: 'jack@example.com',
      testId: 'device-full-login-approval',
      actionTestId: 'device-confirm',
      onApprove: handlers.onApprove,
    },
    deviceApprovalChrome,
  ),
};

export const DeviceFullLoginApproving: Story = {
  args: story(
    {
      kind: 'device-approval',
      appName: 'Passflow CLI',
      code: 'WDJB-MJHT',
      identity: 'jack@example.com',
      busy: true,
      testId: 'device-full-login-approval',
      actionTestId: 'device-confirm',
      onApprove: handlers.onApprove,
    },
    deviceApprovalChrome,
  ),
};

const deviceSecondFactorChrome = {
  title: 'Two-Factor Authentication',
  subtitle: 'One more step to approve Passflow CLI.',
};

export const DeviceSecondFactor: Story = {
  args: story(
    {
      kind: 'second-factor',
      methods: ['totp', 'recovery_codes'],
      identity: 'jack@example.com',
      testId: 'device-second-factor',
      onSubmit: handlers.onCode,
    },
    deviceSecondFactorChrome,
  ),
};

export const DeviceSecondFactorChecking: Story = {
  args: story(
    {
      kind: 'second-factor',
      methods: ['totp', 'recovery_codes'],
      identity: 'jack@example.com',
      busy: true,
      testId: 'device-second-factor',
      onSubmit: handlers.onCode,
    },
    deviceSecondFactorChrome,
  ),
};

export const DeviceSecondFactorInvalid: Story = {
  args: story(
    {
      kind: 'second-factor',
      methods: ['totp', 'recovery_codes'],
      identity: 'jack@example.com',
      error: deviceErrorOfType('second_factor_invalid').message,
      testId: 'device-second-factor',
      onSubmit: handlers.onCode,
    },
    deviceSecondFactorChrome,
  ),
};

export const DevicePasskeyWaiting: Story = {
  args: story(
    {
      kind: 'passkey-progress',
      working: true,
      message: 'Waiting for your passkey — follow the prompt on your device.',
    },
    { title: 'Sign in to Passflow CLI', subtitle: 'Confirm with your passkey to finish this device sign-in.' },
  ),
};

export const DevicePasskeyRecoverableError: Story = {
  args: story(
    {
      kind: 'passkey-progress',
      working: false,
      message: "Passkey sign-in couldn't continue.",
      error: deviceErrorOfType('passkey_failed').message,
      recoverable: true,
      onRetry: handlers.onRetry,
    },
    { title: 'Sign in to Passflow CLI', subtitle: 'Confirm with your passkey to finish this device sign-in.' },
  ),
};

export const DevicePasskeyUnsupported: Story = {
  args: story(
    {
      kind: 'passkey-progress',
      working: false,
      message: "Passkey sign-in couldn't continue.",
      error: deviceErrorOfType('passkey_unsupported').message,
      recoverable: false,
    },
    { title: 'Sign in to Passflow CLI', subtitle: 'Confirm with your passkey to finish this device sign-in.' },
  ),
};

export const DeviceModeDisabled: Story = {
  args: story(
    {
      kind: 'status',
      tone: 'disabled',
      message: deviceErrorOfType('mode_disabled').message,
      detail: 'Nothing was approved, and nothing was sent to the device that showed you this code.',
    },
    { title: "Sign-in isn't available this way" },
  ),
};

export const DeviceFailedRecoverable: Story = {
  args: story(
    {
      kind: 'status',
      tone: 'error',
      message: deviceErrorOfType('offline').message,
      recoverable: true,
      onRetry: handlers.onRetry,
    },
    { title: "That didn't work" },
  ),
};

export const DeviceFailedTerminal: Story = {
  args: story(
    {
      kind: 'status',
      tone: 'error',
      message: deviceErrorOfType('code_expired').message,
    },
    { title: "That didn't work" },
  ),
};

export const DeviceApproved: Story = {
  args: story(
    {
      kind: 'status',
      tone: 'success',
      message: 'This device is approved',
      detail: 'You can close this page.',
    },
    { title: "You're signed in to Passflow CLI", subtitle: "Head back to your terminal — it's ready to go." },
  ),
};

const cliChrome = {
  title: 'CLI Authentication',
  subtitle: 'Authenticate your CLI tool',
};

export const CLIAuthLoading: Story = {
  args: story(
    {
      kind: 'passkey-progress',
      working: true,
      message: 'Loading authentication session…',
    },
    cliChrome,
  ),
};

export const CLIAuthPending: Story = {
  args: story(
    {
      kind: 'passkey-progress',
      working: false,
      message: 'Click the button below to authenticate with your passkey.',
      actionLabel: 'Authenticate with Passkey',
      onAction: handlers.onRetry,
    },
    cliChrome,
  ),
};

export const CLIAuthenticating: Story = {
  args: story(
    {
      kind: 'passkey-progress',
      working: true,
      message: 'Authenticating with your passkey…',
    },
    cliChrome,
  ),
};

export const CLIAuthCompleted: Story = {
  args: story(
    {
      kind: 'status',
      tone: 'success',
      message: 'Authentication successful',
      detail: 'You can close this window and return to your terminal.',
    },
    { title: 'Authentication complete', subtitle: cliChrome.subtitle },
  ),
};

export const CLIAuthExpired: Story = {
  args: story(
    {
      kind: 'status',
      tone: 'disabled',
      message: 'Session Expired',
      detail: 'This authentication session has expired. Please start a new one from your terminal.',
    },
    { title: 'Session expired', subtitle: cliChrome.subtitle },
  ),
};

export const CLIAuthFailed: Story = {
  args: story(
    {
      kind: 'status',
      tone: 'error',
      message: 'Authentication was cancelled or not allowed',
    },
    { title: 'Authentication failed', subtitle: cliChrome.subtitle },
  ),
};

const consentChrome = {
  title: 'Allow Acme Notes to access your account?',
  subtitle: 'Choose what this application may use, then allow or deny.',
};

const consentScopes: LoginConsentState['scopes'] = [
  {
    scope: 'openid',
    label: 'Verify your identity',
    description: 'Confirm who you are using your Passflow account.',
    granted: true,
  },
  { scope: 'profile', label: 'View your profile', description: 'Your name and profile picture.', granted: true },
  { scope: 'email', label: 'View your email address', description: 'The email address on your account.', granted: true },
  { scope: 'offline_access', label: 'Stay signed in', granted: true },
];

const consent = (overrides: Partial<LoginConsentState> = {}): LoginConsentState => ({
  kind: 'consent',
  appName: 'Acme Notes',
  scopes: consentScopes,
  testId: 'consent-screen',
  allowTestId: 'consent-allow',
  denyTestId: 'consent-deny',
  appNameTestId: 'consent-app-name',
  onToggleScope: handlers.onToggleScope,
  onAllow: handlers.onAllow,
  onDeny: handlers.onDeny,
  ...overrides,
});

// A 64px brand-coloured square: stands in for an application's own logo without a network request.
const consentLogo =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='14' fill='%232563eb'/%3E%3C/svg%3E";

export const ConsentDefault: Story = {
  args: story(consent(), consentChrome),
};

export const ConsentScopeSwitchedOff: Story = {
  args: story(
    consent({ scopes: consentScopes.map((item) => ({ ...item, granted: item.scope !== 'profile' })) }),
    consentChrome,
  ),
};

export const ConsentNoScopes: Story = {
  args: story(consent({ scopes: [] }), consentChrome),
};

export const ConsentBusy: Story = {
  args: story(consent({ busy: true }), consentChrome),
};

export const ConsentError: Story = {
  args: story(consent({ error: 'Could not submit your decision. Please try again.' }), consentChrome),
};

export const ConsentAppLogo: Story = {
  args: story(consent(), { ...consentChrome, customLogo: consentLogo, customLogoAlt: 'Acme Notes logo' }),
};

// The static stories above fix `granted`; this one owns it, so the switches can actually be driven.
const ConsentPlayground: FC = () => {
  const [granted, setGranted] = useState(() => new Set(consentScopes.map((item) => item.scope)));

  return (
    <LoginScreen
      chrome={consentChrome}
      state={consent({
        scopes: consentScopes.map((item) => ({ ...item, granted: granted.has(item.scope) })),
        onToggleScope: (scope) =>
          setGranted((previous) => {
            const next = new Set(previous);
            if (next.has(scope)) next.delete(scope);
            else next.add(scope);
            return next;
          }),
      })}
    />
  );
};

export const ConsentInteractive: Story = {
  args: story(consent(), consentChrome),
  render: () => <ConsentPlayground />,
};

// The emailed verification code step: sign-up, sign-in and reset-password all show it
// when the server holds the request until the email address is proven.

const emailCodeChrome: LoginScreenChrome = {
  title: 'Check your email',
  subtitle: 'Enter the code to finish creating your account',
};

const emailCodeMessage = 'We sent a code to a***@example.com.';

const emailCode = (overrides: Partial<LoginEmailCodeState> = {}): LoginEmailCodeState => ({
  kind: 'email-code',
  message: emailCodeMessage,
  resend: { cooldownSeconds: 30, restartKey: 'challenge-1', onResend: handlers.onResendCode },
  secondaryAction: { label: 'Use a different email', onClick: handlers.onLeaveEmailCode },
  testId: 'email-code-step',
  onSubmit: handlers.onEmailCode,
  ...overrides,
});

const codeField = (canvasElement: HTMLElement) => within(canvasElement).getByRole('textbox', { name: emailCodeMessage });

/** The code was just sent: Resend counts down; six digits submit by themselves. */
export const EmailCodeEntry: Story = {
  args: story(emailCode(), emailCodeChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Resend code' })).toHaveAttribute('aria-disabled', 'true');
    await expect(canvas.getByRole('button', { name: 'Verify' })).toBeDisabled();
    await userEvent.type(codeField(canvasElement), '123456');
    await expect(handlers.onEmailCode).toHaveBeenCalledWith('123456');
  },
};

/** The cooldown is over: Resend can be pressed, and counts down again after it is. */
export const EmailCodeResendReady: Story = {
  args: story(
    emailCode({ resend: { cooldownSeconds: 0, restartKey: 'challenge-1', onResend: handlers.onResendCode } }),
    emailCodeChrome,
  ),
  play: async ({ canvasElement }) => {
    const resend = within(canvasElement).getByRole('button', { name: 'Resend code' });
    await expect(resend).toHaveAttribute('aria-disabled', 'false');
    await userEvent.click(resend);
    await expect(handlers.onResendCode).toHaveBeenCalledTimes(1);
  },
};

/** A new code is being requested. */
export const EmailCodeResending: Story = {
  args: story(
    emailCode({ resend: { cooldownSeconds: 0, busy: true, restartKey: 'challenge-1', onResend: handlers.onResendCode } }),
    emailCodeChrome,
  ),
};

/** The code is being checked: the code, Resend and the way back are all locked. */
export const EmailCodeVerifying: Story = {
  args: story(emailCode({ busy: true }), emailCodeChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(codeField(canvasElement)).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Verifying…' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Resend code' })).toHaveAttribute('aria-disabled', 'true');
    await expect(canvas.getByRole('button', { name: 'Use a different email' })).toBeDisabled();
  },
};

/** The server rejected the code: its message is shown and the boxes are empty for the next try. */
export const EmailCodeWrongCode: Story = {
  args: story(emailCode({ error: 'The code is not match, please check it and try again.' }), emailCodeChrome),
  play: async ({ canvasElement }) => {
    const field = codeField(canvasElement);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveValue('');
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
      'The code is not match, please check it and try again.',
    );
  },
};

/** Too many codes were asked for: the server's message, and Resend counts down again. */
export const EmailCodeRateLimited: Story = {
  args: story(
    emailCode({ error: 'Too many verification codes were requested. Please wait a few minutes and try again.' }),
    emailCodeChrome,
  ),
};

/** The reset-password step: the code cannot be sent again, so there is no Resend, only the way back. */
export const EmailCodeNoResend: Story = {
  args: story(
    emailCode({
      resend: undefined,
      secondaryAction: { label: 'Back to sign in', onClick: handlers.onBackToSignIn },
    }),
    {
      title: 'Verify your email',
      subtitle: 'Your password was changed. Enter the code to sign in.',
      variant: 'reset-password',
    },
  ),
};

export const EmailCodeDarkTheme: Story = {
  args: story(emailCode(), emailCodeChrome),
  globals: { theme: 'Dark' },
};

/** The server sent a link instead of a code: a neutral notice and the way back, nothing to type. */
export const CheckYourEmail: Story = {
  args: story(
    {
      kind: 'status',
      tone: 'info',
      message: 'We sent a link to a***@example.com. Follow it to choose your password and finish signing up.',
      primaryAction: { label: 'Back to sign up', onClick: handlers.onLeaveEmailCode },
    },
    { title: 'Check your email' },
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('We sent a link to a***@example.com.');
    await expect(canvas.queryByRole('textbox')).toBeNull();
  },
};

const resetChrome: LoginScreenChrome = {
  title: 'Reset password',
  subtitle: 'Let’s get you back in.',
  variant: 'reset-password',
};

const newPassword = (overrides: Partial<LoginNewPasswordState> = {}): LoginNewPasswordState => ({
  kind: 'new-password',
  passwordPolicy,
  testId: 'new-password',
  onSubmit: handlers.onNewPassword,
  ...overrides,
});

/** A new password, checked against the policy as it is typed. */
export const NewPassword: Story = {
  args: story(newPassword(), resetChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('New password'), 'Str0ngPassword');
    await userEvent.click(canvas.getByRole('button', { name: 'Save new password' }));
    await expect(handlers.onNewPassword).toHaveBeenCalledWith('Str0ngPassword');
  },
};

/** The password does not meet the policy yet: the list says what is missing and Save stays locked. */
export const NewPasswordInvalid: Story = {
  args: story(newPassword(), resetChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('New password'), 'short');
    await expect(canvas.getByRole('button', { name: 'Save new password' })).toBeDisabled();
  },
};

/** The server refused the password: its message, next to the field. */
export const NewPasswordError: Story = {
  args: story(newPassword({ error: 'This reset link has expired. Ask for a new one.' }), resetChrome),
};

export const NewPasswordSaving: Story = {
  args: story(newPassword({ busy: true }), resetChrome),
};

/** The link from a sign-up that ran out of codes: choosing the password creates the account. */
export const CreateAccountPassword: Story = {
  args: story(newPassword({ hint: 'Choose a password to finish creating your account.', submitLabel: 'Create account' }), {
    title: 'Create your password',
    subtitle: 'Finish creating your account',
    variant: 'reset-password',
  }),
};

const refusedParent = (id: string) =>
  story(
    credentials(methods({ emailPassword: true }), {
      error: authErrorFrom({ id, message: 'server text' }, 'sign-in', 'password'),
      onStartAgain: handlers.onStartAgain,
    }),
  );

/** The parent challenge this form belongs to has expired: only starting again can help, so the fields stay neutral. */
export const RefusedParentExpired: Story = {
  args: refusedParent('error.auth.flow.parent.expired'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Start again' }));
    await expect(handlers.onStartAgain).toHaveBeenCalled();
  },
};

export const RefusedParentNotFound: Story = {
  args: refusedParent('error.auth.flow.parent.not.found'),
};

export const RefusedParentCompleted: Story = {
  args: refusedParent('error.auth.flow.parent.completed'),
};

/** The alert's other site: a passkey-only form. */
export const RefusedParentPasskeyOnly: Story = {
  args: story(
    credentials(methods({ passkey: true }), {
      error: authErrorFrom({ id: 'error.auth.flow.parent.expired', message: 'server text' }, 'sign-in', 'passkey'),
      onStartAgain: handlers.onStartAgain,
    }),
  ),
};

const waitingChrome = { title: 'Check your email' };

const waiting = (overrides: Partial<LoginPasswordlessWaitingState> = {}): LoginPasswordlessWaitingState => ({
  kind: 'passwordless-waiting',
  matchCode: '4821',
  resend: { restartKey: 'challenge-1', onResend: handlers.onResendLink },
  testId: 'passwordless-waiting',
  codeTestId: 'passwordless-match-code',
  ...overrides,
});

/** The tab that started a sign-in, waiting while the link is approved on any device. */
export const PasswordlessWaiting: Story = {
  args: story(waiting(), waitingChrome),
};

export const PasswordlessWaitingResendReady: Story = {
  args: story(waiting({ resend: { cooldownSeconds: 0, onResend: handlers.onResendLink } }), waitingChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Resend email' }));
    await expect(handlers.onResendLink).toHaveBeenCalled();
  },
};

export const PasswordlessWaitingResendBusy: Story = {
  args: story(waiting({ resend: { busy: true, onResend: handlers.onResendLink } }), waitingChrome),
};

export const PasswordlessWaitingResendFailed: Story = {
  args: story(
    waiting({
      error: "We couldn't send a new link. Try again.",
      resend: { cooldownSeconds: 0, onResend: handlers.onResendLink },
    }),
    waitingChrome,
  ),
};

const waitOutcome = (message: string) =>
  story(
    {
      kind: 'status',
      tone: 'error',
      message,
      primaryAction: { label: 'Start again', onClick: handlers.onStartAgain },
    },
    { title: 'Sign-in not completed' },
  );

export const PasswordlessWaitDenied: Story = {
  args: waitOutcome(passwordlessWaitDeniedMessage),
};

export const PasswordlessWaitExpired: Story = {
  args: waitOutcome(passwordlessLinkExpiredMessage),
};

export const PasswordlessWaitCompleted: Story = {
  args: waitOutcome(passwordlessWaitCompletedMessage),
};

export const PasswordlessWaitFailed: Story = {
  args: waitOutcome(passwordlessSignInFailedMessage),
};

const approvalChrome = { title: 'Approve sign-in' };

const approval = (overrides: Partial<LoginPasswordlessApprovalFormState> = {}): LoginPasswordlessApprovalFormState => ({
  kind: 'passwordless-approval',
  appName: 'Acme Portal',
  browser: 'Chrome',
  os: 'macOS',
  location: 'Lisbon, Portugal',
  requestedAt: '4 Nov 2026, 16:42',
  testId: 'passwordless-approval',
  onApprove: handlers.onApproveSignIn,
  onDeny: handlers.onDenySignIn,
  ...overrides,
});

/** The device that opened the link. Four digits submit nothing: only Approve does. */
export const PasswordlessApproval: Story = {
  args: story(approval(), approvalChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Code shown on your other device'), '4821');
    await expect(handlers.onApproveSignIn).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Approve' }));
    await expect(handlers.onApproveSignIn).toHaveBeenCalledWith('4821');
  },
};

export const PasswordlessApprovalLoading: Story = {
  args: story({ kind: 'passwordless-approval', loading: true }, approvalChrome),
};

export const PasswordlessApprovalNoLocation: Story = {
  args: story(approval({ location: null }), approvalChrome),
};

export const PasswordlessApprovalWrongCode: Story = {
  args: story(approval({ error: 'That code does not match. 3 tries left.' }), approvalChrome),
};

/** The server did not answer: nothing was decided, so the form stays. */
export const PasswordlessApprovalConnectionError: Story = {
  args: story(approval({ error: approvalConnectionMessage }), approvalChrome),
};

export const PasswordlessApprovalBusy: Story = {
  args: story(approval({ busy: true }), approvalChrome),
};

const approvalFinal = (tone: 'success' | 'error', message: string) =>
  story({ kind: 'status', tone, message }, { title: 'Sign-in request' });

export const PasswordlessApprovalApproved: Story = {
  args: approvalFinal('success', approvalApprovedMessage),
};

export const PasswordlessApprovalDenied: Story = {
  args: approvalFinal('success', approvalDeniedMessage),
};

export const PasswordlessApprovalInvalidLink: Story = {
  args: approvalFinal('error', approvalInvalidMessage),
};

export const PasswordlessApprovalUnavailable: Story = {
  args: approvalFinal('error', approvalUnavailableMessage),
};

export const PasswordlessApprovalExpired: Story = {
  args: approvalFinal('error', passwordlessLinkExpiredMessage),
};

export const PasswordlessApprovalAlreadyDecided: Story = {
  args: approvalFinal('error', approvalAlreadyDecidedMessage),
};

export const PasswordlessApprovalTooManyCodes: Story = {
  args: approvalFinal('error', approvalAttemptsMessage),
};

/** The request could not be read at all, for a reason that may pass. */
export const PasswordlessApprovalLoadFailed: Story = {
  args: story(
    {
      kind: 'status',
      tone: 'error',
      message: approvalConnectionMessage,
      recoverable: true,
      onRetry: handlers.onRetry,
    },
    { title: 'Sign-in request' },
  ),
};

// Two-factor sign-in: code entry for both factors, enrolment and the recovery codes. These screens use plain chrome,
// with no app settings, logo or custom CSS. The copy here is what the forms pass; the library has none of its own.
// Setup, recovery codes and status stories are built by the runtime's own screen functions.

const backToSignIn = { label: twoFactorBackToSignInLabel, onClick: handlers.onBackToSignIn };

const totpChrome: LoginScreenChrome = {
  title: 'Two-Factor Authentication',
  subtitle: 'Enter the 6-digit code from your authenticator app',
};

const recoveryChrome: LoginScreenChrome = {
  title: 'Use Recovery Code',
  subtitle: 'Enter one of your recovery codes',
};

const twoFactorCommon = {
  kind: 'two-factor-code',
  trustDevice: { label: 'Trust this device', checked: false, onChange: handlers.onTrustDevice },
  canSubmit: false,
  submitLabel: 'Verify',
  busyLabel: 'Verifying...',
  testId: 'two-factor-code',
  onCodeChange: handlers.onTwoFactorCodeChange,
  onSubmit: handlers.onTwoFactorSubmit,
} as const;

const totpCode = (overrides: Partial<LoginTwoFactorCodeState> = {}): LoginTwoFactorCodeState => ({
  ...twoFactorCommon,
  factor: { type: 'totp', digits: 6 },
  label: 'Verification code',
  code: '',
  alternate: { prompt: 'Lost your device?', label: 'Use recovery code', onClick: handlers.onUseRecoveryCode },
  ...overrides,
});

const recoveryCode = (overrides: Partial<LoginTwoFactorCodeState> = {}): LoginTwoFactorCodeState => ({
  ...twoFactorCommon,
  factor: { type: 'recovery', placeholder: 'XXXX-XXXX' },
  label: 'Recovery Code',
  code: '',
  alternate: { prompt: 'Have your device?', label: 'Use authenticator code', onClick: handlers.onUseAuthenticator },
  ...overrides,
});

const sessionOverAlert = { message: twoFactorSignInOverMessage, tone: 'info' } as const;
const rateLimitedAlert = { message: twoFactorRateLimitedMessage, tone: 'error' } as const;

/** The boxes are empty, so Verify waits for the code. */
export const TwoFactorCodeTotp: Story = {
  args: story(totpCode({ autoFocus: true }), totpChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Verification code' })).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Verify' })).toBeDisabled();
  },
};

/** The boxes follow the server's `totp_digits`. */
export const TwoFactorCodeTotpEightDigits: Story = {
  args: story(totpCode({ factor: { type: 'totp', digits: 8 } }), {
    ...totpChrome,
    subtitle: 'Enter the 8-digit code from your authenticator app',
  }),
};

/** A whole code, with the device trusted. */
export const TwoFactorCodeTotpReady: Story = {
  args: story(
    totpCode({
      code: '123456',
      canSubmit: true,
      trustDevice: { label: 'Trust this device', checked: true, onChange: handlers.onTrustDevice },
    }),
    totpChrome,
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Verify' }));
    await expect(handlers.onTwoFactorSubmit).toHaveBeenCalled();
  },
};

/** The enrolment was saved but the held code went stale: the subtitle says what to do. */
export const TwoFactorCodeTotpSetupSaved: Story = {
  args: story(totpCode(), {
    ...totpChrome,
    subtitle: twoFactorSetupSavedNewCodeMessage,
  }),
};

/** The code is being checked: everything is locked. */
export const TwoFactorCodeTotpBusy: Story = {
  args: story(totpCode({ code: '123456', canSubmit: true, busy: true }), totpChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Verification code' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Verifying...' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Use recovery code' })).toBeDisabled();
  },
};

/** The server rejected the code: stay and try again. */
export const TwoFactorCodeTotpWrongCode: Story = {
  args: story(
    totpCode({
      code: '123456',
      canSubmit: true,
      alert: { message: twoFactorWrongCodeMessage, tone: 'error' },
    }),
    totpChrome,
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Verification code' })).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByRole('alert')).toHaveTextContent(twoFactorWrongCodeMessage);
  },
};

/** No further code can be taken: no Verify, no alternate, only the way out. */
export const TwoFactorCodeTotpLocked: Story = {
  args: story(totpCode({ locked: true, alert: sessionOverAlert, secondaryAction: backToSignIn }), totpChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Verification code' })).toBeDisabled();
    await expect(canvas.queryByRole('button', { name: 'Verify' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Use recovery code' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Back to sign in' })).toBeEnabled();
    await expect(canvas.getByRole('status')).toHaveTextContent(twoFactorSignInOverMessage);
  },
};

/** Locked, with no way out passed: nothing but the message. */
export const TwoFactorCodeTotpLockedNoAction: Story = {
  args: story(totpCode({ locked: true, alert: sessionOverAlert }), totpChrome),
};

export const TwoFactorCodeTotpRateLimited: Story = {
  args: story(totpCode({ locked: true, alert: rateLimitedAlert, secondaryAction: backToSignIn }), totpChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent(twoFactorRateLimitedMessage);
    await expect(canvas.queryByRole('button', { name: 'Verify' })).toBeNull();
  },
};

export const TwoFactorCodeTotpDarkTheme: Story = {
  args: story(totpCode(), totpChrome),
  globals: { theme: 'Dark' },
};

export const TwoFactorCodeRecovery: Story = {
  args: story(recoveryCode(), recoveryChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Recovery Code' })).toHaveAttribute('placeholder', 'XXXX-XXXX');
    await expect(canvas.getByRole('button', { name: 'Verify' })).toBeDisabled();
  },
};

export const TwoFactorCodeRecoveryBusy: Story = {
  args: story(recoveryCode({ code: 'ABCD-EFGH', canSubmit: true, busy: true }), recoveryChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Recovery Code' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Verifying...' })).toBeDisabled();
  },
};

export const TwoFactorCodeRecoveryWrongCode: Story = {
  args: story(
    recoveryCode({ code: 'ABCD-EFGH', canSubmit: true, alert: { message: twoFactorWrongRecoveryCodeMessage, tone: 'error' } }),
    recoveryChrome,
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Recovery Code' })).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByRole('alert')).toHaveTextContent(twoFactorWrongRecoveryCodeMessage);
  },
};

export const TwoFactorCodeRecoveryLocked: Story = {
  args: story(recoveryCode({ locked: true, alert: sessionOverAlert, secondaryAction: backToSignIn }), recoveryChrome),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Recovery Code' })).toBeDisabled();
    await expect(canvas.queryByRole('button', { name: 'Verify' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Use authenticator code' })).toBeNull();
  },
};

export const TwoFactorCodeRecoveryRateLimited: Story = {
  args: story(recoveryCode({ locked: true, alert: rateLimitedAlert, secondaryAction: backToSignIn }), recoveryChrome),
};

export const TwoFactorCodeRecoveryDarkTheme: Story = {
  args: story(recoveryCode(), recoveryChrome),
  globals: { theme: 'Dark' },
};

const TwoFactorCodePlayground: FC = () => {
  const [code, setCode] = useState('');
  const [trusted, setTrusted] = useState(false);

  return (
    <LoginScreen
      chrome={totpChrome}
      state={totpCode({
        code,
        canSubmit: code.length === 6,
        trustDevice: { label: 'Trust this device', checked: trusted, onChange: setTrusted },
        onCodeChange: setCode,
      })}
    />
  );
};

export const TwoFactorCodeInteractive: Story = {
  args: story(totpCode(), totpChrome),
  render: () => <TwoFactorCodePlayground />,
};

const setupStart = (overrides: Partial<Parameters<typeof getTwoFactorSetupStartScreen>[0]> = {}): LoginScreenProps =>
  getTwoFactorSetupStartScreen({ busy: false, secondaryAction: backToSignIn, onStart: handlers.onSetupStart, ...overrides });

/** A QR-shaped sample PNG that encodes nothing, so the image state needs no network. */
const sampleQrCode =
  'iVBORw0KGgoAAAANSUhEUgAAABkAAAAZAQAAAADskrjOAAAAfUlEQVR42mNgZDnAwFArFM/A4PruIgODSyeIqAMSNQZAMYaPQNkFd2QbGCrTzBkY5h1Sa2B4aO7fwFD1nbmBIddIo4FhR8+TBoYrJ7gYGCS9dzAwuDNeAOqQn9bAwPhHHmiymA3Q5EVngMQLpgYGl4OeDQy1KaYMDIwMTxgASlUlaQXOc6AAAAAASUVORK5CYII=';

const sampleSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

type SetupCodeProps = Parameters<typeof getTwoFactorSetupCodeScreen>[0];

const setupCode = ({
  data,
  ...overrides
}: Partial<Omit<SetupCodeProps, 'data'>> & { data?: Partial<SetupCodeProps['data']> } = {}): LoginScreenProps =>
  getTwoFactorSetupCodeScreen({
    data: { secret: sampleSecret, qr_code: sampleQrCode, totp_digits: 6, ...data } as SetupCodeProps['data'],
    busy: false,
    secondaryAction: backToSignIn,
    onSubmit: handlers.onSetupCode,
    ...overrides,
  });

/** Nothing has been asked of the server yet: the tap on Get Started is what spends a request. */
export const TwoFactorSetupStart: Story = {
  args: setupStart(),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Get Started' }));
    await expect(handlers.onSetupStart).toHaveBeenCalled();
  },
};

export const TwoFactorSetupStartBusy: Story = {
  args: setupStart({ busy: true }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: twoFactorBackToSignInLabel })).toBeDisabled();
  },
};

export const TwoFactorSetupStartError: Story = {
  args: setupStart({ error: twoFactorTryAgainMessage }),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(twoFactorTryAgainMessage);
  },
};

/** `TwoFactorSetupForm` given `onCancel`: Cancel, not a way back to sign in. */
export const TwoFactorSetupStartCancel: Story = {
  args: setupStart({ secondaryAction: { label: 'Cancel', onClick: handlers.onBackToSignIn } }),
};

/** QR, the secret behind a toggle, and a code to confirm. A whole code does not submit by itself. */
export const TwoFactorSetupCode: Story = {
  args: setupCode(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('img', { name: '2FA QR Code' })).toBeVisible();
    await expect(canvas.queryByText(sampleSecret)).toBeNull();
    await userEvent.type(canvas.getByRole('textbox'), '123456');
    await expect(handlers.onSetupCode).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: 'Confirm & Enable' })).toBeEnabled();
  },
};

export const TwoFactorSetupCodeSecretShown: Story = {
  args: setupCode(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: "Can't scan? Enter code manually" }));
    await expect(canvas.getByText(sampleSecret)).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Hide manual code' })).toBeVisible();
  },
};

/** The server sent no image: no broken `<img>` and no toggle, the secret is simply there. */
export const TwoFactorSetupCodeEmptyQr: Story = {
  args: setupCode({ data: { qr_code: '' } }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('img', { name: '2FA QR Code' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: "Can't scan? Enter code manually" })).toBeNull();
    await expect(canvas.getByText(sampleSecret)).toBeVisible();
  },
};

export const TwoFactorSetupCodeEightDigits: Story = {
  args: setupCode({ data: { totp_digits: 8 } }),
};

export const TwoFactorSetupCodeBusy: Story = {
  args: setupCode({ busy: true }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox')).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Confirming...' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: twoFactorBackToSignInLabel })).toBeDisabled();
  },
};

export const TwoFactorSetupCodeError: Story = {
  args: setupCode({ error: twoFactorWrongCodeMessage }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByRole('alert')).toHaveTextContent(twoFactorWrongCodeMessage);
  },
};

/** A notice, not a failure: nothing typed is wrong, so the empty field stays valid and there is no red alert. */
export const TwoFactorSetupCodeChanged: Story = {
  args: setupCode({ notice: twoFactorSetupCodeChangedMessage }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent(twoFactorSetupCodeChangedMessage);
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.getByRole('textbox')).not.toHaveAttribute('aria-invalid', 'true');
  },
};

export const TwoFactorSetupCodeDarkTheme: Story = {
  args: setupCode(),
  globals: { theme: 'Dark' },
};

const TwoFactorSetupPlayground: FC = () => {
  const [replaced, setReplaced] = useState(false);

  return (
    <LoginScreen
      {...setupCode({
        data: { secret: replaced ? 'NEWSECRETNEWSECRET' : sampleSecret },
        notice: replaced ? twoFactorSetupCodeChangedMessage : undefined,
        onSubmit: () => setReplaced(true),
      })}
    />
  );
};

/** The server asked for a new setup: a new secret, a notice, and the typed code clears. */
export const TwoFactorSetupCodeReplaced: Story = {
  args: setupCode(),
  render: () => <TwoFactorSetupPlayground />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('textbox'), '123456');
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm & Enable' }));
    await expect(canvas.getByRole('status')).toHaveTextContent(twoFactorSetupCodeChangedMessage);
    await expect(canvas.getByRole('textbox')).toHaveValue('');
  },
};

const recoveryCodes = (overrides: Partial<Parameters<typeof getTwoFactorRecoveryCodesScreen>[0]> = {}): LoginScreenProps => {
  const screen = getTwoFactorRecoveryCodesScreen({
    codes: ['A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6', 'Q7R8-S9T0', 'U1V2-W3X4', 'Y5Z6-A7B8', 'C9D0-E1F2'],
    busy: false,
    onContinue: handlers.onSavedRecoveryCodes,
    ...overrides,
  });
  // The runtime's copy writes to the clipboard, which a story must not do.
  return { ...screen, state: { ...screen.state, onCopy: handlers.onCopyRecoveryCodes } as LoginScreenProps['state'] };
};

export const TwoFactorRecoveryCodes: Story = {
  args: recoveryCodes(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(8);
    await userEvent.click(canvas.getByRole('button', { name: 'Copy to Clipboard' }));
    await expect(handlers.onCopyRecoveryCodes).toHaveBeenCalled();
  },
};

/** The sign-in is finishing: Continue is locked, and the codes can still be copied. */
export const TwoFactorRecoveryCodesBusy: Story = {
  args: recoveryCodes({ busy: true }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Finishing sign-in...' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Copy to Clipboard' })).toBeEnabled();
  },
};

/** Finishing failed: the codes stay, so they are not lost, and Continue can be tried again. */
export const TwoFactorRecoveryCodesError: Story = {
  args: recoveryCodes({ error: twoFactorTryAgainMessage }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent(twoFactorTryAgainMessage);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(8);
    await expect(canvas.getByRole('button', { name: "I've Saved These Codes" })).toBeEnabled();
  },
};

export const TwoFactorRecoveryCodesDarkTheme: Story = {
  args: recoveryCodes(),
  globals: { theme: 'Dark' },
};

/** What the flow draws for an enrolment state. Only `verify` has no screen, and no story asks for it. */
const enrollmentScreen = (screen: TwoFactorEnrollmentScreen) =>
  getTwoFactorEnrollmentScreenProps(
    {
      screen,
      read: handlers.onRetry,
      sendLink: handlers.onSendSetupLink,
      begin: handlers.onSetupStart,
      confirm: handlers.onSetupCode,
      finish: handlers.onSavedRecoveryCodes,
      end: fn(),
      complete: fn(),
    },
    handlers.onBackToSignIn,
  ) as LoginScreenProps;

/** The screen waits on a request: only a progress message. */
export const StatusWorking: Story = {
  args: enrollmentScreen({ kind: 'loading' }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('Checking your sign-in...');
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

/** A way back beside the primary action. This is the email link screen before anything is sent. */
export const StatusWithSecondaryAction: Story = {
  args: enrollmentScreen({ kind: 'email_link', sent: false, sends: 0, busy: false }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: twoFactorBackToSignInLabel }));
    await expect(handlers.onBackToSignIn).toHaveBeenCalled();
  },
};

/** The primary action's request is in flight: both actions are locked. */
export const StatusBusyPrimary: Story = {
  args: enrollmentScreen({ kind: 'email_link', sent: false, sends: 1, busy: true }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Sending...' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: twoFactorBackToSignInLabel })).toBeDisabled();
  },
};

/** The notice stays and the failure shows beside it, with the primary action still there. */
export const StatusWithError: Story = {
  args: enrollmentScreen({ kind: 'email_link', sent: true, sends: 2, busy: false, error: twoFactorSendFailedMessage }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('Check your email');
    await expect(canvas.getByRole('alert')).toHaveTextContent(twoFactorSendFailedMessage);
    await expect(canvas.getByRole('button', { name: 'Send again' })).toBeEnabled();
  },
};

/** The taps are used up: only the way back is left. */
export const StatusSecondaryActionOnly: Story = {
  args: enrollmentScreen({ kind: 'email_link', sent: true, sends: 3, busy: false }),
};

/** A failed read: the retry, and the way back beside it. */
export const StatusRetryWithSecondaryAction: Story = {
  args: enrollmentScreen({ kind: 'read_failed' }),
};

/** A finished sign-in with nowhere to send the user. */
export const StatusSignedIn: Story = {
  args: enrollmentScreen({ kind: 'finished' }),
};
