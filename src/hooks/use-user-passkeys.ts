import { useLayoutEffect, useState } from 'react';
import { useAooth } from './use-aooth';
import { AoothUserPasskey } from '@aooth/aooth-js-sdk';

export type TuseUserPasskeys = () => {
  data: AoothUserPasskey[];
  createUserPasskey: (relaingPartyId: string) => Promise<void>;
  editUserPasskey: (newName: string, passkeyId: string) => Promise<void>;
  deleteUserPasskey: (passkeyId: string) => Promise<void>;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
};

export const useUserPasskeys: TuseUserPasskeys = () => {
  const aooth = useAooth();
  const [data, setData] = useState<AoothUserPasskey[]>([]);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useLayoutEffect(() => {
    const fetch = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const response = await aooth.getUserPasskeys();
        setData(response as unknown as AoothUserPasskey[]);
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    void fetch();
  }, [aooth]);

  const createUserPasskey = async (relaingPartyId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const createUserPasskeyStatus = await aooth.createUserPasskey(relaingPartyId);
      if (createUserPasskeyStatus) {
        const userPasskeys = await aooth.getUserPasskeys();
        setData(userPasskeys as unknown as AoothUserPasskey[]);
      }
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
      const editUserPasskeyStatus = await aooth.renameUserPasskey(newName, passkeyId);
      if (editUserPasskeyStatus) {
        const userPasskeys = await aooth.getUserPasskeys();
        setData(userPasskeys as unknown as AoothUserPasskey[]);
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
      const deleteUserPasskeyStatus = await aooth.deleteUserPasskey(passkeyId);
      if (deleteUserPasskeyStatus) {
        const userPasskeys = await aooth.getUserPasskeys();
        setData(userPasskeys as unknown as AoothUserPasskey[]);
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
