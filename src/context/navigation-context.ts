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
