import { PassflowContext } from '@/context';
import { isValidUrl } from '@/utils';
import type { PassflowFederatedAuthPayload, Providers } from '@passflow/core';
import { useContext } from 'react';
import { usePassflow } from './use-passflow';

const getFullRedirectUrl = (redirectUrl?: string): string => {
  if (redirectUrl && isValidUrl(redirectUrl)) {
    return redirectUrl;
  }
  return redirectUrl ? `${window.location.origin}${redirectUrl.startsWith('/') ? '' : '/'}${redirectUrl}` : "";
};

export type UseProviderProps = (
  redirectUrl?: string,
  createTenant?: boolean,
) => {
  federatedWithPopup: (provider: Providers, inviteToken?: string) => void;
  federatedWithRedirect: (provider: Providers, inviteToken?: string) => void;
};

export const useProvider: UseProviderProps = (redirectUrl, createTenant) => {
  const passflow = usePassflow();
  const context = useContext(PassflowContext);

  const payload = {
    redirect_url: getFullRedirectUrl(redirectUrl),
    scopes: context?.state.scopes,
    create_tenant: createTenant,
  };

  const federatedWithPopup = (provider: Providers, inviteToken?: string) =>
    passflow.federatedAuthWithPopup({ provider, invite_token: inviteToken, ...payload } as PassflowFederatedAuthPayload);
  const federatedWithRedirect = (provider: Providers, inviteToken?: string) =>
    passflow.federatedAuthWithRedirect({ provider, invite_token: inviteToken, ...payload } as PassflowFederatedAuthPayload);

  return {
    federatedWithPopup,
    federatedWithRedirect,
  };
};
