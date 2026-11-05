import type { FC } from 'react';
import { useEffect } from 'react';
import { TwoFactorSetupForm } from '@/components/form/two-factor-setup';
import { LoginScreen, type LoginStatusState } from '@/components/ui';
import { routes, useSearchSource } from '@/context';
import { type UseTwoFactorSetupMagicLinkReturn, useNavigation, useTwoFactorSetupMagicLink } from '@/hooks';
import {
  signInSearch,
  twoFactorBackToSignInLabel,
  twoFactorLinkAlreadyUsedMessage,
  twoFactorRateLimitedMessage,
  twoFactorSignInLabel,
} from '@/utils';

import '@/styles/index.css';

/**
 * Error type for magic link validation
 */
type MagicLinkError = NonNullable<UseTwoFactorSetupMagicLinkReturn['error']>;

/**
 * Props for TwoFactorSetupMagicLinkFlow component
 */
export type TwoFactorSetupMagicLinkFlowProps = {
  /**
   * The magic-link token. Leave it out and it is read from the URL: the path
   * segment after `/two-factor-setup-magic-link/` (or the same after `#`).
   */
  token?: string;
  /** Callback after successful setup */
  onSuccess?: () => void;
  /** Callback on validation error */
  onError?: (error: MagicLinkError) => void;
  /** Whether to redirect after setup (default: true) */
  redirectOnSuccess?: boolean;
  /** Path to sign-in page (default: /signin) */
  signInPath?: string;
};

const MAGIC_LINK_SEGMENT = /\/two-factor-setup-magic-link\/([^/?#]+)/;

/** The token in the current URL's path, or after `#` for hash routing; '' when there is none. */
const tokenFromUrl = (): string => {
  const found = MAGIC_LINK_SEGMENT.exec(window.location.pathname) ?? MAGIC_LINK_SEGMENT.exec(window.location.hash);
  if (!found?.[1]) return '';
  try {
    return decodeURIComponent(found[1]);
  } catch {
    return found[1];
  }
};

const ERROR_SUBTITLES: Partial<Record<MagicLinkError['code'], string>> = {
  EXPIRED_TOKEN: 'This link has expired',
  INVALID_TOKEN: 'This link is invalid',
  REVOKED_TOKEN: 'This link has been revoked',
  SERVER_ERROR: 'Something went wrong',
};

type ErrorStateOptions = {
  isRetrying: boolean;
  onRetry: () => void;
  onSignIn: () => void;
};

const errorState = (error: MagicLinkError, { isRetrying, onRetry, onSignIn }: ErrorStateOptions): LoginStatusState => {
  const base = { kind: 'status', tone: 'error', testId: 'two-factor-link-error' } as const;
  const signIn = { label: twoFactorSignInLabel, onClick: onSignIn };
  const backToSignIn = { label: twoFactorBackToSignInLabel, onClick: onSignIn };

  switch (error.code) {
    case 'ALREADY_USED':
      return { ...base, message: twoFactorLinkAlreadyUsedMessage, primaryAction: signIn };
    case 'RATE_LIMITED':
      return { ...base, message: twoFactorRateLimitedMessage, primaryAction: signIn };
    case 'SERVER_ERROR':
      return {
        ...base,
        message: error.message,
        primaryAction: { label: isRetrying ? 'Retrying...' : 'Try Again', busy: isRetrying, onClick: onRetry },
        secondaryAction: backToSignIn,
      };
    default:
      return {
        ...base,
        message: error.message,
        detail: 'Please contact your administrator to request a new magic link.',
        secondaryAction: backToSignIn,
      };
  }
};

/**
 * Flow component for magic link 2FA setup
 *
 * This component:
 * 1. Takes the token from its `token` prop, or from the URL
 * 2. Validates token via useTwoFactorSetupMagicLink hook
 * 3. Shows loading state during validation
 * 4. Shows error UI if validation fails
 * 5. Renders TwoFactorSetupForm if validation succeeds
 * 6. Redirects to sign-in after successful setup
 *
 * Route: /two-factor-setup-magic-link/:token
 */
export const TwoFactorSetupMagicLinkFlow: FC<TwoFactorSetupMagicLinkFlowProps> = ({
  token: tokenProp,
  onSuccess,
  onError,
  redirectOnSuccess = true,
  signInPath = routes.signin.path,
}) => {
  const token = tokenProp ?? tokenFromUrl();
  const { navigate } = useNavigation();
  const searchSource = useSearchSource();

  const { isLoading, isRetrying, isValidated, error, retry } = useTwoFactorSetupMagicLink(token);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const goToSignIn = () => navigate({ to: signInPath, search: signInSearch(searchSource.read()) });

  const handleSetupComplete = () => {
    onSuccess?.();
    if (redirectOnSuccess) goToSignIn();
  };

  if (isLoading) {
    return (
      <LoginScreen
        chrome={{ title: 'Validating Magic Link', subtitle: 'Please wait while we verify your link...' }}
        state={{ kind: 'status', tone: 'working', message: 'Validating your magic link...', testId: 'two-factor-link-loading' }}
      />
    );
  }

  if (error) {
    return (
      <LoginScreen
        chrome={{ title: 'We could not open this link', subtitle: ERROR_SUBTITLES[error.code] }}
        state={errorState(error, { isRetrying, onRetry: () => void retry(), onSignIn: goToSignIn })}
      />
    );
  }

  if (isValidated) {
    return <TwoFactorSetupForm onComplete={handleSetupComplete} onBackToSignIn={goToSignIn} />;
  }

  // Fallback (should not reach here)
  return null;
};
