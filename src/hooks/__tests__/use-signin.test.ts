import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSignIn } from '../use-signin';
import type {
  PassflowSignInPayload,
  PassflowPasskeyAuthenticateStartPayload,
  PassflowPasswordlessSignInPayload,
  PassflowPasswordlessResponse,
} from '@passflow/core';

// Mock the usePassflow hook
vi.mock('../use-passflow', () => ({
  usePassflow: vi.fn(),
}));

import { usePassflow } from '../use-passflow';

describe('useSignIn', () => {
  const mockPassflow = {
    signIn: vi.fn(),
    passkeyAuthenticate: vi.fn(),
    passwordlessSignIn: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (usePassflow as any).mockReturnValue(mockPassflow);
  });

  describe('password sign in', () => {
    it('should successfully sign in with password', async () => {
      mockPassflow.signIn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSignIn());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);

      const payload: PassflowSignInPayload = {
        email: 'test@example.com',
        password: 'password123',
      };

      let signInResult: boolean | string | PassflowPasswordlessResponse = false;

      await act(async () => {
        signInResult = await result.current.fetch(payload, 'password');
      });

      expect(signInResult).toBe(true);
      expect(mockPassflow.signIn).toHaveBeenCalledWith(payload);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe('');
    });

    it('should handle password sign in error', async () => {
      const errorMessage = 'Invalid credentials';
      mockPassflow.signIn.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSignIn());

      const payload: PassflowSignInPayload = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      let signInResult: boolean | string | PassflowPasswordlessResponse = true;

      await act(async () => {
        signInResult = await result.current.fetch(payload, 'password');
      });

      expect(signInResult).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during password sign in', async () => {
      let resolveSignIn: (value?: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockPassflow.signIn.mockReturnValue(signInPromise);

      const { result } = renderHook(() => useSignIn());

      const payload: PassflowSignInPayload = {
        email: 'test@example.com',
        password: 'password123',
      };

      let fetchPromise: Promise<boolean | string | PassflowPasswordlessResponse>;

      act(() => {
        fetchPromise = result.current.fetch(payload, 'password');
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the sign in
      act(() => {
        resolveSignIn!();
      });

      await act(async () => {
        await fetchPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('passkey authentication', () => {
    it('should successfully authenticate with passkey', async () => {
      mockPassflow.passkeyAuthenticate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSignIn());

      const payload: PassflowPasskeyAuthenticateStartPayload = {
        email: 'test@example.com',
      };

      let authResult: boolean | string | PassflowPasswordlessResponse = false;

      await act(async () => {
        authResult = await result.current.fetch(payload, 'passkey');
      });

      expect(authResult).toBe(true);
      expect(mockPassflow.passkeyAuthenticate).toHaveBeenCalledWith(payload);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should handle passkey authentication error', async () => {
      const errorMessage = 'Passkey not found';
      mockPassflow.passkeyAuthenticate.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSignIn());

      const payload: PassflowPasskeyAuthenticateStartPayload = {
        email: 'test@example.com',
      };

      let authResult: boolean | string | PassflowPasswordlessResponse = true;

      await act(async () => {
        authResult = await result.current.fetch(payload, 'passkey');
      });

      expect(authResult).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('passwordless sign in', () => {
    it('should successfully sign in with passwordless', async () => {
      const mockResponse: PassflowPasswordlessResponse = {
        message: 'Code sent',
      };
      mockPassflow.passwordlessSignIn.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSignIn());

      const payload: PassflowPasswordlessSignInPayload = {
        email: 'test@example.com',
      };

      let signInResult: boolean | string | PassflowPasswordlessResponse = false;

      await act(async () => {
        signInResult = await result.current.fetch(payload, 'passwordless');
      });

      expect(signInResult).toEqual(mockResponse);
      expect(mockPassflow.passwordlessSignIn).toHaveBeenCalledWith(payload);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should handle passwordless sign in error', async () => {
      const errorMessage = 'Failed to send code';
      mockPassflow.passwordlessSignIn.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSignIn());

      const payload: PassflowPasswordlessSignInPayload = {
        email: 'test@example.com',
      };

      let signInResult: boolean | string | PassflowPasswordlessResponse = true;

      await act(async () => {
        signInResult = await result.current.fetch(payload, 'passwordless');
      });

      expect(signInResult).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('reset function', () => {
    it('should reset error state', async () => {
      const errorMessage = 'Test error';
      mockPassflow.signIn.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSignIn());

      // Trigger an error
      await act(async () => {
        await result.current.fetch({ email: 'test@example.com', password: 'test' }, 'password');
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(errorMessage);

      // Reset the state
      act(() => {
        result.current.reset();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe('');
      expect(result.current.isLoading).toBe(false);
    });
  });
});
