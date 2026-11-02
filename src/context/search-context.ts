import { createContext, useContext } from 'react';

/**
 * Where the forms read and write their search params (`?challenge_id=…`).
 *
 * Outside PassflowFlow it is the address bar, as it always was. Inside, PassflowFlow
 * provides its own location, so the forms see the right params when the flow keeps a
 * memory or hash history, or is driven by an app router that does not use the address
 * bar. In the default browser mode both are the same URL.
 */
export type SearchSource = {
  /** The current search string, with its leading `?` or empty. */
  read: () => string;
  /** Moves to the same path with a new search string. */
  write: (search: string, options: { replace: boolean }) => void;
};

export const addressBarSearch: SearchSource = {
  read: () => window.location.search,
  write: (search, { replace }) => {
    const url = `${window.location.pathname}${search}${window.location.hash}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  },
};

export const SearchContext = createContext<SearchSource>(addressBarSearch);

export const useSearchSource = () => useContext(SearchContext);
