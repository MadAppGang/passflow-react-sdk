import { useCallback, useContext } from 'react';
import { NavigateFunction, NavigateOptions, NavigationContext } from '@/context';
import qs from 'query-string';

export type ReactRouterNavigateOptions = {
  pathname: string;
  search: string;
  replace?: boolean;
}

export type TanstackRouterNavigateOptions = {
  to: string;
  search: Record<string, unknown>;
  replace?: boolean;
}

export type WouterNavigateOptions = {
  to: string;
  search?: Record<string, unknown>;
  replace?: boolean;
}

export type ReachRouterNavigateOptions = {
  to: string;
  search?: Record<string, unknown>;
  replace?: boolean;
}

const parseSearch = (search: string): Record<string, string> => {
  if (!search) return {};
  const parsed = qs.parse(search.startsWith('?') ? search.slice(1) : search);
  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, String(value)])
  );
};

export const useNavigation = () => {
  const { navigate, setNavigate, router } = useContext(NavigationContext);

  const wrappedSetNavigate = useCallback((newNavigate: ((to: NavigateOptions | string | ReactRouterNavigateOptions | TanstackRouterNavigateOptions | WouterNavigateOptions | ReachRouterNavigateOptions) => void) | null) => {
    if (!newNavigate) {
      setNavigate(null);
      return;
    }

    const wrappedNavigate = ((options: NavigateOptions) => {
      const { to, search = '', replace = false } = options;

      switch (router) {
        case 'react-router':
          newNavigate({
            pathname: to,
            search: search.startsWith('?') ? search : `?${search}`,
            replace
          } as ReactRouterNavigateOptions);
          break;

        case 'tanstack-router':
          newNavigate({
            to,
            search: parseSearch(search),
            replace
          } as TanstackRouterNavigateOptions);
          break;

        case 'wouter': 
          const searchParamWouter = search ? (search.startsWith('?') ? search : `?${search}`) : '';
          newNavigate({to: `${to}${searchParamWouter}`, replace} as WouterNavigateOptions);
          break;

        default:
          // default router
          const searchParamDefault = search ? (search.startsWith('?') ? search : `?${search}`) : '';
          if (replace) {
            window.location.replace(`${to}${searchParamDefault}`);
          } else {
            window.location.href = `${to}${searchParamDefault}`;
          }
      }
    }) as NavigateFunction;

    setNavigate(wrappedNavigate);
  }, [setNavigate, router]);

  return { 
    navigate,
    setNavigate: wrappedSetNavigate,
    router
  };
}; 