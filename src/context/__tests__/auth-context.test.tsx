import { act, renderHook, waitFor } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { useContext } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, AuthProvider } from '../auth-context';
import { PassflowContext, initialState, type PassflowContextType } from '../passflow-context';

// Create a mock passflow instance
const createMockPassflow = () => ({
  isAuthenticated: vi.fn().mockReturnValue(false),
  getTokens: vi.fn().mockResolvedValue({ access_token: 'test-token' }),
  getParsedTokens: vi.fn().mockReturnValue({ sub: 'user-123' }),
  logOut: vi.fn().mockResolvedValue(undefined),
});

describe('AuthProvider', () => {
  let mockPassflow: ReturnType<typeof createMockPassflow>;
  let mockPassflowContext: PassflowContextType;

  beforeEach(() => {
    mockPassflow = createMockPassflow();
    mockPassflowContext = {
      state: initialState,
      dispatch: vi.fn(),
      passflow: mockPassflow as any,
    };
  });

  const createWrapper = (): FC<PropsWithChildren> => {
    return ({ children }) => (
      <PassflowContext.Provider value={mockPassflowContext}>
        <AuthProvider>{children}</AuthProvider>
      </PassflowContext.Provider>
    );
  };

  const useAuthContext = () => useContext(AuthContext);

  describe('isAuthenticated', () => {
    it('returns false when user is not authenticated', () => {
      mockPassflow.isAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current?.isAuthenticated()).toBe(false);
      expect(mockPassflow.isAuthenticated).toHaveBeenCalled();
    });

    it('returns true when user is authenticated', () => {
      mockPassflow.isAuthenticated.mockReturnValue(true);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current?.isAuthenticated()).toBe(true);
    });
  });

  describe('getTokens', () => {
    it('returns tokens and parsed tokens on success', async () => {
      const mockTokens = { access_token: 'access-123', refresh_token: 'refresh-456' };
      const mockParsedTokens = { sub: 'user-123', email: 'test@example.com' };

      mockPassflow.getTokens.mockResolvedValue(mockTokens);
      mockPassflow.getParsedTokens.mockReturnValue(mockParsedTokens);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      let tokenResult: any;
      await act(async () => {
        tokenResult = await result.current?.getTokens(false);
      });

      expect(tokenResult).toEqual({
        tokens: mockTokens,
        parsedTokens: mockParsedTokens,
      });
      expect(mockPassflow.getTokens).toHaveBeenCalledWith(false);
    });

    it('calls getTokens with doRefresh=true', async () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current?.getTokens(true);
      });

      expect(mockPassflow.getTokens).toHaveBeenCalledWith(true);
    });

    it('sets isLoading during token fetch', async () => {
      let resolveGetTokens: (value: any) => void;
      mockPassflow.getTokens.mockReturnValue(
        new Promise((resolve) => {
          resolveGetTokens = resolve;
        }),
      );

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current?.isLoading).toBe(false);

      let tokenPromise: Promise<any>;
      act(() => {
        tokenPromise = result.current!.getTokens(false);
      });

      await waitFor(() => {
        expect(result.current?.isLoading).toBe(true);
      });

      await act(async () => {
        resolveGetTokens!({ access_token: 'test' });
        await tokenPromise;
      });

      expect(result.current?.isLoading).toBe(false);
    });

    it('returns undefined tokens on error', async () => {
      mockPassflow.getTokens.mockRejectedValue(new Error('Token error'));

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      let tokenResult: any;
      await act(async () => {
        tokenResult = await result.current?.getTokens(false);
      });

      expect(tokenResult).toEqual({
        tokens: undefined,
        parsedTokens: undefined,
      });
    });

    it('resets isLoading after error', async () => {
      mockPassflow.getTokens.mockRejectedValue(new Error('Token error'));

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current?.getTokens(false);
      });

      expect(result.current?.isLoading).toBe(false);
    });

    it('returns undefined parsedTokens when tokens are null', async () => {
      mockPassflow.getTokens.mockResolvedValue(null);

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      let tokenResult: any;
      await act(async () => {
        tokenResult = await result.current?.getTokens(false);
      });

      expect(tokenResult).toEqual({
        tokens: null,
        parsedTokens: undefined,
      });
      expect(mockPassflow.getParsedTokens).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('calls passflow.logOut', async () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current?.logout();
      });

      expect(mockPassflow.logOut).toHaveBeenCalled();
    });
  });

  describe('context value', () => {
    it('provides all expected properties', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('getTokens');
    });

    it('provides undefined when not wrapped in provider', () => {
      const { result } = renderHook(() => useAuthContext());

      expect(result.current).toBeUndefined();
    });
  });
});
