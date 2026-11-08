import { SERVICE_UNAVAILABLE_ERROR_ID } from '@passflow/core';
import { useContext, useRef, useState } from 'react';
import { hasFollowedOIDCRedirect } from '@/components/provider/passflow-provider';
import { PassflowContext } from '@/context';
import { getUrlWithTokens, isSameOriginPath, isSignInPage } from '@/utils';
import { useNavigation } from './use-navigation';
import { usePassflow } from './use-passflow';

const REDIRECT_NOT_REGISTERED = 'error.app.redirect.url.not.registered';

export type SignInEnding = 'none' | 'checking' | 'signed-in' | 'refused' | 'unavailable' | 'service-unavailable';

/**
 * How every sign-in ends once the user holds tokens, in this order:
 * 1. With no target, or a target that is the sign-in page itself, the user stays and is told they are signed in.
 * 2. A path on this page's origin is a plain navigation. It carries no tokens.
 * 3. Anything else is left for. A target that came with the request (a prop, the URL, a token or a response) is
 *    validated by the server first and the user goes to the address it returns. If the server refuses, fails, or
 *    Passflow cannot be reached at all, nothing is sent: `ending` says which, and `retry` asks again. The app's own
 *    default redirect is its operator's configuration and is not checked. The source decides, not the value.
 * 4. Tokens go in the URL only for an app in Simple mode; in SDK mode the user goes to the address with nothing, and
 *    the app's SDK starts the sign-in. If the app's mode cannot be read, nothing is sent and `ending` is
 *    `unavailable`.
 */
export const useSignInEnding = () => {
  const passflow = usePassflow();
  const handOff = useContext(PassflowContext)?.state.handOff;
  const { navigate, signInPath } = useNavigation();
  const [ending, setEnding] = useState<SignInEnding>('none');
  // The external ending last started, for `retry`: a requested target is checked again, the app default is not.
  const lastEnding = useRef<{ target: string; checked: boolean } | null>(null);
  // A screen that starts its request on mount holds this render's closure, from before the flow registered its path.
  const latestSignInPath = useRef(signInPath);
  latestSignInPath.current = signInPath;

  const handOver = async (address: string) => {
    setEnding('checking');
    let pkceEnabled: boolean | undefined;
    try {
      pkceEnabled = (await passflow.getAppSettings())?.pkce_enabled;
    } catch {
      setEnding('unavailable');
      return;
    }
    // Only a mode positively known to be Simple gets tokens in the URL.
    window.location.href = pkceEnabled === false ? await getUrlWithTokens(passflow, address, 'hash', handOff) : address;
  };

  const leaveFor = async (target: string) => {
    setEnding('checking');
    let address: string;
    try {
      address = await passflow.checkRedirectUrl(target);
    } catch (error) {
      const id = (error as { id?: string } | undefined)?.id;
      if (id === REDIRECT_NOT_REGISTERED) setEnding('refused');
      else if (id === SERVICE_UNAVAILABLE_ERROR_ID) setEnding('service-unavailable');
      else setEnding('unavailable');
      return;
    }
    await handOver(address);
  };

  const finishSignIn = async (requested?: string | null, appDefault?: string | null) => {
    // An OIDC parent's redirect is already under way: a second navigation would break it.
    if (hasFollowedOIDCRedirect()) return;
    const target = requested || appDefault;
    if (!target || isSignInPage(target, latestSignInPath.current)) {
      setEnding('signed-in');
    } else if (isSameOriginPath(target)) {
      navigate({ to: target });
    } else if (requested) {
      lastEnding.current = { target: requested, checked: true };
      await leaveFor(requested);
    } else {
      lastEnding.current = { target, checked: false };
      await handOver(target);
    }
  };

  const retry = () => {
    const last = lastEnding.current;
    if (!last) return;
    void (last.checked ? leaveFor(last.target) : handOver(last.target));
  };

  return { ending, retry, finishSignIn };
};
