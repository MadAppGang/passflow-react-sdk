import { routes } from '@/context';

const withoutTrailingSlash = (path: string) => path.replace(/\/+$/, '') || '/';

/** Whether a sign-in's target is the sign-in page of this app, whatever its query or fragment. */
export const isSignInPage = (target: string, signInPath: string = routes.signin.path): boolean => {
  try {
    const url = new URL(target, window.location.href);
    return url.origin === window.location.origin && withoutTrailingSlash(url.pathname) === withoutTrailingSlash(signInPath);
  } catch {
    return false;
  }
};
