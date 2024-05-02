/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import { ComponentType, useContext } from 'react';
import { TError } from '@/components/error';
import { AoothContext } from '@/context';
import { ErrorBoundary } from 'react-error-boundary';
import { TSignIn, TSignUp } from '@/components/form';
import { TAoothFlow } from '@/components/flow/aooth';

type UnionType = TSignIn | TSignUp | TAoothFlow;
type TFallbackComponentProps = {
  error: Error;
  resetErrorBoundary: (...args: unknown[]) => void;
};

export const withError =
  <P extends UnionType>(Component: ComponentType<P>, ErrorComponent: ComponentType<TError>) =>
  (props: P) => {
    const context = useContext(AoothContext);
    const { successAuthRedirect } = props;

    if (!context?.state.appId || !context.state.aoothUrl) {
      const errorMessage = 'Missing appId or aoothUrl';
      return <ErrorComponent goBackRedirectTo={successAuthRedirect} error={errorMessage} />;
    }

    return (
      <ErrorBoundary
        // eslint-disable-next-line react/no-unstable-nested-components
        FallbackComponent={({ error }: TFallbackComponentProps) => (
          <ErrorComponent goBackRedirectTo={successAuthRedirect} error={error.message} />
        )}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };

export default withError;
