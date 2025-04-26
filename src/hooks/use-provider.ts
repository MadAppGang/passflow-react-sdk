import type { PassflowFederatedAuthPayload, Providers } from '@passflow/passflow-js-sdk';
import { usePassflow } from './use-passflow';
import { useContext } from 'react';
import { PassflowContext } from '@/context';

export type UseProviderProps = (redirectUrl: string, createTenant?: boolean) => {
  federatedWithPopup: (provider: Providers, inviteToken?: string) => void;
  federatedWithRedirect: (provider: Providers, inviteToken?: string) => void;
};

export const useProvider: UseProviderProps = (redirectUrl, createTenant) => {
  const passflow = usePassflow();
  const context = useContext(PassflowContext);

  const payload = {
    redirect_url: redirectUrl,
    scopes: context?.state.scopes,
    create_tenant: context?.state.createTenantForNewUser ?? createTenant,
  };

  const federatedWithPopup = (provider: Providers, inviteToken?: string) => passflow.federatedAuthWithPopup({provider, invite_token: inviteToken, ...payload} as PassflowFederatedAuthPayload);
  const federatedWithRedirect = (provider: Providers, inviteToken?: string) => passflow.federatedAuthWithRedirect({provider, invite_token: inviteToken, ...payload} as PassflowFederatedAuthPayload);

  return {
    federatedWithPopup,
    federatedWithRedirect,
  };
};
