import { useLayoutEffect, useState } from 'react';
import { usePassflow } from './use-passflow';
import { PassflowUserPasskey } from '@passflow/passflow-js-sdk';

export type UseUserPasskeysProps = () => {
  data: PassflowUserPasskey[];
  createUserPasskey: (relaingPartyId: string) => Promise<void>;
  editUserPasskey: (newName: string, passkeyId: string) => Promise<void>;
  deleteUserPasskey: (passkeyId: string) => Promise<void>;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
};

export const useUserPasskeys: UseUserPasskeysProps = () => {
  const passflow = usePassflow();
  const [data, setData] = useState<PassflowUserPasskey[]>([]);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useLayoutEffect(() => {
    const fetch = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const response = await passflow.getUserPasskeys();
        setData(response as unknown as PassflowUserPasskey[]);
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    void fetch();
  }, [passflow]);

  const createUserPasskey = async (relyingPartyId: string, passkeyUsername?: string, passkeyDisplayName?: string): Promise<void> => {
    setIsLoading(true);
    try {
      await passflow.addUserPasskey({relyingPartyId, passkeyUsername, passkeyDisplayName});
    } catch (e) {
      setIsError(true);
      const error = e as Error;
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const editUserPasskey = async (newName: string, passkeyId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const editUserPasskeyStatus = await passflow.renameUserPasskey(newName, passkeyId);
      if (editUserPasskeyStatus) {
        const userPasskeys = await passflow.getUserPasskeys();
        setData(userPasskeys as unknown as PassflowUserPasskey[]);
      }
    } catch (e) {
      setIsError(true);
      const error = e as Error;
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUserPasskey = async (passkeyId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const deleteUserPasskeyStatus = await passflow.deleteUserPasskey(passkeyId);
      if (deleteUserPasskeyStatus) {
        const userPasskeys = await passflow.getUserPasskeys();
        setData(userPasskeys as unknown as PassflowUserPasskey[]);
      }
    } catch (e) {
      setIsError(true);
      const error = e as Error;
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    createUserPasskey,
    editUserPasskey,
    deleteUserPasskey,
    isLoading,
    isError,
    errorMessage,
  };
};
