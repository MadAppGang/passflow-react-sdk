/**
 * Utility for native handling of URL parameters
 */
import { useSearchSource } from '../context/search-context';

/**
 * Decodes HTML entities in a string
 */
const decodeHtmlEntities = (input: string): string => {
  const doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.documentElement.textContent || '';
};

const withQuestionMark = (params: URLSearchParams) => (params.toString() ? `?${params.toString()}` : '');

/**
 * Get URL parameters. Inside PassflowFlow they come from the flow's location; outside it, from the
 * address bar.
 * @param defaultValues Default values
 * @returns Object with methods getAll, get, set
 */
export const useUrlParams = <T extends Record<string, string>>(defaultValues?: T) => {
  const source = useSearchSource();
  // Decode HTML entities in location.search
  const decodedSearch = decodeHtmlEntities(source.read());
  const searchParams = new URLSearchParams(decodedSearch);

  // Set default values if parameters don't exist
  if (defaultValues) {
    let hasChanged = false;

    for (const [key, value] of Object.entries(defaultValues)) {
      if (!searchParams.has(key) && value !== '') {
        searchParams.set(key, value);
        hasChanged = true;
      }
    }

    if (hasChanged) {
      source.write(withQuestionMark(searchParams), { replace: true });
    }
  }

  /**
   * Get all parameters
   */
  const getAll = () => {
    const params: Record<string, string> = {};

    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }

    return params;
  };

  /**
   * Get parameter value
   * @param key Parameter key
   */
  const get = (key: string) => {
    const value = searchParams.get(key);
    return value === '' ? null : value;
  };

  /**
   * Set parameters
   * @param params Object with parameters
   */
  const set = (params: Record<string, string>) => {
    const newSearchParams = new URLSearchParams(source.read());

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, value);
      }
    }

    source.write(withQuestionMark(newSearchParams), { replace: false });
  };

  return {
    getAll,
    get,
    set,
  };
};
