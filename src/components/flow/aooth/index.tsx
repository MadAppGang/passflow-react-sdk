import { FC, useMemo } from 'react';
import {
  ForgotPassword,
  ForgotPasswordSuccess,
  ResetPassword,
  SignIn,
  SignUp,
  VerifyChallengeMagicLink,
  VerifyChallengeOTP,
} from '@/components/form';
import { routes } from '@/context';
import '@/styles/index.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import { SuccessAuthRedirect } from '@/types';
import { concatScopes, defaultScopes } from '@/constants';
import { withError } from '@/hocs';
import { Error as ErrorComponent } from '@/components/error';

export type TAoothFlow = {
  federatedDisplayMode: 'modal' | 'redirect';
  successAuthRedirect: SuccessAuthRedirect;
  error?: string;
  relyingPartyId?: string;
  scopes?: string[];
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

const AoothFlowWrapper: FC<TAoothFlow> = ({
  federatedDisplayMode,
  successAuthRedirect,
  error,
  relyingPartyId = window.location.hostname,
  scopes = defaultScopes,
  federatedCallbackUrl = window.location.origin,
  pathPrefix,
}) => {
  const routesWithPrefix = useMemo(() => combineRoutesWithPrefix(pathPrefix), [pathPrefix]);

  if (error) throw new Error(error);
  return (
    <Routes>
      <Route
        path={routesWithPrefix.signin}
        element={
          <SignIn
            federatedCallbackUrl={federatedCallbackUrl}
            scopes={concatScopes(scopes)}
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
            scopes={concatScopes(scopes)}
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
            scopes={concatScopes(scopes)}
            signUpPath={routesWithPrefix.signup}
          />
        }
      />
      <Route path={routesWithPrefix.verify_magic_link} element={<VerifyChallengeMagicLink />} />
      <Route
        path={routesWithPrefix.forgot_password}
        element={
          <ForgotPassword
            signInPath={routesWithPrefix.signin}
            forgotPasswordSuccessPath={routesWithPrefix.forgot_password_success}
          />
        }
      />
      <Route path={routesWithPrefix.forgot_password_success} element={<ForgotPasswordSuccess />} />
      <Route
        path={routesWithPrefix.reset_password}
        element={<ResetPassword scopes={concatScopes(scopes)} successAuthRedirect={successAuthRedirect} />}
      />
      <Route path='*' element={<Navigate to={{ pathname: routesWithPrefix.signin, search: window.location.search }} />} />
    </Routes>
  );
};

AoothFlowWrapper.defaultProps = {
  error: undefined,
  federatedCallbackUrl: window.location.origin,
  pathPrefix: '',
  scopes: defaultScopes,
  relyingPartyId: window.location.hostname,
};

export const AoothFlow = withError(AoothFlowWrapper, ErrorComponent);
