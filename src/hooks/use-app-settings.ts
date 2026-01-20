import { PassflowContext } from '@/context';
import type { AppSettings, LoginWebAppStyle, LoginWebAppTheme, PassflowPasswordPolicySettings } from '@passflow/core';
import { isEmpty, isUndefined, some } from 'lodash';
import { useContext, useLayoutEffect, useRef, useState } from 'react';
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
  const isFetchingRef = useRef(false);

  if (!context) {
    throw new Error('useAppSetting must be used within an PassflowProvider');
  }

  const { state, dispatch } = context;

  useLayoutEffect(() => {
    if (!state.appSettings && !state.hasSettingsError && !isFetchingRef.current) {
      const fetchAllSettings = async (): Promise<void> => {
        isFetchingRef.current = true;
        setIsLoading(true);
        try {
          // If appId is not provided, try to discover it from /settings endpoint
          if (!passflow.appId && !state.isDiscoveringAppId) {
            dispatch({
              type: 'SET_PASSFLOW_STATE',
              payload: {
                ...state,
                isDiscoveringAppId: true,
              },
            });

            try {
              // Try relative path first (works with dev server proxy and same-origin production)
              // Then fall back to absolute URL if configured
              const urlsToTry = ['/settings'];
              if (passflow.url) {
                urlsToTry.push(`${passflow.url}/settings`);
              }

              let response: Response | null = null;
              for (const url of urlsToTry) {
                try {
                  const r = await fetch(url);
                  if (r.ok) {
                    response = r;
                    break;
                  }
                } catch {}
              }

              if (response?.ok) {
                const settings = await response.json();

                // Support both response formats:
                // Production: { login_app: { app_id: "...", ... } }
                // Dev: { appId: "..." }
                const discoveredAppId = settings.login_app?.app_id || settings.appId;

                if (discoveredAppId) {
                  // Update the passflow instance with discovered appId using setAppId method
                  passflow.setAppId(discoveredAppId);

                  // Collect state updates to apply in one dispatch
                  const stateUpdates: Partial<typeof state> = {
                    appId: discoveredAppId,
                  };

                  // Also update scopes if available and not already set
                  if (!state.scopes) {
                    const discoveredScopes = settings.login_app?.scopes || settings.scopes;
                    if (discoveredScopes) {
                      stateUpdates.scopes = discoveredScopes;
                    }
                  }

                  // Update createTenantForNewUser if available and not already set
                  if (isUndefined(state.createTenantForNewUser)) {
                    const createTenant = settings.login_app?.create_tenant_for_new_user ?? settings.createTenantForNewUser;
                    if (createTenant !== undefined) {
                      stateUpdates.createTenantForNewUser = createTenant;
                    }
                  }

                  // Apply discovered state updates
                  dispatch({
                    type: 'SET_PASSFLOW_STATE',
                    payload: {
                      ...state,
                      ...stateUpdates,
                      isDiscoveringAppId: false,
                    },
                  });
                } else {
                  dispatch({
                    type: 'SET_PASSFLOW_STATE',
                    payload: {
                      ...state,
                      isDiscoveringAppId: false,
                    },
                  });
                }
              }
            } catch (discoveryError) {
              console.warn('Failed to discover appId from /settings:', discoveryError);
              // Continue with the flow - we'll handle missing appId later
              dispatch({
                type: 'SET_PASSFLOW_STATE',
                payload: {
                  ...state,
                  isDiscoveringAppId: false,
                },
              });
            }
          }

          let appSettings = {} as AppSettings;
          if (passflow.appId) {
            appSettings = await passflow.getAppSettings();
          }

          // Collect final state updates
          const finalStateUpdates: Partial<typeof state> = {
            appSettings,
          };

          if (!state.scopes) finalStateUpdates.scopes = appSettings.defaults?.scopes;
          if (isUndefined(state.createTenantForNewUser))
            finalStateUpdates.createTenantForNewUser = appSettings.defaults?.create_tenant_for_new_user;

          let passwordPolicy = null;
          if (appSettings.auth_strategies && hasPasswordStrategy(appSettings.auth_strategies)) {
            passwordPolicy = await passflow.getPasswordPolicySettings();
          }
          finalStateUpdates.passwordPolicy = passwordPolicy;

          dispatch({
            type: 'SET_PASSFLOW_STATE',
            payload: {
              ...state,
              ...finalStateUpdates,
            },
          });
        } catch (e) {
          setIsError(true);
          const error = e as Error;
          setErrorMessage(error.message);
          // Set error flag in context to prevent infinite retry loop
          dispatch({
            type: 'SET_PASSFLOW_STATE',
            payload: {
              ...state,
              hasSettingsError: true,
            },
          });
        } finally {
          setIsLoading(false);
          isFetchingRef.current = false;
        }
      };
      void fetchAllSettings();
    }
  }, [dispatch, state.appSettings, state.hasSettingsError, state.isDiscoveringAppId, passflow]);

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
    // Clear error flag in context to allow retry
    dispatch({
      type: 'SET_PASSFLOW_STATE',
      payload: {
        ...state,
        hasSettingsError: false,
      },
    });
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
