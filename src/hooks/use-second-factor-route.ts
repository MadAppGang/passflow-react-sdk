import { useRef } from 'react';
import { routes, useSearchSource } from '@/context';
import { routeToSecondFactor } from '@/utils';
import { useNavigation } from './use-navigation';
import { usePassflow } from './use-passflow';

/**
 * Sends a screen that starts its request on mount to the second factor. That request holds the closure of the first render,
 * from before the flow registered its router and paths, so this reads them when the answer arrives. The verify screen is
 * always inside the flow, so the flow's own navigate is the right one for it.
 */
export const useSecondFactorRoute = (twoFactorVerifyPath?: string) => {
  const passflow = usePassflow();
  const { navigate, twoFactorVerifyPath: registeredPath } = useNavigation();
  const searchSource = useSearchSource();
  const latest = useRef({ navigate, searchSource, path: twoFactorVerifyPath ?? registeredPath ?? routes.two_factor_verify.path });
  latest.current = { navigate, searchSource, path: twoFactorVerifyPath ?? registeredPath ?? routes.two_factor_verify.path };

  return () => routeToSecondFactor(passflow, latest.current.navigate, latest.current.path, latest.current.searchSource.read());
};
