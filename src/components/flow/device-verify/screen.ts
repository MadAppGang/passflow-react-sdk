import type { LoginMethodConfig, LoginScreenProps } from '@/components/ui';
import type { UseDeviceVerifyProps } from '@/hooks/use-device-verify';
import type { AuthUiError, DeviceError } from '@/types';
import { deviceErrorOfType } from '@/utils';

const getDeviceLoginMethods = (device: UseDeviceVerifyProps): LoginMethodConfig => ({
  identities: device.info?.methods.password
    ? [
        {
          id: 'email_or_username',
          label: 'Email',
          selectLabel: 'Use email',
          requiredMessage: 'Email is required',
          format: 'email',
          password: true,
        },
      ]
    : [],
  passkey: Boolean(device.info?.methods.passkey),
  providers: [],
});

const toCredentialsError = (error: DeviceError | null): AuthUiError | null => {
  if (!error) return null;

  return {
    message: error.message,
    scope: error.type === 'bad_credentials' || error.type === 'missing_credentials' ? 'credentials' : 'form',
  };
};

const deviceNotice = (device: UseDeviceVerifyProps) => {
  if (!device.info) return undefined;

  return {
    code: device.info.user_code,
    appName: device.info.app_name,
    message: "requested this sign-in. Confirm that the code matches your terminal. If it doesn't, close this page.",
    codeTestId: 'device-consent-user-code',
    appNameTestId: 'device-consent-app-name',
  };
};

export const getDeviceLoginScreenProps = (device: UseDeviceVerifyProps): LoginScreenProps | null => {
  if (device.status === 'loading') return null;

  if (device.status === 'code_entry') {
    return {
      chrome: {
        title: 'Enter the code',
        subtitle: 'Type the code shown on your device.',
      },
      state: {
        kind: 'code-entry',
        error: device.error?.message,
        testId: 'device-code-entry',
        onSubmit: device.submitCode,
      },
    };
  }

  if (device.status === 'done') {
    return {
      chrome: {
        title: device.info?.app_name ? `You're signed in to ${device.info.app_name}` : "You're signed in",
        subtitle: "Head back to your terminal — it's ready to go.",
      },
      state: {
        kind: 'status',
        tone: 'success',
        message: 'This device is approved',
        detail: 'You can close this page.',
        testId: device.info?.mode === 'passkey' ? 'device-auto-passkey-done' : 'device-done',
      },
    };
  }

  if (device.status === 'refused') {
    const error = device.error ?? deviceErrorOfType('mode_disabled');
    return {
      chrome: {
        title: "Sign-in isn't available this way",
      },
      state: {
        kind: 'status',
        tone: 'disabled',
        message: error.message,
        detail: 'Nothing was approved, and nothing was sent to the device that showed you this code.',
        testId: 'device-mode-disabled',
      },
    };
  }

  if (device.status === 'failed') {
    const error = device.error ?? deviceErrorOfType('generic');
    return {
      chrome: {
        title: "That didn't work",
      },
      state: {
        kind: 'status',
        tone: 'error',
        message: error.message,
        recoverable: error.isRecoverable,
        testId: 'device-failed',
        onRetry: error.isRecoverable ? () => device.submitCode('') : undefined,
      },
    };
  }

  if (!device.info) return null;

  if (device.info.mode === 'passkey') {
    const working = (device.status === 'ready' || device.status === 'working') && !device.error;
    return {
      chrome: {
        title: `Sign in to ${device.info.app_name}`,
        subtitle: 'Confirm with your passkey to finish this device sign-in.',
      },
      state: {
        kind: 'passkey-progress',
        working,
        message: device.error
          ? "Passkey sign-in couldn't continue."
          : 'Waiting for your passkey — follow the prompt on your device.',
        error: device.error?.message,
        recoverable: device.error?.isRecoverable,
        testId: 'device-auto-passkey',
        onRetry: device.error?.isRecoverable ? () => void device.confirmWithPasskey() : undefined,
      },
    };
  }

  const busy = device.status === 'working';
  const authenticated = device.isAuthenticated || device.status === 'signed_in';
  const methods = getDeviceLoginMethods(device);
  const notice = deviceNotice(device);

  if (device.info.mode === 'full_login') {
    if (authenticated) {
      return {
        chrome: {
          title: `Approve sign-in to ${device.info.app_name}`,
          subtitle: 'Confirm that the code matches your terminal before approving.',
        },
        state: {
          kind: 'device-approval',
          appName: device.info.app_name,
          code: device.info.user_code,
          identity: device.email,
          busy,
          error: device.error?.message,
          testId: 'device-full-login-approval',
          actionTestId: 'device-confirm',
          codeTestId: 'device-consent-user-code',
          appNameTestId: 'device-consent-app-name',
          onApprove: () => void device.approve(),
        },
      };
    }

    return {
      chrome: {
        title: `Sign in to approve ${device.info.app_name}`,
        subtitle: 'Confirm the code, then sign in to continue.',
        variant: 'sign-in',
      },
      state: {
        kind: 'credentials',
        methods,
        passwordPolicy: null,
        notice,
        busy,
        error: toCredentialsError(device.error),
        primaryLabel: busy ? 'Signing in…' : 'Sign In',
        passkeyLabel: 'Sign In with a Passkey',
        testId: 'device-full-login',
        onPassword: (values) => void device.signInWithPassword(values.emailOrUsername, values.password),
        onPasskey: () => void device.signInWithPasskey(),
      },
    };
  }

  return {
    chrome: {
      title: `Approve sign-in to ${device.info.app_name}`,
      subtitle: 'Confirm the code, then sign in to approve this request.',
      variant: 'sign-in',
    },
    state: {
      kind: 'credentials',
      methods,
      passwordPolicy: null,
      notice,
      busy,
      error: toCredentialsError(device.error),
      primaryLabel: busy ? 'Approving…' : 'Approve',
      primaryTestId: 'device-confirm',
      passkeyLabel: 'Approve with a Passkey',
      testId: 'device-consent',
      onPassword: (values) => void device.confirmWithPassword(values.emailOrUsername, values.password),
      onPasskey: () => void device.confirmWithPasskey(),
    },
  };
};
