import { renderHook } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialState, PassflowContext, type PassflowContextType } from '../../context/passflow-context';
import { useProvider } from '../use-provider';

// Mock window.location.origin
const mockOrigin = 'https://app.example.com';
Object.defineProperty(window, 'location', {
  value: {
    origin: mockOrigin,
  },
  writable: true,
});

describe('useProvider', () => {
  const createMockPassflow = () => ({
    federatedAuthWithPopup: vi.fn(),
    federatedAuthWithRedirect: vi.fn(),
  });

  let mockPassflow: ReturnType<typeof createMockPassflow>;
  let mockContext: PassflowContextType;

  beforeEach(() => {
    mockPassflow = createMockPassflow();
    mockContext = {
      state: {
        ...initialState,
        scopes: ['openid', 'profile'],
      },
      dispatch: vi.fn(),
      passflow: mockPassflow as any,
    };
    vi.clearAllMocks();
  });

  const createWrapper =
    (contextValue: PassflowContextType): FC<PropsWithChildren> =>
    ({ children }) => <PassflowContext.Provider value={contextValue}>{children}</PassflowContext.Provider>;

  describe('federatedWithPopup', () => {
    it('calls federatedAuthWithPopup with correct provider', () => {
      const { result } = renderHook(() => useProvider(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('google' as any);

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
        }),
      );
    });

    it('includes redirect_url when provided as full URL', () => {
      const { result } = renderHook(() => useProvider('https://callback.example.com/auth'), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('google' as any);

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_url: 'https://callback.example.com/auth',
        }),
      );
    });

    it('prepends origin to relative redirect_url with leading slash', () => {
      const { result } = renderHook(() => useProvider('/callback'), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('google' as any);

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_url: `${mockOrigin}/callback`,
        }),
      );
    });

    it('prepends origin to relative redirect_url without leading slash', () => {
      const { result } = renderHook(() => useProvider('callback'), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('google' as any);

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_url: `${mockOrigin}/callback`,
        }),
      );
    });

    it('includes invite_token when provided', () => {
      const { result } = renderHook(() => useProvider(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('google' as any, 'invite-123');

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          invite_token: 'invite-123',
        }),
      );
    });

    it('includes scopes from context', () => {
      const { result } = renderHook(() => useProvider(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('google' as any);

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['openid', 'profile'],
        }),
      );
    });

    it('includes create_tenant when specified', () => {
      const { result } = renderHook(() => useProvider(undefined, true), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('github' as any);

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          create_tenant: true,
        }),
      );
    });

    it('works with different providers', () => {
      const providers = ['google', 'github', 'microsoft', 'apple'] as const;

      const { result } = renderHook(() => useProvider(), {
        wrapper: createWrapper(mockContext),
      });

      for (const provider of providers) {
        result.current.federatedWithPopup(provider as unknown as FederatedProviderType);
      }

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledTimes(4);
    });
  });

  describe('federatedWithRedirect', () => {
    it('calls federatedAuthWithRedirect with correct provider', () => {
      const { result } = renderHook(() => useProvider(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithRedirect('google' as any);

      expect(mockPassflow.federatedAuthWithRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
        }),
      );
    });

    it('includes redirect_url when provided', () => {
      const { result } = renderHook(() => useProvider('https://callback.example.com'), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithRedirect('github' as any);

      expect(mockPassflow.federatedAuthWithRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_url: 'https://callback.example.com',
        }),
      );
    });

    it('includes invite_token when provided', () => {
      const { result } = renderHook(() => useProvider(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithRedirect('microsoft' as any, 'invite-456');

      expect(mockPassflow.federatedAuthWithRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          invite_token: 'invite-456',
        }),
      );
    });

    it('includes create_tenant when specified', () => {
      const { result } = renderHook(() => useProvider(undefined, true), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithRedirect('apple' as any);

      expect(mockPassflow.federatedAuthWithRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          create_tenant: true,
        }),
      );
    });
  });

  describe('hosted login', () => {
    const signInScopes = ['openid', 'profile', 'id', 'offline'];
    const hostedContext = (state: Partial<PassflowContextType['state']>): PassflowContextType => ({
      ...mockContext,
      state: { ...initialState, scopes: signInScopes, ...state },
    });
    const payloadOf = (context: PassflowContextType) => {
      const { result } = renderHook(() => useProvider(), { wrapper: createWrapper(context) });
      result.current.federatedWithRedirect('google' as any);
      return mockPassflow.federatedAuthWithRedirect.mock.calls[0][0];
    };

    afterEach(() => {
      (window.location as { search?: string }).search = '';
    });

    it('carries the parent sign-in from the URL', () => {
      (window.location as { search?: string }).search = '?appid=app-1&parent_challenge_id=parent-1';

      expect(payloadOf(mockContext).parent_challenge_id).toBe('parent-1');
    });

    it('Simple app with a hand-off: exactly the hand-off scopes, and the app state', () => {
      const payload = payloadOf(
        hostedContext({
          appSettings: { pkce_enabled: false } as never,
          handOff: { scopes: ['openid', 'email'], state: 'app-state' },
        }),
      );

      expect(payload.scopes).toEqual(['openid', 'email']);
      expect(payload.state).toBe('app-state');
    });

    it('Simple app with a hand-off and no requested scopes: the default hand-off scopes', () => {
      const payload = payloadOf(hostedContext({ appSettings: { pkce_enabled: false } as never, handOff: {} }));

      expect(payload.scopes).toEqual(['openid', 'profile', 'id']);
    });

    it('SDK app with a hand-off: the sign-in scopes, and no state', () => {
      const payload = payloadOf(
        hostedContext({
          appSettings: { pkce_enabled: true } as never,
          handOff: { scopes: ['openid', 'email'], state: 'app-state' },
        }),
      );

      expect(payload.scopes).toEqual(signInScopes);
      expect(Object.keys(payload)).not.toContain('state');
    });

    it('mode not loaded yet, with a hand-off: the hand-off scopes, and no state', () => {
      const payload = payloadOf(hostedContext({ appSettings: null, handOff: { scopes: ['openid'], state: 'app-state' } }));

      expect(payload.scopes).toEqual(['openid']);
      expect(Object.keys(payload)).not.toContain('state');
    });

    it('without a hand-off: the state scopes, as before', () => {
      const payload = payloadOf(hostedContext({ appSettings: { pkce_enabled: false } as never }));

      expect(payload.scopes).toEqual(signInScopes);
      expect(Object.keys(payload)).not.toContain('state');
    });
  });

  describe('edge cases', () => {
    it('handles empty redirect_url', () => {
      const { result } = renderHook(() => useProvider(''), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('google' as any);

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_url: '',
        }),
      );
    });

    it('handles undefined scopes in context', () => {
      const contextWithoutScopes = {
        ...mockContext,
        state: { ...initialState, scopes: undefined },
      };

      const { result } = renderHook(() => useProvider(), {
        wrapper: createWrapper(contextWithoutScopes),
      });

      result.current.federatedWithPopup('google' as any);

      expect(mockPassflow.federatedAuthWithPopup.mock.calls[0][0]).not.toHaveProperty('scopes');
    });

    it('sends no keys for values it does not have', () => {
      const contextWithoutScopes = { ...mockContext, state: { ...initialState, scopes: undefined } };
      const { result } = renderHook(() => useProvider(), { wrapper: createWrapper(contextWithoutScopes) });

      result.current.federatedWithRedirect('google' as any);

      const payload = mockPassflow.federatedAuthWithRedirect.mock.calls[0][0];
      expect(Object.keys(payload)).not.toContain('scopes');
      expect(Object.keys(payload)).not.toContain('state');
      expect(Object.keys(payload)).not.toContain('parent_challenge_id');
    });

    it('handles undefined invite_token', () => {
      const { result } = renderHook(() => useProvider(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('google' as any, undefined);

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          invite_token: undefined,
        }),
      );
    });
  });
});
