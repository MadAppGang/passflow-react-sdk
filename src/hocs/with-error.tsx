import type { TError } from '@/components/error';
import type { PassflowProps } from '@/components/flow/passflow';
import type { TInvitationJoinFlow, TSignIn, TSignUp } from '@/components/form';
import { PassflowContext } from '@/context';
import React from 'react';
/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import { type ComponentType, useContext } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

type UnionType = TSignIn | TSignUp | TInvitationJoinFlow | PassflowProps;
type TFallbackComponentProps = {
  error: Error;
  resetErrorBoundary: (...args: unknown[]) => void;
};

const excludeRoutes = ['verify-challenge-otp', 'password/reset'];

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
          FallbackComponent={({ error }: TFallbackComponentProps) => (
            <ErrorComponent goBackRedirectTo={successAuthRedirect ?? '/'} error={error.message} />
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
    if (!context?.state.appId || !context.state.url) {
      const errorMessage = 'Missing appId or url';
      return <ErrorComponent goBackRedirectTo={successAuthRedirect ?? '/'} error={errorMessage} />;
    }

    return (
      <ErrorBoundary
        // eslint-disable-next-line react/no-unstable-nested-components
        FallbackComponent={({ error }: TFallbackComponentProps) => (
          <ErrorComponent goBackRedirectTo={successAuthRedirect ?? '/'} error={error.message} />
        )}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };

export default withError;
