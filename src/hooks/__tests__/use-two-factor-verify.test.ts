import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTwoFactorVerify } from '../use-two-factor-verify';

vi.mock('../use-passflow', () => ({
  usePassflow: vi.fn(),
}));

import { usePassflow } from '../use-passflow';

describe('useTwoFactorVerify', () => {
  const mockPassflow = {
    isTwoFactorVerificationRequired: vi.fn(),
    verifyTwoFactor: vi.fn(),
    useTwoFactorRecoveryCode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePassflow).mockReturnValue(mockPassflow as unknown as ReturnType<typeof usePassflow>);
    mockPassflow.verifyTwoFactor.mockResolvedValue({ success: true });
    mockPassflow.useTwoFactorRecoveryCode.mockResolvedValue({ success: true, remaining_recovery_codes: 9 });
  });

  it('hands the trust option to core with the code', async () => {
    const { result } = renderHook(() => useTwoFactorVerify());

    await act(async () => {
      await result.current.verify('123456', { trustDevice: true });
    });

    expect(mockPassflow.verifyTwoFactor).toHaveBeenCalledWith('123456', { trustDevice: true });
  });

  it('hands the trust option to core with a recovery code', async () => {
    const { result } = renderHook(() => useTwoFactorVerify());

    await act(async () => {
      await result.current.useRecoveryCode('ABCD-EFGH-IJKL', { trustDevice: true });
    });

    expect(mockPassflow.useTwoFactorRecoveryCode).toHaveBeenCalledWith('ABCD-EFGH-IJKL', { trustDevice: true });
  });

  it('sends no option when none is given', async () => {
    const { result } = renderHook(() => useTwoFactorVerify());

    await act(async () => {
      await result.current.verify('123456');
      await result.current.useRecoveryCode('ABCD-EFGH-IJKL');
    });

    expect(mockPassflow.verifyTwoFactor).toHaveBeenCalledWith('123456', undefined);
    expect(mockPassflow.useTwoFactorRecoveryCode).toHaveBeenCalledWith('ABCD-EFGH-IJKL', undefined);
  });
});
