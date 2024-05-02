import { Providers } from '@aooth/aooth-sdk-js';
import { useAooth } from './use-aooth';

export type TuseProvider = (
  redirectUrl: string,
  scopes: string[],
) => {
  federatedWithPopup: (provider: Providers) => void;
  federatedWithRedirect: (provider: Providers) => void;
};

export const useProvider: TuseProvider = (redirectUrl, scopes) => {
  const aooth = useAooth();
  const federatedWithPopup = (provider: Providers) => aooth.federatedAuthWithPopup(provider, redirectUrl, scopes);
  const federatedWithRedirect = (provider: Providers) => aooth.federatedAuthWithRedirect(provider, redirectUrl, scopes);

  return {
    federatedWithPopup,
    federatedWithRedirect,
  };
};
