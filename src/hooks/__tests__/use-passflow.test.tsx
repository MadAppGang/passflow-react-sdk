import { renderHook } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PassflowContext, initialState, type PassflowContextType } from '../../context/passflow-context';
import { usePassflow } from '../use-passflow';

describe('usePassflow', () => {
  const createMockPassflow = () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    logOut: vi.fn(),
    isAuthenticated: vi.fn().mockReturnValue(false),
    getTokens: vi.fn(),
    getParsedTokens: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    passwordlessSignIn: vi.fn(),
    passkeyAuthenticate: vi.fn(),
  });

  let mockPassflow: ReturnType<typeof createMockPassflow>;
  let mockContext: PassflowContextType;

  beforeEach(() => {
    mockPassflow = createMockPassflow();
    mockContext = {
      state: initialState,
      dispatch: vi.fn(),
      passflow: mockPassflow as any,
    };
  });

  const createWrapper = (value: PassflowContextType | undefined): FC<PropsWithChildren> => {
    return ({ children }) => <PassflowContext.Provider value={value}>{children}</PassflowContext.Provider>;
  };

  describe('when used within PassflowProvider', () => {
    it('returns the passflow instance', () => {
      const { result } = renderHook(() => usePassflow(), {
        wrapper: createWrapper(mockContext),
      });

      expect(result.current).toBe(mockPassflow);
    });

    it('provides signIn method', () => {
      const { result } = renderHook(() => usePassflow(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.signIn({ email: 'test@example.com', password: 'password' });
      expect(mockPassflow.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('provides signUp method', () => {
      const { result } = renderHook(() => usePassflow(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.signUp({ email: 'test@example.com', password: 'password' });
      expect(mockPassflow.signUp).toHaveBeenCalled();
    });

    it('provides logOut method', () => {
      const { result } = renderHook(() => usePassflow(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.logOut();
      expect(mockPassflow.logOut).toHaveBeenCalled();
    });

    it('provides isAuthenticated method', () => {
      mockPassflow.isAuthenticated.mockReturnValue(true);

      const { result } = renderHook(() => usePassflow(), {
        wrapper: createWrapper(mockContext),
      });

      expect(result.current.isAuthenticated()).toBe(true);
    });

    it('provides getTokens method', () => {
      const { result } = renderHook(() => usePassflow(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.getTokens(true);
      expect(mockPassflow.getTokens).toHaveBeenCalledWith(true);
    });

    it('provides forgotPassword method', () => {
      const { result } = renderHook(() => usePassflow(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.forgotPassword({ email: 'test@example.com' });
      expect(mockPassflow.forgotPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });

    it('provides resetPassword method', () => {
      const { result } = renderHook(() => usePassflow(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.resetPassword({ token: 'reset-token', password: 'new-password' });
      expect(mockPassflow.resetPassword).toHaveBeenCalled();
    });

    it('provides passwordlessSignIn method', () => {
      const { result } = renderHook(() => usePassflow(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.passwordlessSignIn({ email: 'test@example.com' });
      expect(mockPassflow.passwordlessSignIn).toHaveBeenCalled();
    });

    it('provides passkeyAuthenticate method', () => {
      const { result } = renderHook(() => usePassflow(), {
        wrapper: createWrapper(mockContext),
      });

      result.current.passkeyAuthenticate({});
      expect(mockPassflow.passkeyAuthenticate).toHaveBeenCalled();
    });
  });

  describe('when used outside PassflowProvider', () => {
    it('throws an error', () => {
      expect(() => {
        renderHook(() => usePassflow());
      }).toThrow('useAuth must be used within an PassflowProvider');
    });

    it('throws with undefined context value', () => {
      expect(() => {
        renderHook(() => usePassflow(), {
          wrapper: createWrapper(undefined),
        });
      }).toThrow('useAuth must be used within an PassflowProvider');
    });
  });
});
