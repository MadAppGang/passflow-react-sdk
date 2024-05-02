import { Providers } from "@aooth/aooth-js-sdk";
import { useAooth } from "./use-aooth";

export type TuseProvider = (redirectUrl: string) => {
  federatedWithPopup: (provider: Providers) => void;
  federatedWithRedirect: (provider: Providers) => void;
};

export const useProvider: TuseProvider = (redirectUrl) => {
  const aooth = useAooth();
  const federatedWithPopup = (provider: Providers) =>
    aooth.federatedAuthWithPopup(provider, redirectUrl);
  const federatedWithRedirect = (provider: Providers) =>
    aooth.federatedAuthWithRedirect(provider, redirectUrl);

  return {
    federatedWithPopup,
    federatedWithRedirect,
  };
};
