import { ErrorComponent } from '@/components/error';
import { hasFollowedOIDCRedirect, readParentChallengeIdFromURL } from '@/components/provider/passflow-provider';
import { type LoginCredentialsValues, type LoginMethodConfig, LoginScreen } from '@/components/ui';
import { routes } from '@/context';
import { withError } from '@/hocs';
import { useAppSettings, useNavigation, usePassflow, useProvider, useSignIn } from '@/hooks';
import type { SuccessAuthRedirect } from '@/types';
import {
  type AuthMethods,
  authRedirectErrorMessage,
  emailRegex,
  getAuthMethods,
  getIdentityLabel,
  getInvitationAuthChrome,
  getPasswordlessData,
  getUrlErrors,
  getUrlWithTokens,
  isValidUrl,
  useUrlParams,
} from '@/utils';
import type {
  PassflowPasskeyAuthenticateStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignInPayload,
  Providers,
} from '@passflow/core';
import { eq, isEmpty, size } from 'lodash';
import { phone } from 'phone';
import queryString from 'query-string';
import type { FC } from 'react';
import { useMemo } from 'react';

const getLoginMethodConfig = (authMethods: AuthMethods): LoginMethodConfig => {
  const identities: LoginMethodConfig['identities'] = [];

  if (authMethods.hasSignInEmailMethods || authMethods.hasSignInUsernameMethods) {
    const label = getIdentityLabel(authMethods, 'label') ?? 'Email or username';
    identities.push({
      id: 'email_or_username',
      label,
      selectLabel: getIdentityLabel(authMethods, 'button') ?? 'Use email',
      requiredMessage: `${label} is required`,
      format: authMethods.hasSignInEmailMethods && !authMethods.hasSignInUsernameMethods ? 'email' : undefined,
      password: authMethods.internal.email.password || authMethods.internal.username.password,
      passwordlessLabel: getPasswordlessData(authMethods, 'email_or_username')?.label,
    });
  }

  if (authMethods.hasSignInPhoneMethods) {
    identities.push({
      id: 'phone',
      label: 'Phone number',
      selectLabel: 'Use phone',
      requiredMessage: 'Phone number is required',
      password: authMethods.internal.phone.password,
      passwordlessLabel: getPasswordlessData(authMethods, 'phone')?.label,
    });
  }

  return {
    identities,
    passkey: authMethods.passkey,
    providers: authMethods.fim.providers,
  };
};

export type TSignIn = {
  successAuthRedirect?: SuccessAuthRedirect;
  relyingPartyId?: string;
  federatedDisplayMode?: 'modal' | 'redirect';
  signUpPath?: string;
  verifyOTPPath?: string;
  verifyMagicLinkPath?: string;
  forgotPasswordPath?: string;
  twoFactorVerifyPath?: string;
};

export const SignInForm: FC<TSignIn> = ({
  successAuthRedirect,
  relyingPartyId = window.location.hostname,
  signUpPath = routes.signup.path,
  verifyOTPPath = routes.verify_otp.path,
  verifyMagicLinkPath = routes.verify_magic_link.path,
  forgotPasswordPath = routes.forgot_password.path,
  twoFactorVerifyPath = routes.two_factor_verify.path,
}) => {
  const passflow = usePassflow();
  const { navigate } = useNavigation();
  const {
    appSettings,
    scopes,
    createTenantForNewUser,
    passwordPolicy,
    currentStyles,
    isError: isErrorApp,
    error: errorApp,
    loginAppTheme,
  } = useAppSettings();
  const { federatedWithRedirect } = useProvider(successAuthRedirect, createTenantForNewUser);

  if (isErrorApp) throw new Error(errorApp);

  const authMethods = useMemo(() => getAuthMethods(appSettings?.auth_strategies), [appSettings]);
  const loginMethods = useMemo(() => getLoginMethodConfig(authMethods), [authMethods]);
  const { error: errorUrl, message: messageUrl } = getUrlErrors();

  if (errorUrl) {
    console.error('[passflow] sign-in redirect returned an error', { error: errorUrl, message: messageUrl });
    throw new Error(authRedirectErrorMessage);
  }

  const { get } = useUrlParams({ invite_token: '' });
  const inviteToken = get('invite_token');
  const invitationChrome = getInvitationAuthChrome(inviteToken, 'sign-in');
  const { fetch, isError, error, reset, isLoading } = useSignIn();

  const oidcLayerOwnsRedirect = (): boolean => {
    if (hasFollowedOIDCRedirect()) return true;
    if (readParentChallengeIdFromURL()) {
      console.error(
        '[passflow] login took the legacy token path while parent_challenge_id is present on the URL — the OIDC interceptor did not engage and the RP redirect will not happen',
      );
    }
    return false;
  };

  const completeAuthentication = async () => {
    if (passflow.isTwoFactorVerificationRequired()) {
      navigate({ to: twoFactorVerifyPath ?? routes.two_factor_verify.path });
      return;
    }

    if (oidcLayerOwnsRedirect()) return;
    const redirectUrl = successAuthRedirect ?? appSettings?.defaults?.redirect ?? '';
    if (!isValidUrl(redirectUrl)) navigate({ to: redirectUrl });
    else window.location.href = await getUrlWithTokens(passflow, redirectUrl);
  };

  const submitPassword = async (userPayload: PassflowSignInPayload) => {
    const payload = {
      ...userPayload,
      ...(!isEmpty(inviteToken) && { invite_token: inviteToken }),
    } as PassflowSignInPayload;

    const status = await fetch(payload, 'password');
    if (status) await completeAuthentication();
  };

  const submitPasskey = async (passkeyPayload: PassflowPasskeyAuthenticateStartPayload) => {
    const payload = {
      ...passkeyPayload,
      ...(!isEmpty(inviteToken) && { invite_token: inviteToken }),
    } as PassflowPasskeyAuthenticateStartPayload;

    const response = await fetch(payload, 'passkey');
    if (response) await completeAuthentication();
  };

  const submitPasswordless = async (
    userPayload: Partial<PassflowPasswordlessSignInPayload>,
    method: LoginCredentialsValues['method'],
  ) => {
    const challengeType = getPasswordlessData(authMethods, method)?.challengeType;
    const payload = {
      ...userPayload,
      challenge_type: challengeType,
      create_tenant: createTenantForNewUser,
      redirect_url: successAuthRedirect ?? appSettings?.defaults?.redirect,
      ...(!isEmpty(inviteToken) && { invite_token: inviteToken }),
    } as PassflowPasswordlessSignInPayload;

    const response = await fetch(payload, 'passwordless');
    if (!response) return;

    const passwordlessResponse = response as PassflowPasswordlessResponse;
    const params = new URLSearchParams(window.location.search);
    const newParams = queryString.stringify({
      ...Object.fromEntries(params.entries()),
      ...payload,
      ...passwordlessResponse,
      type: 'passwordless',
      challenge_type: challengeType,
      create_tenant: createTenantForNewUser,
    });

    if (eq(challengeType, 'otp')) navigate({ to: verifyOTPPath ?? routes.verify_otp.path, search: newParams });
    if (eq(challengeType, 'magic_link'))
      navigate({ to: verifyMagicLinkPath ?? routes.verify_magic_link.path, search: newParams });
  };

  const handlePassword = async (values: LoginCredentialsValues) => {
    const isEmail = Boolean(values.emailOrUsername.match(emailRegex));
    const isUsername = values.method === 'email_or_username' && !isEmail && size(values.emailOrUsername) > 0;
    const validatedPhone = phone(values.phone);
    const payload = {
      ...(isEmail && { email: values.emailOrUsername }),
      ...(isUsername && { username: values.emailOrUsername }),
      ...(validatedPhone.isValid && { phone: validatedPhone.phoneNumber }),
      scopes,
      password: values.password,
    };

    await submitPassword(payload as PassflowSignInPayload);
  };

  const handlePasswordless = async (values: LoginCredentialsValues) => {
    const isEmail = Boolean(values.emailOrUsername.match(emailRegex));
    const validatedPhone = phone(values.phone);
    const payload = {
      ...(isEmail && { email: values.emailOrUsername }),
      ...(validatedPhone.isValid && { phone: validatedPhone.phoneNumber }),
      scopes,
    };

    await submitPasswordless(payload as Partial<PassflowPasswordlessSignInPayload>, values.method);
  };

  const handlePasskey = async () => {
    await submitPasskey({ relying_party_id: relyingPartyId, scopes });
  };

  const handleProvider = (provider: Providers) => federatedWithRedirect(provider, inviteToken ?? undefined);

  return (
    <LoginScreen
      chrome={{
        title: invitationChrome?.title ?? 'Sign In to your account',
        subtitle: invitationChrome?.subtitle ?? 'To Passflow by Madappgang',
        variant: 'sign-in',
        customCss: currentStyles?.custom_css,
        customLogo: currentStyles?.logo_url,
        customLogoAlt: `${loginAppTheme?.application_name ?? 'Application'} logo`,
        removeBranding: loginAppTheme?.remove_passflow_logo,
      }}
      state={{
        kind: 'credentials',
        methods: loginMethods,
        passwordPolicy,
        forcePasskey: Boolean(appSettings?.force_passwordless_login && authMethods.passkey),
        allowPasskeyToggle: true,
        busy: isLoading,
        primaryLabel: isLoading ? 'Signing in…' : 'Sign In',
        error: isError ? error : null,
        forgotPassword: {
          to: forgotPasswordPath ?? routes.forgot_password.path,
          getSearch: (method) =>
            queryString.stringify({
              ...queryString.parse(window.location.search),
              default_method: method,
            }),
        },
        footer: {
          prompt: "Don't have an account?",
          label: 'Sign Up',
          to: signUpPath ?? routes.signup.path,
          search: window.location.search,
        },
        onPassword: (values) => void handlePassword(values),
        onPasswordless: (values) => void handlePasswordless(values),
        onPasskey: () => void handlePasskey(),
        onProvider: handleProvider,
        onReset: reset,
      }}
    />
  );
};

export const SignIn = withError(SignInForm, ErrorComponent);
