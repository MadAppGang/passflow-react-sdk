import type { LoginScreenProps } from '@/components/ui';
import type { UseCLIAuthProps } from '@/hooks/use-cli-auth';

export type CLIAuthSurface = 'browser' | 'qr';

const copy = {
  browser: {
    subtitle: 'Authenticate your CLI tool',
    prompt: 'Click the button below to authenticate with your passkey.',
    complete: 'You can close this window and return to your terminal.',
  },
  qr: {
    subtitle: 'Authenticate for your CLI application',
    prompt: 'Tap the button below to authenticate with your passkey.',
    complete: 'You can close this app and return to your terminal.',
  },
} satisfies Record<CLIAuthSurface, { subtitle: string; prompt: string; complete: string }>;

export const getCLILoginScreenProps = (cli: UseCLIAuthProps, surface: CLIAuthSurface): LoginScreenProps => {
  const surfaceCopy = copy[surface];
  const chrome = {
    title: 'CLI Authentication',
    subtitle: surfaceCopy.subtitle,
  };

  switch (cli.state) {
    case 'loading':
      return {
        chrome,
        state: {
          kind: 'passkey-progress',
          working: true,
          message: 'Loading authentication session…',
          testId: 'cli-auth-loading',
        },
      };
    case 'pending':
      return {
        chrome,
        state: {
          kind: 'passkey-progress',
          working: false,
          message: surfaceCopy.prompt,
          actionLabel: 'Authenticate with Passkey',
          testId: 'cli-auth-pending',
          onAction: () => void cli.authenticate(),
        },
      };
    case 'authenticating':
      return {
        chrome,
        state: {
          kind: 'passkey-progress',
          working: true,
          message: 'Authenticating with your passkey…',
          testId: 'cli-auth-authenticating',
        },
      };
    case 'completed':
      return {
        chrome: {
          title: 'Authentication complete',
          subtitle: surfaceCopy.subtitle,
        },
        state: {
          kind: 'status',
          tone: 'success',
          message: 'Authentication successful',
          detail: surfaceCopy.complete,
          testId: 'cli-auth-completed',
        },
      };
    case 'expired':
      return {
        chrome: {
          title: 'Session expired',
          subtitle: surfaceCopy.subtitle,
        },
        state: {
          kind: 'status',
          tone: 'disabled',
          message: 'Session Expired',
          detail: cli.error ?? 'This authentication session has expired. Please start a new one from your terminal.',
          testId: 'cli-auth-expired',
        },
      };
    case 'error':
      return {
        chrome: {
          title: 'Authentication failed',
          subtitle: surfaceCopy.subtitle,
        },
        state: {
          kind: 'status',
          tone: 'error',
          message: cli.error ?? 'Authentication failed',
          testId: 'cli-auth-error',
        },
      };
  }
};
