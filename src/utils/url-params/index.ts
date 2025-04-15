/**
 * Utility for native handling of URL parameters
 */

/**
 * Get URL parameters
 * @param defaultValues Default values
 * @returns Object with methods getAll, get, set
 */
export const useUrlParams = <T extends Record<string, string>>(defaultValues?: T) => {
  const searchParams = new URLSearchParams(window.location.search);

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
      const newUrl = `${window.location.pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', newUrl);
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
    const newSearchParams = new URLSearchParams(window.location.search);

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, value);
      }
    }

    const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}${window.location.hash}`;
    window.history.pushState(null, '', newUrl);
  };

  return {
    getAll,
    get,
    set,
  };
};
