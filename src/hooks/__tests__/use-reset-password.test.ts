import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResetPassword } from '../use-reset-password';

// Mock the usePassflow hook
vi.mock('../use-passflow', () => ({
  usePassflow: vi.fn(),
}));

import { usePassflow } from '../use-passflow';

describe('useResetPassword', () => {
  const mockPassflow = {
    resetPassword: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (usePassflow as any).mockReturnValue(mockPassflow);
  });

  for (const kind of ['code', 'link'] as const) {
    it(`REQ-20 returns false with the public ${kind} step instead of authenticating`, async () => {
      const message = kind === 'code' ? 'We sent a code.' : 'Follow the link in your email.';
      mockPassflow.resetPassword.mockResolvedValue({
        email_verification_required: true,
        message,
        ...(kind === 'code' ? { challenge_id: 'reset-challenge' } : {}),
      });
      const { result } = renderHook(() => useResetPassword());
      expect(result.current.emailCode.step).toEqual({ kind: 'none' });
      let completed: boolean | undefined;
      await act(async () => {
        completed = await result.current.fetch('Str0ngPassword!724');
      });

      expect(completed).toBe(false);
      expect(result.current.emailCode.step).toEqual(
        kind === 'code' ? { kind, challengeId: 'reset-challenge', message } : { kind, message },
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe('');

      // Navigation/cancellation of the screen is exercised in Playwright, not via private hook state.
    });
  }

  it('should successfully reset password', async () => {
    mockPassflow.resetPassword.mockResolvedValue(undefined);

    const { result } = renderHook(() => useResetPassword());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);

    const newPassword = 'newSecurePassword123';

    let resetResult = false;

    await act(async () => {
      resetResult = await result.current.fetch(newPassword);
    });

    expect(resetResult).toBe(true);
    expect(mockPassflow.resetPassword).toHaveBeenCalledWith(newPassword);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('should handle reset password error', async () => {
    const errorMessage = 'Invalid or expired reset token';
    mockPassflow.resetPassword.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useResetPassword());

    const newPassword = 'newPassword123';

    let resetResult = true;

    await act(async () => {
      resetResult = await result.current.fetch(newPassword);
    });

    expect(resetResult).toBe(false);
    expect(result.current.isError).toBe(true);
    // REQ-17: an unlisted raw error is not user-facing copy.
    expect(result.current.error).toBe("We couldn't save your password. Try again.");
    // REQ-17: failed saves must not leave the caller in a permanently loading state.
    expect(result.current.isLoading).toBe(false);
  });

  it('should set loading state during password reset', async () => {
    let resolveReset: (value?: any) => void;
    const resetPromise = new Promise((resolve) => {
      resolveReset = resolve;
    });
    mockPassflow.resetPassword.mockReturnValue(resetPromise);

    const { result } = renderHook(() => useResetPassword());

    const newPassword = 'newPassword123';

    let fetchPromise: Promise<boolean>;

    act(() => {
      fetchPromise = result.current.fetch(newPassword);
    });

    // Should be loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Resolve the reset
    act(() => {
      resolveReset?.();
    });

    await act(async () => {
      await fetchPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should reset error state', async () => {
    const errorMessage = 'Test error';
    mockPassflow.resetPassword.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useResetPassword());

    // Trigger an error
    await act(async () => {
      await result.current.fetch('newPassword123');
    });

    expect(result.current.isError).toBe(true);
    // REQ-17: an unlisted raw error is not user-facing copy.
    expect(result.current.error).toBe("We couldn't save your password. Try again.");

    // Reset the state
    act(() => {
      result.current.reset();
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle password validation errors', async () => {
    const errorMessage = 'Password does not meet requirements';
    mockPassflow.resetPassword.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useResetPassword());

    const weakPassword = '123';

    let resetResult = true;

    await act(async () => {
      resetResult = await result.current.fetch(weakPassword);
    });

    expect(resetResult).toBe(false);
    expect(result.current.isError).toBe(true);
    // REQ-17: an unlisted raw error is not user-facing copy.
    expect(result.current.error).toBe("We couldn't save your password. Try again.");
  });

  it('should handle network errors during password reset', async () => {
    const errorMessage = 'Network error';
    mockPassflow.resetPassword.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useResetPassword());

    let resetResult = true;

    await act(async () => {
      resetResult = await result.current.fetch('newPassword123');
    });

    expect(resetResult).toBe(false);
    expect(result.current.isError).toBe(true);
    // REQ-17: an unlisted raw error is not user-facing copy.
    expect(result.current.error).toBe("We couldn't save your password. Try again.");
  });
});
