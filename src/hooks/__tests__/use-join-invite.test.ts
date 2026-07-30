import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useJoinInvite } from '../use-join-invite';

vi.mock('../use-passflow', () => ({
  usePassflow: vi.fn(),
}));

import { usePassflow } from '../use-passflow';

describe('useJoinInvite', () => {
  const mockPassflow = {
    joinInvitation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePassflow).mockReturnValue(mockPassflow as ReturnType<typeof usePassflow>);
  });

  it('accepts an invitation and clears loading state', async () => {
    mockPassflow.joinInvitation.mockResolvedValue(undefined);
    const { result } = renderHook(() => useJoinInvite());

    await act(async () => {
      expect(await result.current.fetch('invite-token')).toBe(true);
    });

    expect(mockPassflow.joinInvitation).toHaveBeenCalledWith('invite-token');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('exposes safe copy and restores actions after a failure', async () => {
    mockPassflow.joinInvitation.mockRejectedValue(new Error('token has invalid claims'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useJoinInvite());

    await act(async () => {
      expect(await result.current.fetch('invite-token')).toBe(false);
    });

    expect(consoleError).toHaveBeenCalledWith('[passflow] accepting invitation failed', expect.any(Error));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe("We couldn't accept this invitation. Try again.");
    expect(result.current.error).not.toContain('invalid claims');
    consoleError.mockRestore();
  });

  it('announces loading while the request is pending', async () => {
    let resolveJoin: (() => void) | undefined;
    mockPassflow.joinInvitation.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveJoin = resolve;
      }),
    );
    const { result } = renderHook(() => useJoinInvite());

    let request: Promise<boolean>;
    act(() => {
      request = result.current.fetch('invite-token');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    resolveJoin?.();
    await act(async () => request);
    expect(result.current.isLoading).toBe(false);
  });
});
