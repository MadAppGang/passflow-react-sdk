import type { Passflow } from '@passflow/core';
import { describe, expect, it, vi } from 'vitest';
import { getUrlWithTokens } from '../get-url-with-tokens';

describe('getUrlWithTokens', () => {
  it('should append tokens as query parameters when tokens are available', async () => {
    const mockPassflow = {
      getTokens: vi.fn().mockResolvedValue({
        access_token: 'access123',
        refresh_token: 'refresh456',
        id_token: 'id789',
        scopes: ['read', 'write'],
      }),
    } as unknown as Passflow;

    const url = 'https://example.com/callback';
    const result = await getUrlWithTokens(mockPassflow, url);

    expect(result).toContain('access_token=access123');
    expect(result).toContain('refresh_token=refresh456');
    expect(result).toContain('id_token=id789');
    expect(result).not.toContain('scopes');
    expect(mockPassflow.getTokens).toHaveBeenCalledWith(false);
  });

  it('should return original URL when tokens are null', async () => {
    const mockPassflow = {
      getTokens: vi.fn().mockResolvedValue(null),
    } as unknown as Passflow;

    const url = 'https://example.com/callback';
    const result = await getUrlWithTokens(mockPassflow, url);

    expect(result).toBe(url);
    expect(mockPassflow.getTokens).toHaveBeenCalledWith(false);
  });

  it('should return original URL when tokens are undefined', async () => {
    const mockPassflow = {
      getTokens: vi.fn().mockResolvedValue(undefined),
    } as unknown as Passflow;

    const url = 'https://example.com/callback';
    const result = await getUrlWithTokens(mockPassflow, url);

    expect(result).toBe(url);
  });

  it('should filter out falsy token values', async () => {
    const mockPassflow = {
      getTokens: vi.fn().mockResolvedValue({
        access_token: 'access123',
        refresh_token: '',
        id_token: null,
        scopes: undefined,
      }),
    } as unknown as Passflow;

    const url = 'https://example.com/callback';
    const result = await getUrlWithTokens(mockPassflow, url);

    expect(result).toContain('access_token=access123');
    expect(result).not.toContain('refresh_token');
    expect(result).not.toContain('id_token');
    expect(result).not.toContain('scopes');
  });

  it('should URL encode token values', async () => {
    const mockPassflow = {
      getTokens: vi.fn().mockResolvedValue({
        access_token: 'token with spaces',
        refresh_token: 'token&with=special',
        scopes: undefined,
      }),
    } as unknown as Passflow;

    const url = 'https://example.com/callback';
    const result = await getUrlWithTokens(mockPassflow, url);

    expect(result).toContain('access_token=token%20with%20spaces');
    expect(result).toContain('refresh_token=token%26with%3Dspecial');
  });

  it('should handle URLs with existing query parameters', async () => {
    const mockPassflow = {
      getTokens: vi.fn().mockResolvedValue({
        access_token: 'access123',
        scopes: undefined,
      }),
    } as unknown as Passflow;

    const url = 'https://example.com/callback?existing=param';
    const result = await getUrlWithTokens(mockPassflow, url);

    // Default format is 'hash' - tokens are added as URL fragment
    expect(result).toBe('https://example.com/callback?existing=param#access_token=access123');
  });

  it('should handle empty token object', async () => {
    const mockPassflow = {
      getTokens: vi.fn().mockResolvedValue({
        scopes: undefined,
      }),
    } as unknown as Passflow;

    const url = 'https://example.com/callback';
    const result = await getUrlWithTokens(mockPassflow, url);

    // Default format is 'hash' - empty hash fragment is added
    expect(result).toBe('https://example.com/callback#');
  });
});

describe('getUrlWithTokens with a hand-off', () => {
  const stored = () => ({
    access_token: 'access123',
    refresh_token: 'refresh456',
    id_token: 'id789',
    scopes: ['openid', 'offline'],
  });
  const passflowWith = (tokens: ReturnType<typeof stored>) =>
    ({ getTokens: vi.fn().mockResolvedValue(tokens) }) as unknown as Passflow;
  const fragment = (url: string) => new URLSearchParams(url.split('#')[1]);

  it('without a hand-off includes the refresh token as before', async () => {
    const result = await getUrlWithTokens(passflowWith(stored()), 'https://example.com/cb');
    expect(result).toBe('https://example.com/cb#access_token=access123&refresh_token=refresh456&id_token=id789');
  });

  it('drops the refresh token when the requested scopes have no offline', async () => {
    const result = await getUrlWithTokens(passflowWith(stored()), 'https://example.com/cb', 'hash', { scopes: ['openid'] });
    expect(fragment(result).has('refresh_token')).toBe(false);
    expect(fragment(result).get('access_token')).toBe('access123');
    expect(fragment(result).get('id_token')).toBe('id789');
  });

  it('drops the refresh token under the default hand-off scopes', async () => {
    const result = await getUrlWithTokens(passflowWith(stored()), 'https://example.com/cb', 'hash', {});
    expect(fragment(result).has('refresh_token')).toBe(false);
  });

  it.each(['offline', 'offline_access'])('keeps the refresh token when the requested scopes include %s', async (scope) => {
    const result = await getUrlWithTokens(passflowWith(stored()), 'https://example.com/cb', 'hash', {
      scopes: ['openid', scope],
    });
    expect(fragment(result).get('refresh_token')).toBe('refresh456');
  });

  it('appends the state, encoded', async () => {
    const result = await getUrlWithTokens(passflowWith(stored()), 'https://example.com/cb', 'hash', {
      scopes: ['openid'],
      state: 'a b&c=d',
    });
    expect(result).toContain('&state=a%20b%26c%3Dd');
    expect(fragment(result).get('state')).toBe('a b&c=d');
  });

  it('leaves the stored tokens untouched', async () => {
    const tokens = stored();
    await getUrlWithTokens(passflowWith(tokens), 'https://example.com/cb', 'hash', { scopes: ['openid'] });
    expect(tokens).toEqual(stored());
  });
});
