import { useContext, useLayoutEffect, useState } from 'react';
import { AppSettings, PassflowPasskeySettings, PassflowPasswordPolicySettings } from '@passflow/passflow-js-sdk';
import { usePassflow } from './use-passflow';
import { PassflowContext } from '@/context';

export type UseAppSettingsProps = () => {
  appSettings: AppSettings | null;
  passwordPolicy: PassflowPasswordPolicySettings | null;
  passkeyProvider: PassflowPasskeySettings | null;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useAppSettings: UseAppSettingsProps = () => {
  const passflow = usePassflow();
  const context = useContext(PassflowContext);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!context) {
    throw new Error('useAppSetting must be used within an PassflowProvider');
  }

  const { state, dispatch } = context;

  useLayoutEffect(() => {
    if (!state.appSettings) {
      const fetchAllSettings = async (): Promise<void> => {
        setIsLoading(true);
        try {
          const passflowSettingAll = await passflow.getSettingsAll();
          let appSettings = {} as AppSettings;
          if (passflow.appId) {
            appSettings = await passflow.getAppSettings();
          }

          dispatch({
            type: 'SET_PASSFLOW_STATE',
            payload: {
              ...state,
              appSettings,
              passkeyProvider: passflowSettingAll.passkey_provider,
              passwordPolicy: passflowSettingAll.password_policy,
            },
          });
        } catch (e) {
          setIsError(true);
          const error = e as Error;
          setErrorMessage(error.message);
        } finally {
          setIsLoading(false);
        }
      };
      void fetchAllSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  return {
    appSettings: state.appSettings,
    passwordPolicy: state.passwordPolicy,
    passkeyProvider: state.passkeyProvider,
    isLoading,
    isError,
    error: errorMessage,
    reset,
  } as const;
};
