import type { PassflowFederatedAuthPayload, Providers } from '@passflow/core';
import { useContext } from 'react';
import { PassflowContext } from '@/context';
import type { FederatedLanding } from '@/types';
import { isValidUrl, readParentChallengeIdFromURL } from '@/utils';
import { handOffScopes } from '@/utils/hand-off';
import { usePassflow } from './use-passflow';

const getFullRedirectUrl = (redirectUrl?: string): string => {
  if (redirectUrl && isValidUrl(redirectUrl)) {
    return redirectUrl;
  }
  return redirectUrl ? `${window.location.origin}${redirectUrl.startsWith('/') ? '' : '/'}${redirectUrl}` : '';
};

/**
 * The login page itself as the federated landing: it keeps the code, exchanges it and forwards. No trailing slash and
 * nothing else in the query, because the server refuses anything but this exact shape, an empty `redirectto=` too.
 */
const getLoginPageLandingUrl = (appId: string, redirectUrl?: string): string => {
  const { origin, pathname } = window.location;
  const target = getFullRedirectUrl(redirectUrl);
  const redirectTo = target ? `&redirectto=${encodeURIComponent(target)}` : '';
  return `${origin}${pathname.replace(/\/+$/, '') || '/'}?appid=${encodeURIComponent(appId)}${redirectTo}`;
};

const withoutUndefined = <T extends Record<string, unknown>>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;

export type UseProviderProps = (
  redirectUrl?: string,
  createTenant?: boolean,
  federatedLanding?: FederatedLanding,
) => {
  federatedWithPopup: (provider: Providers, inviteToken?: string) => void;
  federatedWithRedirect: (provider: Providers, inviteToken?: string) => void;
};

export const useProvider: UseProviderProps = (redirectUrl, createTenant, federatedLanding = 'app') => {
  const passflow = usePassflow();
  const context = useContext(PassflowContext);
  const appId = context?.state.appId;
  const landsOnLoginPage =
    federatedLanding === 'login-page' && Boolean(context?.state.appSettings?.pkce_enabled) && !readParentChallengeIdFromURL();

  // The app's mode as the sign-in form already loaded it: the start must not wait for a settings read. In Simple mode
  // the tokens go back to the app, so they get the scopes it asked for and its state. In SDK mode this sign-in only
  // starts the hosted session, which then issues the app its code, so it uses the sign-in scopes. Unknown is not Simple
  // for the state, which is echoed only in Simple mode.
  const handOff = context?.state.handOff;
  const pkceEnabled = context?.state.appSettings?.pkce_enabled;
  const scopes = handOff && pkceEnabled !== true ? handOffScopes(handOff) : context?.state.scopes;

  const payload = withoutUndefined({
    redirect_url: landsOnLoginPage && appId ? getLoginPageLandingUrl(appId, redirectUrl) : getFullRedirectUrl(redirectUrl),
    scopes,
    create_tenant: createTenant,
    state: pkceEnabled === false ? handOff?.state : undefined,
    parent_challenge_id: readParentChallengeIdFromURL(),
  });

  const federatedWithPopup = (provider: Providers, inviteToken?: string) =>
    passflow.federatedAuthWithPopup({ provider, invite_token: inviteToken, ...payload } as PassflowFederatedAuthPayload);
  const federatedWithRedirect = (provider: Providers, inviteToken?: string) =>
    passflow.federatedAuthWithRedirect({ provider, invite_token: inviteToken, ...payload } as PassflowFederatedAuthPayload);

  return {
    federatedWithPopup,
    federatedWithRedirect,
  };
};
