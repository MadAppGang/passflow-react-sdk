import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchContext, type SearchSource } from '../../context/search-context';
import { useUrlParams } from '../url-params';

const callUrlParams = (defaults?: Record<string, string>) => renderHook(() => useUrlParams(defaults)).result.current;

describe('useUrlParams inside PassflowFlow', () => {
  const sourceFor = (search: string) => {
    const writes: Array<{ search: string; replace: boolean }> = [];
    const source: SearchSource = { read: () => search, write: (next, { replace }) => writes.push({ search: next, replace }) };
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(SearchContext.Provider, { value: source }, children);
    return { writes, wrapper };
  };

  it('reads the flow location, not the address bar', () => {
    window.history.replaceState(null, '', '/elsewhere?challenge_id=from-address-bar');
    const { wrapper } = sourceFor('?challenge_id=from-flow');
    const params = renderHook(() => useUrlParams(), { wrapper }).result.current;
    expect(params.get('challenge_id')).toBe('from-flow');
  });

  it('writes defaults and set() to the flow, leaving the address bar alone', () => {
    window.history.replaceState(null, '', '/elsewhere');
    const { wrapper, writes } = sourceFor('?a=1');
    const params = renderHook(() => useUrlParams({ b: '2' }), { wrapper }).result.current;
    params.set({ c: '3', a: '' });
    expect(writes[0]).toEqual({ search: '?a=1&b=2', replace: true });
    expect(writes.at(-1)).toEqual({ search: '?c=3', replace: false });
    expect(window.location.pathname + window.location.search).toBe('/elsewhere');
  });
});

describe('useUrlParams', () => {
  const originalLocation = window.location;
  const originalHistory = window.history;

  beforeEach(() => {
    // Mock window.location
    (window as any).location = undefined;
    (window as any).location = {
      pathname: '/test',
      search: '',
      hash: '',
    };

    // Mock window.history (jsdom exposes it as a getter, so plain assignment throws)
    Object.defineProperty(window, 'history', {
      value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock DOMParser
    global.DOMParser = class DOMParser {
      parseFromString(input: string) {
        return {
          documentElement: {
            textContent: input,
          },
        };
      }
    } as any;
  });

  afterEach(() => {
    (window as any).location = originalLocation;
    Object.defineProperty(window, 'history', { value: originalHistory, writable: true, configurable: true });
  });

  describe('getAll', () => {
    it('should return all URL parameters', () => {
      window.location.search = '?foo=bar&baz=qux';

      const params = callUrlParams();
      const result = params.getAll();

      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should return empty object when no parameters', () => {
      window.location.search = '';

      const params = callUrlParams();
      const result = params.getAll();

      expect(result).toEqual({});
    });

    it('should handle multiple parameters with same key', () => {
      window.location.search = '?tag=red&tag=blue';

      const params = callUrlParams();
      const result = params.getAll();

      // URLSearchParams only keeps the last value for duplicate keys
      expect(result.tag).toBe('blue');
    });
  });

  describe('get', () => {
    it('should get a specific parameter value', () => {
      window.location.search = '?foo=bar&baz=qux';

      const params = callUrlParams();

      expect(params.get('foo')).toBe('bar');
      expect(params.get('baz')).toBe('qux');
    });

    it('should return null for non-existent parameter', () => {
      window.location.search = '?foo=bar';

      const params = callUrlParams();

      expect(params.get('nonexistent')).toBeNull();
    });

    it('should return null for empty parameter value', () => {
      window.location.search = '?foo=';

      const params = callUrlParams();

      expect(params.get('foo')).toBeNull();
    });

    it('should handle URL-encoded values', () => {
      window.location.search = '?message=Hello%20World&special=%3D%26%3F';

      const params = callUrlParams();

      expect(params.get('message')).toBe('Hello World');
      expect(params.get('special')).toBe('=&?');
    });
  });

  describe('set', () => {
    it('should set URL parameters', () => {
      window.location.search = '';

      const params = callUrlParams();
      params.set({ foo: 'bar', baz: 'qux' });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?foo=bar&baz=qux');
    });

    it('should update existing parameters', () => {
      window.location.search = '?foo=old&baz=qux';

      const params = callUrlParams();
      params.set({ foo: 'new' });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?foo=new&baz=qux');
    });

    it('should delete parameters when value is null', () => {
      window.location.search = '?foo=bar&baz=qux';

      const params = callUrlParams();
      params.set({ foo: null as any });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?baz=qux');
    });

    it('should delete parameters when value is undefined', () => {
      window.location.search = '?foo=bar&baz=qux';

      const params = callUrlParams();
      params.set({ foo: undefined as any });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?baz=qux');
    });

    it('should delete parameters when value is empty string', () => {
      window.location.search = '?foo=bar&baz=qux';

      const params = callUrlParams();
      params.set({ foo: '' });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?baz=qux');
    });

    it('should remove all parameters when all are deleted', () => {
      window.location.search = '?foo=bar';

      const params = callUrlParams();
      params.set({ foo: '' });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test');
    });

    it('should preserve hash when setting parameters', () => {
      window.location.search = '';
      window.location.hash = '#section';

      const params = callUrlParams();
      params.set({ foo: 'bar' });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?foo=bar#section');
    });
  });

  describe('defaultValues', () => {
    it('should set default values when parameters do not exist', () => {
      window.location.search = '';

      callUrlParams({ foo: 'default', bar: 'value' });

      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/test?foo=default&bar=value');
    });

    it('should not override existing parameters', () => {
      window.location.search = '?foo=existing';

      callUrlParams({ foo: 'default', bar: 'value' });

      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/test?foo=existing&bar=value');
    });

    it('should not set default values that are empty strings', () => {
      window.location.search = '';

      callUrlParams({ foo: '', bar: 'value' });

      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/test?bar=value');
    });

    it('should not update URL when no changes needed', () => {
      window.location.search = '?foo=existing';

      callUrlParams({ foo: 'default' });

      expect(window.history.replaceState).not.toHaveBeenCalled();
    });

    it('should preserve hash when setting defaults', () => {
      window.location.search = '';
      window.location.hash = '#section';

      callUrlParams({ foo: 'default' });

      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/test?foo=default#section');
    });
  });

  describe('HTML entity decoding', () => {
    it('should decode HTML entities in URL search', () => {
      window.location.search = '?message=Hello%20World';

      // Mock DOMParser to return decoded text
      global.DOMParser = class DOMParser {
        parseFromString(input: string) {
          return {
            documentElement: {
              textContent: decodeURIComponent(input),
            },
          };
        }
      } as any;

      const params = callUrlParams();
      const result = params.get('message');

      expect(result).toBe('Hello World');
    });
  });
});
