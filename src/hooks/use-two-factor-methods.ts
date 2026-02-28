import type { RegisteredTwoFactorMethod, TwoFactorMethod } from '@passflow/core';
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseTwoFactorMethodsReturn = {
  availableMethods: TwoFactorMethod[];
  registeredMethods: RegisteredTwoFactorMethod[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  removeMethod: (methodId: string) => Promise<void>;
};

/**
 * Hook to manage two-factor authentication methods
 */
export const useTwoFactorMethods = (): UseTwoFactorMethodsReturn => {
  const passflow = usePassflow();
  const [availableMethods, setAvailableMethods] = useState<TwoFactorMethod[]>([]);
  const [registeredMethods, setRegisteredMethods] = useState<RegisteredTwoFactorMethod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const methods = await passflow.twoFactor.getRegisteredMethods();
      setRegisteredMethods(methods);

      // Extract available methods from registered methods
      const available = methods.map((m) => m.method);
      setAvailableMethods(available);
    } catch (e) {
      setError(e as Error);
      setRegisteredMethods([]);
      setAvailableMethods([]);
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  const removeMethod = useCallback(
    async (methodId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Call remove method API (needs to be implemented in @passflow/core)
        // For now, this is a placeholder
        await passflow.twoFactor.removeMethod?.(methodId);

        // Refresh the methods list after removal
        await refresh();
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [passflow, refresh],
  );

  return {
    availableMethods,
    registeredMethods,
    isLoading,
    error,
    refresh,
    removeMethod,
  };
};
