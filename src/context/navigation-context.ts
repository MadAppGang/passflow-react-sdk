import { createContext } from 'react';

export type NavigateOptions = {
  to: string;
  search?: string;
  replace?: boolean;
};

export type RouterType = 'default' | 'react-router' | 'tanstack-router' | 'wouter';

export type NavigateFunction = (options: NavigateOptions) => void;

export type NavigationContextType = {
  navigate: NavigateFunction;
  setNavigate: (navigate: NavigateFunction | null) => void;
  router: RouterType;
  /**
   * Where a sign-in that owes its second factor is sent when it lands on a
   * page outside the forms (a federated redirect carrying `#tfa_token=`).
   * `PassflowProvider` resolves it: a mounted `PassflowFlow` registers its own
   * (prefixed) route, else the provider's `twoFactorVerifyPath` prop, else
   * `routes.two_factor_verify.path`.
   */
  twoFactorVerifyPath?: string;
  /** Registers the 2FA route of a mounted flow; `null` withdraws it. */
  setTwoFactorVerifyPath?: (path: string | null) => void;
};

export const defaultNavigate: NavigateFunction = ({ to, search, replace }) => {
  const searchParam = search ? (search.startsWith('?') ? search : `?${search}`) : '';
  if (replace) {
    window.location.replace(`${to}${searchParam}`);
  } else {
    window.location.href = `${to}${searchParam}`;
  }
};

export const NavigationContext = createContext<NavigationContextType>({
  navigate: defaultNavigate,
  setNavigate: () => undefined,
  router: 'default',
});
