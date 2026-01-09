import { renderHook } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PassflowContext, initialState, type PassflowContextType } from '../../context/passflow-context';
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

      result.current.federatedWithPopup('google');

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

      result.current.federatedWithPopup('google');

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

      result.current.federatedWithPopup('google');

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

      result.current.federatedWithPopup('google');

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

      result.current.federatedWithPopup('google', 'invite-123');

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

      result.current.federatedWithPopup('google');

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

      result.current.federatedWithPopup('github');

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

      providers.forEach((provider) => {
        result.current.federatedWithPopup(provider as any);
      });

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledTimes(4);
    });
  });

  describe('federatedWithRedirect', () => {
    it('calls federatedAuthWithRedirect with correct provider', () => {
      const { result } = renderHook(() => useProvider(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithRedirect('google');

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

      result.current.federatedWithRedirect('github');

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

      result.current.federatedWithRedirect('microsoft', 'invite-456');

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

      result.current.federatedWithRedirect('apple');

      expect(mockPassflow.federatedAuthWithRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          create_tenant: true,
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty redirect_url', () => {
      const { result } = renderHook(() => useProvider(''), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('google');

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

      result.current.federatedWithPopup('google');

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: undefined,
        }),
      );
    });

    it('handles undefined invite_token', () => {
      const { result } = renderHook(() => useProvider(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.federatedWithPopup('google', undefined);

      expect(mockPassflow.federatedAuthWithPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          invite_token: undefined,
        }),
      );
    });
  });
});
