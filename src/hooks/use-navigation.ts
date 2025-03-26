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
  search: Record<string, string>;
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

  const wrappedSetNavigate = useCallback((newNavigate: ((to: NavigateOptions | string | ReactRouterNavigateOptions | TanstackRouterNavigateOptions) => void) | null) => {
    if (!newNavigate) {
      setNavigate(null);
      return;
    }

    const wrappedNavigate = ((options: NavigateOptions) => {
      const { to, search = '', replace = true } = options;

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

        default:
          // default router
          const searchParam = search ? (search.startsWith('?') ? search : `?${search}`) : '';
          if (replace) {
            window.location.replace(`${to}${searchParam}`);
          } else {
            window.location.href = `${to}${searchParam}`;
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