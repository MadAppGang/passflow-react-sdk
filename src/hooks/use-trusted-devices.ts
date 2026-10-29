import type { TwoFactorTrustedDevice } from '@passflow/core';
import { useCallback, useLayoutEffect, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseTrustedDevicesProps = () => {
  /** The devices the signed-in user trusted to skip the second factor on this app. */
  data: TwoFactorTrustedDevice[];
  refetch: () => Promise<TwoFactorTrustedDevice[] | null>;
  /**
   * Revokes one device; its next sign-in asks for the second factor again.
   * On success the device leaves `data` without a refetch.
   *
   * @returns true when the server revoked it
   */
  revoke: (deviceId: string) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
};

/**
 * Hook to list and revoke the signed-in user's trusted devices
 */
export const useTrustedDevices: UseTrustedDevicesProps = () => {
  const passflow = usePassflow();
  const [data, setData] = useState<TwoFactorTrustedDevice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fail = useCallback((e: unknown) => {
    setIsError(true);
    setErrorMessage((e as Error).message);
  }, []);

  const fetch = useCallback(async (): Promise<TwoFactorTrustedDevice[] | null> => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');
    try {
      const devices = await passflow.getTrustedDevices();
      setData(devices);
      return devices;
    } catch (e) {
      fail(e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow, fail]);

  const revoke = useCallback(
    async (deviceId: string): Promise<boolean> => {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage('');
      try {
        await passflow.revokeTrustedDevice(deviceId);
        setData((devices) => devices.filter((device) => device.id !== deviceId));
        return true;
      } catch (e) {
        fail(e);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow, fail],
  );

  useLayoutEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    data,
    refetch: fetch,
    revoke,
    isLoading,
    isError,
    errorMessage,
  };
};
