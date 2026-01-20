import { TwoFactorSetupForm } from '@/components/form/two-factor-setup';
import { Wrapper } from '@/components/form/wrapper';
import { Button, Icon } from '@/components/ui';
import { routes } from '@/context';
import { type UseTwoFactorSetupMagicLinkReturn, useNavigation, useTwoFactorSetupMagicLink } from '@/hooks';
import type { FC } from 'react';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import '@/styles/index.css';

/**
 * Error type for magic link validation
 */
type MagicLinkError = NonNullable<UseTwoFactorSetupMagicLinkReturn['error']>;

/**
 * Props for TwoFactorSetupMagicLinkFlow component
 */
export type TwoFactorSetupMagicLinkFlowProps = {
  /** Callback after successful setup */
  onSuccess?: () => void;
  /** Callback on validation error */
  onError?: (error: MagicLinkError) => void;
  /** Whether to redirect after setup (default: true) */
  redirectOnSuccess?: boolean;
  /** Path to sign-in page (default: /signin) */
  signInPath?: string;
};

/**
 * Flow component for magic link 2FA setup
 *
 * This component:
 * 1. Extracts token from URL params
 * 2. Validates token via useTwoFactorSetupMagicLink hook
 * 3. Shows loading state during validation
 * 4. Shows error UI if validation fails
 * 5. Renders TwoFactorSetupForm if validation succeeds
 * 6. Redirects to sign-in after successful setup
 *
 * Route: /two-factor-setup-magic-link/:token
 */
export const TwoFactorSetupMagicLinkFlow: FC<TwoFactorSetupMagicLinkFlowProps> = ({
  onSuccess,
  onError,
  redirectOnSuccess = true,
  signInPath = routes.signin.path,
}) => {
  const { token } = useParams<{ token: string }>();
  const { navigate } = useNavigation();

  // Validate magic link token
  const { isLoading, isRetrying, isValidated, error, retry, retryCountdown } = useTwoFactorSetupMagicLink(token || '');

  /**
   * Handle validation error
   */
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  /**
   * Handle successful 2FA setup completion
   */
  const handleSetupComplete = () => {
    onSuccess?.();

    if (redirectOnSuccess) {
      // Redirect to sign-in page
      navigate({
        to: signInPath,
      });
    }
  };

  /**
   * Handle setup cancellation
   */
  const handleCancel = () => {
    navigate({ to: signInPath });
  };

  /**
   * Render: Loading state
   */
  if (isLoading) {
    return (
      <Wrapper
        title='Validating Magic Link'
        subtitle='Please wait while we verify your link...'
        className='passflow-2fa-magic-link-loading'
      >
        <div className='passflow-loading-container' role='status' aria-live='polite' aria-busy='true'>
          <Icon id='logo' type='general' size='large' className='passflow-loading-spinner' />
          <p className='passflow-loading-text'>Validating your magic link...</p>
        </div>
      </Wrapper>
    );
  }

  /**
   * Render: Error state
   */
  if (error) {
    const isRetryable = error.code === 'SERVER_ERROR' || error.code === 'RATE_LIMITED';
    const isRateLimited = error.code === 'RATE_LIMITED' && retryCountdown !== null && retryCountdown > 0;

    return (
      <Wrapper
        title='Magic Link Validation Failed'
        subtitle={getErrorSubtitle(error.code)}
        className='passflow-2fa-magic-link-error'
      >
        <div className='passflow-error-container' role='alert' aria-live='assertive'>
          <div className='passflow-error-icon'>
            <Icon id='warning' type='general' size='large' />
          </div>

          <p className='passflow-error-message' id='error-message'>
            {error.message}
          </p>

          <div className='passflow-error-actions'>
            {isRetryable && (
              <Button
                size='big'
                type='button'
                variant='primary'
                onClick={retry}
                disabled={isRateLimited || isRetrying}
                aria-describedby='error-message'
              >
                {isRetrying ? 'Retrying...' : isRateLimited ? `Try again in ${formatCountdown(retryCountdown)}` : 'Try Again'}
              </Button>
            )}

            <Button size='big' type='button' variant='secondary' onClick={() => navigate({ to: signInPath })}>
              Back to Sign In
            </Button>
          </div>

          {!isRetryable && (
            <p className='passflow-error-help-text'>Please contact your administrator to request a new magic link.</p>
          )}
        </div>
      </Wrapper>
    );
  }

  /**
   * Render: Success state - show 2FA setup form
   */
  if (isValidated) {
    return <TwoFactorSetupForm onComplete={handleSetupComplete} onCancel={handleCancel} />;
  }

  // Fallback (should not reach here)
  return null;
};

/**
 * Get user-friendly subtitle for error codes
 */
function getErrorSubtitle(code: string): string {
  switch (code) {
    case 'EXPIRED_TOKEN':
      return 'This magic link has expired';
    case 'INVALID_TOKEN':
      return 'This magic link is invalid';
    case 'REVOKED_TOKEN':
      return 'This magic link has been revoked';
    case 'RATE_LIMITED':
      return 'Too many attempts';
    case 'SERVER_ERROR':
      return 'Something went wrong';
    default:
      return 'An error occurred';
  }
}

/**
 * Format countdown seconds as MM:SS
 */
function formatCountdown(seconds: number | null): string {
  if (seconds === null) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
