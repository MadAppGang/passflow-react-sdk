import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ConsentInfo, useConsent } from '../use-consent';

const info: ConsentInfo = {
  client_id: 'acme-notes-client',
  app_name: 'Acme Notes',
  app_logo_url: '',
  requested_scopes: ['openid', 'profile', 'email'],
  scope_metadata: [{ scope: 'profile', label: 'View your profile', description: 'Your name and picture.' }],
  redirect_uri: 'https://acme.test/callback',
  state: 'state-1',
  response_mode: 'query',
  first_party: false,
  csrf_token: 'csrf-1',
};

const reply = (body: unknown, status = 200): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

const deferred = () => {
  let resolve: (value: Response) => void = () => undefined;
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const unparseable = (status: number): Response =>
  ({
    ok: false,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token <');
    },
  }) as unknown as Response;

describe('useConsent', () => {
  const originalLocation = window.location;
  const fetchMock = vi.fn();

  const stubLocation = (search: string) => {
    Object.defineProperty(window, 'location', { value: { search, href: '' }, writable: true });
  };

  const mountReady = async () => {
    fetchMock.mockResolvedValueOnce(reply(info));
    const hook = renderHook(() => useConsent());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    return hook;
  };

  const lastPost = () => {
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    return { url, init, body: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> };
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    stubLocation('?parent_challenge_id=abc');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });

  describe('loading the staged request', () => {
    it('is invalid without a parent_challenge_id and never calls the server', async () => {
      stubLocation('');
      const { result } = renderHook(() => useConsent());

      await waitFor(() => expect(result.current.status).toBe('invalid'));
      expect(result.current.error?.message).toBe('Invalid consent link');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('reads the request by id, same-origin and without credentials in a header', async () => {
      stubLocation('?parent_challenge_id=a/b c');
      fetchMock.mockResolvedValueOnce(reply(info));
      const { result } = renderHook(() => useConsent());

      await waitFor(() => expect(result.current.status).toBe('ready'));
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/oidc/requests/a%2Fb%20c');
      expect(init.credentials).toBe('same-origin');
      expect(init.method).toBe('GET');
      expect(init.headers).not.toHaveProperty('Authorization');
    });

    it('starts with every requested scope granted', async () => {
      const { result } = await mountReady();

      expect(result.current.info).toEqual(info);
      expect(result.current.grantedScopes).toEqual(['openid', 'profile', 'email']);
    });

    it('turns a rejected id into a terminal invalid state with the server description', async () => {
      fetchMock.mockResolvedValueOnce(reply({ error: 'not_found', error_description: 'This request has expired.' }, 404));
      const { result } = renderHook(() => useConsent());

      await waitFor(() => expect(result.current.status).toBe('invalid'));
      expect(result.current.error).toEqual({
        message: 'Consent request unavailable',
        description: 'This request has expired.',
      });
    });

    it('distinguishes a server fault and survives a non-JSON error body', async () => {
      fetchMock.mockResolvedValueOnce(unparseable(502));
      const { result } = renderHook(() => useConsent());

      await waitFor(() => expect(result.current.status).toBe('invalid'));
      expect(result.current.error?.message).toBe('Something went wrong');
      expect(result.current.error?.description).toContain('We could not load this consent request');
    });

    it('reports a network failure as a connection error', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const { result } = renderHook(() => useConsent());

      await waitFor(() => expect(result.current.status).toBe('invalid'));
      expect(result.current.error).toEqual({ message: 'Connection error', description: 'Failed to fetch' });
    });

    it('ignores a response that arrives after unmount', async () => {
      const request = deferred();
      fetchMock.mockReturnValueOnce(request.promise);
      const { result, unmount } = renderHook(() => useConsent());

      unmount();
      await act(async () => request.resolve(reply(info)));

      expect(result.current.status).toBe('loading');
      expect(result.current.info).toBeNull();
    });
  });

  describe('scopes', () => {
    it('toggles a scope off and on while keeping the requested order', async () => {
      const { result } = await mountReady();

      act(() => result.current.toggleScope('profile'));
      expect(result.current.grantedScopes).toEqual(['openid', 'email']);

      act(() => result.current.toggleScope('profile'));
      expect(result.current.grantedScopes).toEqual(['openid', 'profile', 'email']);
    });

    it('falls back to the bare scope when the server sent no metadata for it', async () => {
      const { result } = await mountReady();

      expect(result.current.scopeMetadata('profile').label).toBe('View your profile');
      expect(result.current.scopeMetadata('email')).toEqual({ scope: 'email', label: 'email', description: '' });
    });

    it('clears a stale error when the selection changes', async () => {
      const { result } = await mountReady();
      fetchMock.mockResolvedValueOnce(reply({ error_description: 'Nope.' }, 400));
      await act(async () => result.current.allow());
      expect(result.current.error?.message).toBe('Nope.');

      act(() => result.current.toggleScope('email'));
      expect(result.current.error).toBeNull();
    });
  });

  describe('allow', () => {
    it('submits only the scopes still switched on, carrying the CSRF token', async () => {
      const { result } = await mountReady();
      act(() => result.current.toggleScope('profile'));
      fetchMock.mockResolvedValueOnce(reply({ kind: 'redirect', url: 'https://acme.test/callback?code=1' }));

      await act(async () => result.current.allow());

      const post = lastPost();
      expect(post.url).toBe('/oidc/requests/abc/consent');
      expect(post.init.method).toBe('POST');
      expect(post.init.credentials).toBe('same-origin');
      expect(post.headers['X-Passflow-CSRF']).toBe('csrf-1');
      expect(post.body).toEqual({ granted_scopes: ['openid', 'email'] });
    });

    it('follows a redirect decision', async () => {
      const { result } = await mountReady();
      fetchMock.mockResolvedValueOnce(reply({ kind: 'redirect', url: 'https://acme.test/callback?code=1' }));

      await act(async () => result.current.allow());

      expect(result.current.status).toBe('redirecting');
      expect(window.location.href).toBe('https://acme.test/callback?code=1');
    });

    it('executes a form_post decision as a hidden POST form', async () => {
      const { result } = await mountReady();
      let submitted: HTMLFormElement | undefined;
      vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
        submitted = this;
      });
      fetchMock.mockResolvedValueOnce(
        reply({ kind: 'form_post', action: 'https://acme.test/callback', fields: { code: 'c-1', state: 'state-1' } }),
      );

      await act(async () => result.current.allow());

      expect(result.current.status).toBe('redirecting');
      expect(submitted?.method).toBe('post');
      expect(submitted?.action).toBe('https://acme.test/callback');
      expect(submitted?.style.display).toBe('none');
      const fields = Array.from(submitted?.querySelectorAll('input') ?? []).map((input) => [input.name, input.value]);
      expect(fields).toEqual([
        ['code', 'c-1'],
        ['state', 'state-1'],
      ]);
      for (const input of submitted?.querySelectorAll('input') ?? []) expect(input.type).toBe('hidden');
    });

    it('is working while the decision is in flight and clears the previous error', async () => {
      const { result } = await mountReady();
      const request = deferred();
      fetchMock.mockReturnValueOnce(request.promise);

      let pending: Promise<void> = Promise.resolve();
      act(() => {
        pending = result.current.allow();
      });
      expect(result.current.status).toBe('working');
      expect(result.current.error).toBeNull();

      await act(async () => {
        request.resolve(reply({ kind: 'redirect', url: 'https://acme.test/callback' }));
        await pending;
      });
      expect(result.current.status).toBe('redirecting');
    });

    it('returns to ready with the server message so the user can retry', async () => {
      const { result } = await mountReady();
      fetchMock.mockResolvedValueOnce(reply({ error_description: 'The CSRF token is invalid.' }, 403));

      await act(async () => result.current.allow());

      expect(result.current.status).toBe('ready');
      expect(result.current.error).toEqual({ message: 'The CSRF token is invalid.' });
      expect(window.location.href).toBe('');
    });

    it('falls back to generic copy when the failure has no description', async () => {
      const { result } = await mountReady();
      fetchMock.mockResolvedValueOnce(unparseable(500));

      await act(async () => result.current.allow());

      expect(result.current.status).toBe('ready');
      expect(result.current.error?.message).toBe('Could not submit your decision. Please try again.');
    });

    it('returns to ready when the network fails mid-decision', async () => {
      const { result } = await mountReady();
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await act(async () => result.current.allow());

      expect(result.current.status).toBe('ready');
      expect(result.current.error?.message).toBe('Failed to fetch');
    });

    it('does not follow an unrecognised decision kind', async () => {
      const { result } = await mountReady();
      fetchMock.mockResolvedValueOnce(reply({ kind: 'teleport' }));

      await act(async () => result.current.allow());

      expect(result.current.status).toBe('ready');
      expect(result.current.error?.message).toBe('Unexpected response from server.');
      expect(window.location.href).toBe('');
    });
  });

  describe('deny', () => {
    it('refuses with access_denied and the CSRF token, ignoring the selected scopes', async () => {
      const { result } = await mountReady();
      act(() => result.current.toggleScope('profile'));
      fetchMock.mockResolvedValueOnce(reply({ kind: 'redirect', url: 'https://acme.test/callback?error=access_denied' }));

      await act(async () => result.current.deny());

      const post = lastPost();
      expect(post.url).toBe('/oidc/requests/abc/reject');
      expect(post.headers['X-Passflow-CSRF']).toBe('csrf-1');
      expect(post.body).toEqual({ error: 'access_denied', error_description: 'User denied consent' });
      expect(result.current.status).toBe('redirecting');
      expect(window.location.href).toBe('https://acme.test/callback?error=access_denied');
    });
  });

  it('does nothing when a decision is attempted before the request has loaded', async () => {
    fetchMock.mockReturnValueOnce(new Promise<Response>(() => undefined));
    const { result } = renderHook(() => useConsent());

    await act(async () => result.current.allow());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('loading');
  });
});
