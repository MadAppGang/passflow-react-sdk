import { deviceErrorOfType } from '@/utils';
import { type PassflowPasswordPolicySettings, Providers } from '@passflow/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { LoginScreen } from './login-screen';
import type { LoginCredentialsState, LoginMethodConfig, LoginScreenProps } from './types';

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
      passwordPurpose: 'sign-up',
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
      passwordPurpose: 'sign-up',
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
      passwordPurpose: 'sign-up',
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
