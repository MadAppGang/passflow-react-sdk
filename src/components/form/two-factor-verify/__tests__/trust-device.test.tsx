import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const verify = vi.fn();
const useRecoveryCode = vi.fn();

vi.mock('@/hooks', () => ({
  useTwoFactorVerify: () => ({
    verify,
    useRecoveryCode,
    reset: vi.fn(),
    isLoading: false,
    isError: false,
    errorDetails: null,
  }),
}));

// One plain input stands in for the six boxes, so a test can enter the code at once.
vi.mock('react-otp-input', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input aria-label='code' value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

import { TwoFactorRecoveryForm, TwoFactorVerifyForm } from '..';

const forms = [
  {
    name: 'verify form',
    complete: verify,
    run: () => {
      render(<TwoFactorVerifyForm onSuccess={vi.fn()} />);
      return () => fireEvent.change(screen.getByLabelText('code'), { target: { value: '123456' } });
    },
    code: '123456',
  },
  {
    name: 'recovery form',
    complete: useRecoveryCode,
    run: () => {
      render(<TwoFactorRecoveryForm onSuccess={vi.fn()} />);
      return async () => {
        await userEvent.type(screen.getByLabelText('Recovery Code'), 'ABCD-EFGH-IJKL');
        await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
      };
    },
    code: 'ABCD-EFGH-IJKL',
  },
];

describe('"Trust this device" on the 2FA forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verify.mockResolvedValue({ success: true });
    useRecoveryCode.mockResolvedValue({ success: true });
  });

  for (const form of forms) {
    describe(form.name, () => {
      it('offers the option unticked', () => {
        form.run();
        expect(screen.getByRole('checkbox', { name: 'Trust this device' })).not.toBeChecked();
      });

      it('sends no trust option while unticked', async () => {
        const enterCode = form.run();
        await enterCode();

        await waitFor(() => expect(form.complete).toHaveBeenCalledTimes(1));
        expect(form.complete).toHaveBeenCalledWith(form.code, undefined);
      });

      it('sends trustDevice: true once ticked', async () => {
        const enterCode = form.run();
        await userEvent.click(screen.getByRole('checkbox', { name: 'Trust this device' }));
        await enterCode();

        await waitFor(() => expect(form.complete).toHaveBeenCalledTimes(1));
        expect(form.complete).toHaveBeenCalledWith(form.code, { trustDevice: true });
      });

      it('sends no trust option when ticked and then unticked', async () => {
        const enterCode = form.run();
        const option = screen.getByRole('checkbox', { name: 'Trust this device' });
        await userEvent.click(option);
        await userEvent.click(option);
        await enterCode();

        await waitFor(() => expect(form.complete).toHaveBeenCalledTimes(1));
        expect(form.complete).toHaveBeenCalledWith(form.code, undefined);
      });
    });
  }
});
