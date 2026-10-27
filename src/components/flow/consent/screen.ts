import type { LoginScreenProps } from '@/components/ui';
import type { UseConsentProps } from '@/hooks/use-consent';

/**
 * Maps consent state onto the shared LoginScreen. Pure — every visual decision
 * lives in LoginScreen, every protocol decision lives in useConsent, and this
 * file is only the translation between them.
 */
export const getConsentLoginScreenProps = (consent: UseConsentProps): LoginScreenProps | null => {
  if (consent.status === 'loading') return null;

  if (consent.status === 'invalid') {
    return {
      chrome: {
        title: consent.error?.message ?? 'Consent request unavailable',
      },
      state: {
        kind: 'general-error',
        message: consent.error?.message,
        detail: consent.error?.description,
        actionLabel: 'Back to login',
        testId: 'consent-invalid',
        onAction: () => {
          window.location.href = '/web';
        },
      },
    };
  }

  if (consent.status === 'redirecting') {
    return {
      chrome: {
        title: 'Taking you back',
        subtitle: `Returning you to ${consent.info?.app_name || 'the application'}.`,
      },
      state: {
        kind: 'status',
        tone: 'success',
        message: 'Decision recorded',
        detail: 'You can close this page if it does not continue on its own.',
        testId: 'consent-redirecting',
      },
    };
  }

  const info = consent.info;
  if (!info) return null;

  const appName = info.app_name || info.client_id;
  const busy = consent.status === 'working';

  return {
    chrome: {
      title: `Allow ${appName} to access your account?`,
      subtitle: 'Choose what this application may use, then allow or deny.',
      // The app's own logo replaces the Passflow mark, which is what makes this
      // read as "THIS app is asking" rather than a generic Passflow screen.
      customLogo: info.app_logo_url || undefined,
      customLogoAlt: `${appName} logo`,
    },
    state: {
      kind: 'consent',
      appName,
      scopes: info.requested_scopes.map((scope) => {
        const meta = consent.scopeMetadata(scope);
        return {
          scope,
          label: meta.label || scope,
          description: meta.description || undefined,
          granted: consent.grantedScopes.includes(scope),
        };
      }),
      busy,
      error: consent.error?.message,
      allowLabel: 'Allow',
      denyLabel: 'Deny',
      busyLabel: 'Submitting…',
      testId: 'consent-screen',
      allowTestId: 'consent-allow',
      denyTestId: 'consent-deny',
      appNameTestId: 'consent-app-name',
      onToggleScope: consent.toggleScope,
      onAllow: () => void consent.allow(),
      onDeny: () => void consent.deny(),
    },
  };
};
