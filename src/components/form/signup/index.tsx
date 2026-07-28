import { ErrorComponent } from '@/components/error';
import { type LoginCredentialsValues, type LoginMethodConfig, LoginScreen } from '@/components/ui';
import { routes } from '@/context';
import { withError } from '@/hocs';
import { useAppSettings, useNavigation, usePassflow, useProvider, useSignUp } from '@/hooks';
import type { DefaultMethod, SuccessAuthRedirect } from '@/types';
import {
  type AuthMethods,
  authRedirectErrorMessage,
  emailRegex,
  getAuthMethods,
  getInvitationAuthChrome,
  getPasswordlessData,
  getUrlErrors,
  getUrlWithTokens,
  isValidUrl,
  useUrlParams,
} from '@/utils';
import type {
  PassflowPasskeyRegisterStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignUpPayload,
  PassflowUserPayload,
  Providers,
} from '@passflow/core';
import { eq } from 'lodash';
import { phone } from 'phone';
import queryString from 'query-string';
import type { FC } from 'react';
import { useMemo } from 'react';

const getSignUpMethodConfig = (authMethods: AuthMethods): LoginMethodConfig => {
  const identities: LoginMethodConfig['identities'] = [];

  if (authMethods.hasEmailMethods || authMethods.hasUsernameMethods) {
    const label =
      authMethods.hasEmailMethods && authMethods.hasUsernameMethods
        ? 'Email or username'
        : authMethods.hasUsernameMethods
          ? 'Username'
          : 'Email';
    identities.push({
      id: 'email_or_username',
      label,
      selectLabel: authMethods.hasUsernameMethods && !authMethods.hasEmailMethods ? 'Use username' : 'Use email',
      requiredMessage: `${label} is required`,
      format: authMethods.hasEmailMethods && !authMethods.hasUsernameMethods ? 'email' : undefined,
      password: authMethods.internal.email.password || authMethods.internal.username.password,
      passwordlessLabel: getPasswordlessData(authMethods, 'email_or_username')?.label,
    });
  }

  if (authMethods.hasPhoneMethods) {
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

export type TSignUp = {
  successAuthRedirect?: SuccessAuthRedirect;
  relyingPartyId?: string;
  federatedDisplayMode?: 'modal' | 'redirect';
  signInPath?: string;
  verifyOTPPath?: string;
  verifyMagicLinkPath?: string;
};

export const SignUpForm: FC<TSignUp> = ({
  successAuthRedirect,
  relyingPartyId = window.location.hostname,
  signInPath = routes.signin.path,
  verifyOTPPath = routes.verify_otp.path,
  verifyMagicLinkPath = routes.verify_magic_link.path,
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
  const loginMethods = useMemo(() => getSignUpMethodConfig(authMethods), [authMethods]);
  const { error: errorUrl, message: messageUrl } = getUrlErrors();

  if (errorUrl) {
    console.error('[passflow] sign-up redirect returned an error', { error: errorUrl, message: messageUrl });
    throw new Error(authRedirectErrorMessage);
  }

  const { get } = useUrlParams({ invite_token: '' });
  const inviteToken = get('invite_token');
  const invitationChrome = getInvitationAuthChrome(inviteToken, 'sign-up');
  const { fetch, isError, error, reset, isLoading } = useSignUp();

  const completeRegistration = async () => {
    const redirectUrl = successAuthRedirect ?? appSettings?.defaults?.redirect ?? '';
    if (!isValidUrl(redirectUrl)) navigate({ to: redirectUrl });
    else window.location.href = await getUrlWithTokens(passflow, redirectUrl);
  };

  const submitPassword = async (userPayload: PassflowUserPayload) => {
    const payload = {
      user: userPayload,
      create_tenant: createTenantForNewUser,
      ...(inviteToken ? { invite_token: inviteToken } : {}),
    } as PassflowSignUpPayload;

    if (await fetch(payload, 'password')) await completeRegistration();
  };

  const submitPasskey = async () => {
    const redirectUrl = successAuthRedirect ?? appSettings?.defaults?.redirect ?? '';
    const payload = {
      relying_party_id: relyingPartyId,
      create_tenant: createTenantForNewUser,
      redirect_url: redirectUrl,
      ...(inviteToken ? { invite_token: inviteToken } : {}),
      scopes,
    } as PassflowPasskeyRegisterStartPayload;

    if (await fetch(payload, 'passkey')) await completeRegistration();
  };

  const submitPasswordless = async (userPayload: Partial<PassflowPasswordlessSignInPayload>, method: DefaultMethod | null) => {
    const challengeType = getPasswordlessData(authMethods, method)?.challengeType;
    const payload = {
      ...userPayload,
      challenge_type: challengeType,
      create_tenant: createTenantForNewUser,
      redirect_url: successAuthRedirect ?? appSettings?.defaults?.redirect,
      ...(inviteToken ? { invite_token: inviteToken } : {}),
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
    const isUsername = values.method === 'email_or_username' && !isEmail && values.emailOrUsername.length > 0;
    const validatedPhone = phone(values.phone);
    const user = {
      ...(isEmail ? { email: values.emailOrUsername } : {}),
      ...(isUsername ? { username: values.emailOrUsername } : {}),
      ...(validatedPhone.isValid ? { phone_number: validatedPhone.phoneNumber } : {}),
      password: values.password,
      scopes,
    } as PassflowUserPayload;

    await submitPassword(user);
  };

  const handlePasswordless = async (values: LoginCredentialsValues) => {
    const isEmail = Boolean(values.emailOrUsername.match(emailRegex));
    const validatedPhone = phone(values.phone);
    const payload = {
      ...(isEmail ? { email: values.emailOrUsername } : {}),
      ...(validatedPhone.isValid ? { phone: validatedPhone.phoneNumber } : {}),
      scopes,
    };

    await submitPasswordless(payload as Partial<PassflowPasswordlessSignInPayload>, values.method);
  };

  const handleProvider = (provider: Providers) => federatedWithRedirect(provider, inviteToken ?? undefined);

  return (
    <LoginScreen
      chrome={{
        title: invitationChrome?.title ?? 'Create your account',
        subtitle: invitationChrome?.subtitle ?? 'For Passflow by Madappgang',
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
        passwordPurpose: 'sign-up',
        forcePasskey: Boolean(appSettings?.force_passwordless_login && authMethods.passkey),
        allowPasskeyToggle: true,
        busy: isLoading,
        primaryLabel: isLoading ? 'Creating account…' : 'Sign Up',
        passwordlessLabelPrefix: 'Sign Up with',
        passkeyLabel: 'Sign Up with a Passkey',
        error: isError ? error : null,
        footer: {
          prompt: 'Already have an account?',
          label: 'Sign In',
          to: signInPath ?? routes.signin.path,
          search: window.location.search,
        },
        onPassword: (values) => void handlePassword(values),
        onPasswordless: (values) => void handlePasswordless(values),
        onPasskey: () => void submitPasskey(),
        onProvider: handleProvider,
        onReset: reset,
      }}
    />
  );
};

export const SignUp = withError(SignUpForm, ErrorComponent);
