import { verificationRequestErrorMessage } from '@/utils';
import type { PassflowPasswordlessSignInCompletePayload } from '@passflow/core';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePasswordlessComplete } from '../use-passwordless-complete';

vi.mock('../use-passflow', () => ({
  usePassflow: vi.fn(),
}));

import { usePassflow } from '../use-passflow';

const payload: PassflowPasswordlessSignInCompletePayload = {
  challenge_id: 'challenge-id',
  challenge_type: 'otp',
  otp: '123456',
};

describe('usePasswordlessComplete', () => {
  const mockPassflow = {
    passwordlessSignInComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePassflow).mockReturnValue(mockPassflow as ReturnType<typeof usePassflow>);
  });

  it('returns the verification response and clears loading state', async () => {
    const response = { redirect_url: 'https://example.com/complete' };
    mockPassflow.passwordlessSignInComplete.mockResolvedValue(response);
    const { result } = renderHook(() => usePasswordlessComplete());

    await act(async () => {
      expect(await result.current.fetch(payload)).toEqual(response);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('logs raw failures but exposes safe verification copy', async () => {
    mockPassflow.passwordlessSignInComplete.mockRejectedValue(new Error('challenge not found!'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => usePasswordlessComplete());

    await act(async () => {
      expect(await result.current.fetch(payload)).toBeNull();
    });

    expect(consoleError).toHaveBeenCalledWith('[passflow] passwordless verification failed', expect.any(Error));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(verificationRequestErrorMessage);
    expect(result.current.error).not.toContain('challenge not found');
    consoleError.mockRestore();
  });

  it('announces loading while verification is pending', async () => {
    let resolveVerification: ((value: { redirect_url: string }) => void) | undefined;
    mockPassflow.passwordlessSignInComplete.mockReturnValue(
      new Promise((resolve) => {
        resolveVerification = resolve;
      }),
    );
    const { result } = renderHook(() => usePasswordlessComplete());

    let request: ReturnType<typeof result.current.fetch>;
    act(() => {
      request = result.current.fetch(payload);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    resolveVerification?.({ redirect_url: 'https://example.com/complete' });
    await act(async () => request);
    expect(result.current.isLoading).toBe(false);
  });
});
