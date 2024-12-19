/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import { ComponentType, useContext } from 'react';
import { TError } from '@/components/error';
import { PassflowContext } from '@/context';
import { ErrorBoundary } from 'react-error-boundary';
import { TSignIn, TSignUp } from '@/components/form';
import { PassflowProps } from '@/components/flow/passflow';

type UnionType = TSignIn | TSignUp | PassflowProps;
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

    if ((!context?.state.appId || !context.state.url) && !excludeRoutes.some((route) => pathname.includes(route))) {
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
