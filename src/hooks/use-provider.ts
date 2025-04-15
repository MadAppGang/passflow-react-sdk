import type { Providers } from '@passflow/passflow-js-sdk';
import { usePassflow } from './use-passflow';

export type UseProviderProps = (redirectUrl: string) => {
  federatedWithPopup: (provider: Providers) => void;
  federatedWithRedirect: (provider: Providers) => void;
};

export const useProvider: UseProviderProps = (redirectUrl) => {
  const passflow = usePassflow();
  const federatedWithPopup = (provider: Providers) => passflow.federatedAuthWithPopup(provider, redirectUrl);
  const federatedWithRedirect = (provider: Providers) => passflow.federatedAuthWithRedirect(provider, redirectUrl);

  return {
    federatedWithPopup,
    federatedWithRedirect,
  };
};
