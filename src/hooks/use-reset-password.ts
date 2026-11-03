import { useCallback, useState } from 'react';
import { isPasswordSavedRateLimit, newPasswordErrorMessage } from '@/utils';
import { type UseEmailCodeStep, useEmailCodeStep } from './use-email-code-step';
import { usePassflow } from './use-passflow';

export type UseResetPasswordProps = () => {
  /**
   * Saves the new password. Pass the reset link's `token` when you have it: without it core looks for `?token=` in
   * the address bar, which a hash or memory router does not keep. Resolves `true` for a session, `false` on an error
   * or when the server asks for an emailed code first (`emailCode` then holds the step).
   */
  fetch: (newPassword: string, resetToken?: string) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  /**
   * The password was changed, but the emailed code that should follow was refused for now (429). Asking for the
   * password again would be wrong: the user should sign in with it later.
   */
  isPasswordSaved: boolean;
  reset: () => void;
  /** The emailed-code step a password change may answer with. No resend: the reset link is spent. */
  emailCode: UseEmailCodeStep;
};

export const useResetPassword: UseResetPasswordProps = () => {
  const passflow = usePassflow();
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordSaved, setIsPasswordSaved] = useState(false);
  const emailCode = useEmailCodeStep();

  const fetch = useCallback(
    async (newPassword: string, resetToken?: string): Promise<boolean> => {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage('');
      try {
        const answer = resetToken
          ? await passflow.resetPassword(newPassword, undefined, resetToken)
          : await passflow.resetPassword(newPassword);
        return !emailCode.enter(answer);
      } catch (e) {
        console.error('[passflow] password change failed', e);
        setIsError(true);
        setErrorMessage(newPasswordErrorMessage(e));
        setIsPasswordSaved(isPasswordSavedRateLimit(e));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow.resetPassword, emailCode.enter],
  );

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
    setIsPasswordSaved(false);
  };

  return { fetch, isLoading, isError, error: errorMessage, isPasswordSaved, reset, emailCode } as const;
};
