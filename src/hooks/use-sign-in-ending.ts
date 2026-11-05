import { useRef, useState } from 'react';
import { hasFollowedOIDCRedirect } from '@/components/provider/passflow-provider';
import { getUrlWithTokens, isSameOriginPath, isSignInPage } from '@/utils';
import { useNavigation } from './use-navigation';
import { usePassflow } from './use-passflow';

const REDIRECT_NOT_REGISTERED = 'error.app.redirect.url.not.registered';

export type SignInEnding = 'none' | 'checking' | 'signed-in' | 'refused' | 'unavailable';

/**
 * How every sign-in ends once the user holds tokens, in this order:
 * 1. With no target, or a target that is the sign-in page itself, the user stays and is told they are signed in.
 * 2. A path on this page's origin is a plain navigation. It carries no tokens.
 * 3. Anything else carries tokens. A target that came with the request (a prop, the URL, a token or a response) is
 *    validated by the server first and the user goes to the address it returns. If the server refuses, or cannot answer,
 *    nothing is sent: `ending` says which, and `retry` asks again. The app's own default redirect is its operator's
 *    configuration and is not checked. The source decides, not the value.
 */
export const useSignInEnding = () => {
  const passflow = usePassflow();
  const { navigate, signInPath } = useNavigation();
  const [ending, setEnding] = useState<SignInEnding>('none');
  const checkedTarget = useRef<string | null>(null);
  // A screen that starts its request on mount holds this render's closure, from before the flow registered these.
  const latest = useRef({ navigate, signInPath });
  latest.current = { navigate, signInPath };

  const leaveFor = async (target: string) => {
    setEnding('checking');
    let address: string;
    try {
      address = await passflow.checkRedirectUrl(target);
    } catch (error) {
      setEnding((error as { id?: string } | undefined)?.id === REDIRECT_NOT_REGISTERED ? 'refused' : 'unavailable');
      return;
    }
    window.location.href = await getUrlWithTokens(passflow, address);
  };

  const finishSignIn = async (requested?: string | null, appDefault?: string | null) => {
    // An OIDC parent's redirect is already under way: a second navigation would break it.
    if (hasFollowedOIDCRedirect()) return;
    const target = requested || appDefault;
    if (!target || isSignInPage(target, latest.current.signInPath)) {
      setEnding('signed-in');
    } else if (isSameOriginPath(target)) {
      latest.current.navigate({ to: target });
    } else if (requested) {
      checkedTarget.current = requested;
      await leaveFor(requested);
    } else {
      window.location.href = await getUrlWithTokens(passflow, target);
    }
  };

  const retry = () => {
    if (checkedTarget.current) void leaveFor(checkedTarget.current);
  };

  return { ending, retry, finishSignIn };
};
