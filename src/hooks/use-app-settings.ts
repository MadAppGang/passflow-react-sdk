import { useContext, useLayoutEffect, useState } from 'react';
import {
  AoothPasskeySettings,
  AoothPasswordPolicySettings,
  AppSettings,
  FirstFactorFim,
  FirstFactorInternal,
  Providers,
} from '@aooth/aooth-sdk-js';
import { useAooth } from './use-aooth';
import { AoothContext } from '@/context';
import { includes } from 'lodash';

const appSettings = (data: AppSettings) =>
  data.auth_strategies.reduce(
    (acc, item) => {
      if (item.type === 'first_factor_internal') {
        const strategy = item.strategy as FirstFactorInternal;
        const { identity, challenge, transport } = strategy;
        if (acc.INTERNAL[identity]) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          acc.INTERNAL[identity]!.push({ challenge, transport });
        } else {
          acc.INTERNAL[identity] = [{ challenge, transport }];
          acc.IDENTITY_FIELDS.push(identity);
        }
        if (!includes(acc.CHALLENGES, challenge)) acc.CHALLENGES.push(challenge);
        if (challenge === 'passkey') acc.IDENTITY_FIELDS_PASSKEY.push(identity);
      } else if (item.type === 'first_factor_fim') {
        const strategy = item.strategy as FirstFactorFim;
        const { fim_type: fimType } = strategy;
        acc.PROVIDERS.push(fimType);
      }
      return acc;
    },
    { PROVIDERS: [], INTERNAL: {}, IDENTITY_FIELDS: [], IDENTITY_FIELDS_PASSKEY: [], CHALLENGES: [] } as {
      PROVIDERS: Providers[];
      INTERNAL: { [key: string]: { challenge: string; transport: string }[] };
      IDENTITY_FIELDS: string[];
      IDENTITY_FIELDS_PASSKEY: string[];
      CHALLENGES: string[];
    },
  );

export type TuseAppSettings = () => {
  appSettings: (AppSettings & ReturnType<typeof appSettings>) | null;
  passwordPolicy: AoothPasswordPolicySettings | null;
  passkeyProvider: AoothPasskeySettings | null;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useAppSettings: TuseAppSettings = () => {
  const aooth = useAooth();
  const context = useContext(AoothContext);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!context) {
    throw new Error('useAppSetting must be used within an AoothProvider');
  }

  const { state, dispatch } = context;

  useLayoutEffect(() => {
    const fetch = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const aoothAppSettings = await aooth.getAppSettings();
        const aoothSettingAll = await aooth.getSettingsAll();
        const appSettingsCombined = appSettings(aoothAppSettings);
        dispatch({
          type: 'SET_AOOTH_STATE',
          payload: {
            ...state,
            appSettings: { ...aoothAppSettings, ...appSettingsCombined },
            passkeyProvider: aoothSettingAll.passkey_provider,
            passwordPolicy: aoothSettingAll.password_policy,
          },
        });
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
      }
      setIsLoading(false);
    };

    if (!state.appSettings) void fetch();
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
