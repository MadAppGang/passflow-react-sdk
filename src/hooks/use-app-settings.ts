import { PassflowContext } from '@/context';
import type { AppSettings, LoginWebAppStyle, LoginWebAppTheme, PassflowPasswordPolicySettings } from '@passflow/core';
import { isEmpty, isUndefined, some } from 'lodash';
import { useContext, useLayoutEffect, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseAppSettingsProps = () => {
  appSettings: AppSettings | null;
  passwordPolicy: PassflowPasswordPolicySettings | null;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
  currentTheme: string;
  currentStyles: LoginWebAppStyle | null;
  scopes: string[];
  createTenantForNewUser: boolean;
  loginAppTheme?: LoginWebAppTheme;
};

const hasPasswordStrategy = (strategies: AppSettings['auth_strategies']): boolean => {
  return some(strategies, (strategy) => strategy.type === 'internal' && strategy.strategy?.challenge === 'password');
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
          let appSettings = {} as AppSettings;
          if (passflow.appId) {
            appSettings = await passflow.getAppSettings();
          }

          if (!state.scopes) state.scopes = appSettings.defaults.scopes;
          if (isUndefined(state.createTenantForNewUser))
            state.createTenantForNewUser = appSettings.defaults.create_tenant_for_new_user;

          let passwordPolicy = null;
          if (appSettings.auth_strategies && hasPasswordStrategy(appSettings.auth_strategies)) {
            passwordPolicy = await passflow.getPasswordPolicySettings();
          }

          dispatch({
            type: 'SET_PASSFLOW_STATE',
            payload: {
              ...state,
              appSettings,
              passwordPolicy,
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
  }, [dispatch, state.appSettings, passflow, state]);

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  const applyThemeStyles = (style: LoginWebAppStyle) => {
    const root = document.documentElement;

    root.style.setProperty('--passflow-primary-color', style.primary_color);
    root.style.setProperty('--passflow-text-color', style.text_color);
    root.style.setProperty('--passflow-secondary-text-color', style.secondary_text_color);
    root.style.setProperty('--passflow-background-color', style.background_color);
    root.style.setProperty(
      '--passflow-background-image',
      isEmpty(style.background_image) ? 'none' : `url(${style.background_image})`,
    );
    root.style.setProperty('--passflow-card-color', style.card_color);
    root.style.setProperty('--passflow-input-background-color', style.input_background_color);
    root.style.setProperty('--passflow-input-border-color', style.input_border_color);
    root.style.setProperty('--passflow-button-text-color', style.button_text_color);
    root.style.setProperty('--passflow-passkey-button-text-color', style.passkey_button_text_color);
    root.style.setProperty('--passflow-passkey-button-background-color', style.passkey_button_background_color);
    root.style.setProperty('--passflow-divider-color', style.divider_color);
    root.style.setProperty('--passflow-federated_button_background_color', style.federated_button_background_color);
    root.style.setProperty('--passflow-federated_button_text_color', style.federated_button_text_color);

    if (style.custom_css) {
      const customStylesElement = document.querySelector('.psfw-custom-styles');
      if (customStylesElement) {
        customStylesElement.innerHTML = style.custom_css;
      }
    }
  };

  const getCurrentTheme = () => {
    const theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    if (state.appSettings?.login_app_theme?.color_scheme === 'system') return theme;

    return state.appSettings?.login_app_theme?.color_scheme ?? theme;
  };

  const currentTheme = getCurrentTheme();

  const selectedStyle = state.appSettings?.login_app_theme
    ? currentTheme === 'dark'
      ? state.appSettings?.login_app_theme.dark_style
      : state.appSettings?.login_app_theme.light_style
    : null;

  if (selectedStyle) {
    applyThemeStyles(selectedStyle);
  }

  return {
    appSettings: state.appSettings,
    scopes: state.scopes ?? [],
    createTenantForNewUser: state.createTenantForNewUser ?? false,
    loginAppTheme: state.appSettings?.login_app_theme,
    passwordPolicy: state.passwordPolicy,
    currentStyles: selectedStyle,
    currentTheme: currentTheme,
    isLoading,
    isError,
    error: errorMessage,
    reset,
  } as const;
};
