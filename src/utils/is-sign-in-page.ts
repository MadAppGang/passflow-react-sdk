import { routes } from '@/context';
import { isValidUrl } from './validate-url';

const withoutTrailingSlash = (path: string) => path.replace(/\/+$/, '') || '/';

/** Whether a target is a path on this page's origin, as opposed to a full address or anything that could leave it. */
export const isSameOriginPath = (target: string): boolean => {
  if (isValidUrl(target)) return false;
  try {
    return new URL(target, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
};

/** Whether a sign-in's target is the sign-in page of this app, whatever its query or fragment. */
export const isSignInPage = (target: string, signInPath: string = routes.signin.path): boolean => {
  try {
    const url = new URL(target, window.location.href);
    return url.origin === window.location.origin && withoutTrailingSlash(url.pathname) === withoutTrailingSlash(signInPath);
  } catch {
    return false;
  }
};
