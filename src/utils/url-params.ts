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
 * Read `parent_challenge_id` from the current URL's query string.
 * Returns `undefined` when not present so callers can short-circuit
 * the OIDC interceptor on non-OIDC mounts.
 *
 * Lowercases only the parameter KEYS (not values) so the
 * KSUID-shaped value isn't corrupted on the way through. (URL params
 * are case-sensitive per RFC 3986; some Passflow URLs use mixed
 * case like `appId=...`. The lowercase-keys treatment mirrors what
 * the bundled login-app was doing pre-SDK-migration.)
 */
export const readParentChallengeIdFromURL = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const raw = new URLSearchParams(window.location.search);
  // Lowercase only keys, preserve values (values are often
  // case-sensitive — KSUIDs, JWTs, OIDC state, etc.).
  const lower = new URLSearchParams(Array.from(raw, ([key, value]) => [key.toLowerCase(), value]));
  const value = lower.get('parent_challenge_id');
  return value || undefined;
};

const isParentChallengePair = (pair: string): boolean =>
  Array.from(new URLSearchParams(pair).keys())[0]?.toLowerCase() === 'parent_challenge_id';

/**
 * The URL without `parent_challenge_id`, in any key case. Works on the raw query, so every other param keeps its
 * exact encoding.
 */
export const urlWithoutParentChallenge = (url: string): string => {
  const hashAt = url.indexOf('#');
  const hash = hashAt < 0 ? '' : url.slice(hashAt);
  const beforeHash = hashAt < 0 ? url : url.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  if (queryAt < 0) return url;

  const kept = beforeHash
    .slice(queryAt + 1)
    .split('&')
    .filter((pair) => !isParentChallengePair(pair));
  return `${beforeHash.slice(0, queryAt)}${kept.length > 0 ? `?${kept.join('&')}` : ''}${hash}`;
};

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
