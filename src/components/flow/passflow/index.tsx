import {
  ForgotPassword,
  ForgotPasswordSuccess,
  InvitationJoin,
  ResetPassword,
  SignIn,
  SignUp,
  VerifyChallengeMagicLink,
  VerifyChallengeOTP,
} from '@/components/form';
import { routes } from '@/context';
import React, { type FC, useEffect, useMemo, useState } from 'react';
import '@/styles/index.css';
import { ErrorComponent } from '@/components/error';
import { withError } from '@/hocs';
import type { SuccessAuthRedirect } from '@/types';
import { getUrlErrors } from '@/utils';
import { Navigate, Route, Routes } from 'react-router-dom';

export type PassflowProps = {
  federatedDisplayMode: 'modal' | 'redirect';
  successAuthRedirect: SuccessAuthRedirect;
  error?: string;
  relyingPartyId?: string;
  federatedCallbackUrl?: string;
  pathPrefix?: string;
};

const normalizePathPrefix = (path?: string) => {
  if (!path) return '';
  const pathReplace = path.replace(/^\/+|\/+$/g, '');
  return pathReplace.startsWith('/') ? pathReplace : `/${pathReplace}`;
};

const combineRoutesWithPrefix = (prefix?: string) =>
  Object.keys(routes).reduce(
    (acc, key) => {
      const PATH = key as keyof typeof routes;
      acc[PATH] = `${normalizePathPrefix(prefix)}${routes[key as keyof typeof routes]?.path}`;
      return acc;
    },
    {} as Record<keyof typeof routes, string>,
  );

const PassflowWrapper: FC<PassflowProps> = ({
  federatedDisplayMode,
  successAuthRedirect,
  error = undefined,
  relyingPartyId = window.location.hostname,
  federatedCallbackUrl = window.location.origin,
  pathPrefix = '',
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRouterAvailable, setIsRouterAvailable] = useState<boolean>(false);
  const [dependencyError, setDependencyError] = useState<string>('');

  const { error: errorUrlSuccess, message: messageUrlSuccess } = getUrlErrors(successAuthRedirect);
  const { error: errorUrlCallback, message: messageUrlCallback } = getUrlErrors(federatedCallbackUrl);

  if (errorUrlSuccess && messageUrlSuccess) throw new Error(messageUrlSuccess);
  if (errorUrlCallback && messageUrlCallback) throw new Error(messageUrlCallback);

  const routesWithPrefix = useMemo(() => combineRoutesWithPrefix(pathPrefix), [pathPrefix]);

  useEffect(() => {
    const checkRouter = async () => {
      setIsLoading(true);
      try {
        await import('react-router-dom');

        setIsRouterAvailable(true);
      } catch (e) {
        setDependencyError(
          '[Passflow SDK] PassflowFlow requires react-router-dom to be installed. Please install it using: pnpm add react-router-dom',
        );
        setIsRouterAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkRouter();
  }, []);

  if (isLoading) {
    return null;
  }

  if (!isRouterAvailable) {
    throw new Error(dependencyError);
  }

  if (error) throw new Error(error);

  return (
    <Routes>
      <Route
        path={routesWithPrefix.signin}
        element={
          <SignIn
            federatedCallbackUrl={federatedCallbackUrl}
            successAuthRedirect={successAuthRedirect}
            relyingPartyId={relyingPartyId}
            federatedDisplayMode={federatedDisplayMode}
            signUpPath={routesWithPrefix.signup}
            forgotPasswordPath={routesWithPrefix.forgot_password}
            verifyMagicLinkPath={routesWithPrefix.verify_magic_link}
            verifyOTPPath={routesWithPrefix.verify_otp}
          />
        }
      />
      <Route
        path={routesWithPrefix.signup}
        element={
          <SignUp
            federatedCallbackUrl={federatedCallbackUrl}
            successAuthRedirect={successAuthRedirect}
            relyingPartyId={relyingPartyId}
            federatedDisplayMode={federatedDisplayMode}
            signInPath={routesWithPrefix.signin}
            verifyMagicLinkPath={routesWithPrefix.verify_magic_link}
            verifyOTPPath={routesWithPrefix.verify_otp}
          />
        }
      />
      <Route
        path={routesWithPrefix.verify_otp}
        element={
          <VerifyChallengeOTP
            successAuthRedirect={successAuthRedirect}
            numInputs={6}
            shouldAutoFocus
            signUpPath={routesWithPrefix.signup}
          />
        }
      />
      <Route path={routesWithPrefix.verify_magic_link} element={<VerifyChallengeMagicLink />} />
      <Route
        path={routesWithPrefix.forgot_password}
        element={
          <ForgotPassword
            successResetRedirect={successAuthRedirect}
            signInPath={routesWithPrefix.signin}
            forgotPasswordSuccessPath={routesWithPrefix.forgot_password_success}
          />
        }
      />
      <Route path={routesWithPrefix.forgot_password_success} element={<ForgotPasswordSuccess />} />
      <Route path={routesWithPrefix.reset_password} element={<ResetPassword successAuthRedirect={successAuthRedirect} />} />
      <Route
        path={routesWithPrefix.invitation}
        element={<InvitationJoin successAuthRedirect={successAuthRedirect} signInPath={routesWithPrefix.signin} />}
      />
      <Route
        path='*'
        element={
          <Navigate
            to={{
              pathname: routesWithPrefix.signin,
              search: window.location.search,
            }}
          />
        }
      />
    </Routes>
  );
};

export const PassflowFlow = withError(PassflowWrapper, ErrorComponent);
