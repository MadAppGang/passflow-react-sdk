import type { TwoFactorTrustedDevice } from '@passflow/core';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrustedDevices } from '../use-trusted-devices';

vi.mock('../use-passflow', () => ({
  usePassflow: vi.fn(),
}));

import { usePassflow } from '../use-passflow';

const device = (id: string, current = false): TwoFactorTrustedDevice => ({
  id,
  user_agent: 'Mozilla/5.0',
  created_at: '2026-10-01T00:00:00Z',
  expires_at: '2026-11-01T00:00:00Z',
  current,
});

describe('useTrustedDevices', () => {
  const mockPassflow = {
    getTrustedDevices: vi.fn(),
    revokeTrustedDevice: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePassflow).mockReturnValue(mockPassflow as unknown as ReturnType<typeof usePassflow>);
  });

  it('lists the trusted devices on mount', async () => {
    mockPassflow.getTrustedDevices.mockResolvedValue([device('d1', true), device('d2')]);
    const { result } = renderHook(() => useTrustedDevices());

    await waitFor(() => expect(result.current.data.map((d) => d.id)).toEqual(['d1', 'd2']));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('revokes a device and drops it from the list', async () => {
    mockPassflow.getTrustedDevices.mockResolvedValue([device('d1', true), device('d2')]);
    mockPassflow.revokeTrustedDevice.mockResolvedValue(undefined);
    const { result } = renderHook(() => useTrustedDevices());
    await waitFor(() => expect(result.current.data).toHaveLength(2));

    await act(async () => {
      expect(await result.current.revoke('d2')).toBe(true);
    });

    expect(mockPassflow.revokeTrustedDevice).toHaveBeenCalledWith('d2');
    expect(result.current.data.map((d) => d.id)).toEqual(['d1']);
    expect(mockPassflow.getTrustedDevices).toHaveBeenCalledTimes(1);
  });

  it('keeps the device and reports the error when revoking fails', async () => {
    mockPassflow.getTrustedDevices.mockResolvedValue([device('d1')]);
    mockPassflow.revokeTrustedDevice.mockRejectedValue(new Error('trusted device not found'));
    const { result } = renderHook(() => useTrustedDevices());
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    await act(async () => {
      expect(await result.current.revoke('d1')).toBe(false);
    });

    expect(result.current.data.map((d) => d.id)).toEqual(['d1']);
    expect(result.current.isError).toBe(true);
    expect(result.current.errorMessage).toBe('trusted device not found');
    expect(result.current.isLoading).toBe(false);
  });

  it('reports a failed listing', async () => {
    mockPassflow.getTrustedDevices.mockRejectedValue(new Error('unauthorized'));
    const { result } = renderHook(() => useTrustedDevices());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBe('unauthorized');
    expect(result.current.data).toEqual([]);
  });

  it('refetches on demand', async () => {
    mockPassflow.getTrustedDevices.mockResolvedValueOnce([device('d1')]).mockResolvedValueOnce([device('d1'), device('d3')]);
    const { result } = renderHook(() => useTrustedDevices());
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data.map((d) => d.id)).toEqual(['d1', 'd3']);
  });
});
