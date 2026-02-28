import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUrlParams } from '../url-params';

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

    // Mock window.history
    (window as any).history = undefined;
    (window as any).history = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
    };

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
    (window as any).history = originalHistory;
  });

  describe('getAll', () => {
    it('should return all URL parameters', () => {
      window.location.search = '?foo=bar&baz=qux';

      const params = useUrlParams();
      const result = params.getAll();

      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should return empty object when no parameters', () => {
      window.location.search = '';

      const params = useUrlParams();
      const result = params.getAll();

      expect(result).toEqual({});
    });

    it('should handle multiple parameters with same key', () => {
      window.location.search = '?tag=red&tag=blue';

      const params = useUrlParams();
      const result = params.getAll();

      // URLSearchParams only keeps the last value for duplicate keys
      expect(result.tag).toBe('blue');
    });
  });

  describe('get', () => {
    it('should get a specific parameter value', () => {
      window.location.search = '?foo=bar&baz=qux';

      const params = useUrlParams();

      expect(params.get('foo')).toBe('bar');
      expect(params.get('baz')).toBe('qux');
    });

    it('should return null for non-existent parameter', () => {
      window.location.search = '?foo=bar';

      const params = useUrlParams();

      expect(params.get('nonexistent')).toBeNull();
    });

    it('should return null for empty parameter value', () => {
      window.location.search = '?foo=';

      const params = useUrlParams();

      expect(params.get('foo')).toBeNull();
    });

    it('should handle URL-encoded values', () => {
      window.location.search = '?message=Hello%20World&special=%3D%26%3F';

      const params = useUrlParams();

      expect(params.get('message')).toBe('Hello World');
      expect(params.get('special')).toBe('=&?');
    });
  });

  describe('set', () => {
    it('should set URL parameters', () => {
      window.location.search = '';

      const params = useUrlParams();
      params.set({ foo: 'bar', baz: 'qux' });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?foo=bar&baz=qux');
    });

    it('should update existing parameters', () => {
      window.location.search = '?foo=old&baz=qux';

      const params = useUrlParams();
      params.set({ foo: 'new' });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?foo=new&baz=qux');
    });

    it('should delete parameters when value is null', () => {
      window.location.search = '?foo=bar&baz=qux';

      const params = useUrlParams();
      params.set({ foo: null as any });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?baz=qux');
    });

    it('should delete parameters when value is undefined', () => {
      window.location.search = '?foo=bar&baz=qux';

      const params = useUrlParams();
      params.set({ foo: undefined as any });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?baz=qux');
    });

    it('should delete parameters when value is empty string', () => {
      window.location.search = '?foo=bar&baz=qux';

      const params = useUrlParams();
      params.set({ foo: '' });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?baz=qux');
    });

    it('should remove all parameters when all are deleted', () => {
      window.location.search = '?foo=bar';

      const params = useUrlParams();
      params.set({ foo: '' });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test');
    });

    it('should preserve hash when setting parameters', () => {
      window.location.search = '';
      window.location.hash = '#section';

      const params = useUrlParams();
      params.set({ foo: 'bar' });

      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '/test?foo=bar#section');
    });
  });

  describe('defaultValues', () => {
    it('should set default values when parameters do not exist', () => {
      window.location.search = '';

      useUrlParams({ foo: 'default', bar: 'value' });

      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/test?foo=default&bar=value');
    });

    it('should not override existing parameters', () => {
      window.location.search = '?foo=existing';

      useUrlParams({ foo: 'default', bar: 'value' });

      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/test?foo=existing&bar=value');
    });

    it('should not set default values that are empty strings', () => {
      window.location.search = '';

      useUrlParams({ foo: '', bar: 'value' });

      expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/test?bar=value');
    });

    it('should not update URL when no changes needed', () => {
      window.location.search = '?foo=existing';

      useUrlParams({ foo: 'default' });

      expect(window.history.replaceState).not.toHaveBeenCalled();
    });

    it('should preserve hash when setting defaults', () => {
      window.location.search = '';
      window.location.hash = '#section';

      useUrlParams({ foo: 'default' });

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

      const params = useUrlParams();
      const result = params.get('message');

      expect(result).toBe('Hello World');
    });
  });
});
