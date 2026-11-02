import type { TError } from '@/components/error';
import type { PassflowProps } from '@/components/flow/passflow';
import type { TInvitationJoinFlow, TSignIn, TSignUp } from '@/components/form';
import { PassflowContext } from '@/context';
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import { type ComponentType, useContext } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

type UnionType = TSignIn | TSignUp | TInvitationJoinFlow | PassflowProps;
// react-error-boundary 6 types the caught value as unknown: anything can be thrown.
const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const excludeRoutes = ['verify-challenge-otp', 'password/reset', 'two-factor-verify', 'two-factor-recovery'];

export const withError =
  <P extends UnionType>(Component: ComponentType<P>, ErrorComponent: ComponentType<TError>) =>
  (props: P) => {
    const context = useContext(PassflowContext);
    const { successAuthRedirect } = props;
    const { pathname } = window.location;

    // Allow excluded routes to render without checking appId
    if (excludeRoutes.some((route) => pathname.includes(route))) {
      return (
        <ErrorBoundary
          // eslint-disable-next-line react/no-unstable-nested-components
          FallbackComponent={({ error }: FallbackProps) => (
            <ErrorComponent goBackRedirectTo={successAuthRedirect ?? '/'} error={toErrorMessage(error)} />
          )}
        >
          <Component {...props} />
        </ErrorBoundary>
      );
    }

    // If we're still discovering the appId, don't show error yet
    if (context?.state.isDiscoveringAppId) {
      return null; // Or render a loading spinner if desired
    }

    // After discovery is complete, check if we have the required config
    // Only appId is required - URL defaults to current origin if not provided
    if (!context?.state.appId) {
      const errorMessage = 'Missing appId';
      return <ErrorComponent goBackRedirectTo={successAuthRedirect ?? '/'} error={errorMessage} />;
    }

    return (
      <ErrorBoundary
        // eslint-disable-next-line react/no-unstable-nested-components
        FallbackComponent={({ error }: FallbackProps) => (
          <ErrorComponent goBackRedirectTo={successAuthRedirect ?? '/'} error={toErrorMessage(error)} />
        )}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };

export default withError;
