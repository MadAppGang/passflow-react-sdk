import { renderHook } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../context/auth-context';
import { useAuth } from '../use-auth';

describe('useAuth', () => {
  const mockAuthValue: AuthContextValue = {
    isAuthenticated: vi.fn().mockReturnValue(true),
    logout: vi.fn(),
    isLoading: false,
    getTokens: vi.fn().mockResolvedValue({ tokens: {}, parsedTokens: {} }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = (value: AuthContextValue | undefined): FC<PropsWithChildren> => {
    return ({ children }) => <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

  describe('when used within AuthProvider', () => {
    it('returns the auth context value', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(mockAuthValue),
      });

      expect(result.current).toBe(mockAuthValue);
    });

    it('provides isAuthenticated function', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(mockAuthValue),
      });

      expect(result.current.isAuthenticated()).toBe(true);
      expect(mockAuthValue.isAuthenticated).toHaveBeenCalled();
    });

    it('provides logout function', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(mockAuthValue),
      });

      result.current.logout();
      expect(mockAuthValue.logout).toHaveBeenCalled();
    });

    it('provides isLoading state', () => {
      const loadingValue = { ...mockAuthValue, isLoading: true };

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(loadingValue),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('provides getTokens function', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(mockAuthValue),
      });

      await result.current.getTokens(true);
      expect(mockAuthValue.getTokens).toHaveBeenCalledWith(true);
    });
  });

  describe('when used outside AuthProvider', () => {
    it('throws an error', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('throws with undefined context value', () => {
      expect(() => {
        renderHook(() => useAuth(), {
          wrapper: createWrapper(undefined),
        });
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});
