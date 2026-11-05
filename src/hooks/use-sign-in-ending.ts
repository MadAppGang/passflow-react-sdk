import { useState } from 'react';
import { getUrlWithTokens, isSignInPage, isValidUrl } from '@/utils';
import { useNavigation } from './use-navigation';
import { usePassflow } from './use-passflow';

/**
 * How every sign-in ends once the user holds tokens. With no target, or a target that is the sign-in page itself, the
 * user stays and `signedIn` turns true, so the screen can say so: the sign-in form again would read as a failure, and
 * tokens must not go into the address bar for a page that would only show that form. Any other target gets the redirect.
 */
export const useSignInEnding = () => {
  const passflow = usePassflow();
  const { navigate, signInPath } = useNavigation();
  const [signedIn, setSignedIn] = useState(false);

  const finishSignIn = async (target?: string | null) => {
    if (!target || isSignInPage(target, signInPath)) setSignedIn(true);
    else if (!isValidUrl(target)) navigate({ to: target });
    else window.location.href = await getUrlWithTokens(passflow, target);
  };

  return { signedIn, finishSignIn };
};
