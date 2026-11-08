import type { AppSettings, LoginWebAppStyle, LoginWebAppTheme, PassflowPasswordPolicySettings } from '@passflow/core';
import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { PassflowContext, type PassflowState } from '@/context';
import { applyLoginThemeStyles, type CompatibleLoginWebAppStyle } from '@/utils/login-theme';
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
  return strategies?.some((strategy) => strategy.type === 'internal' && strategy.strategy?.challenge === 'password') ?? false;
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
    // The provider is still looking for the app id: settings read now would be the empty default.
    if (state.isDiscoveringAppId) return;
    if (state.appSettings || state.hasSettingsError || isFetchingRef.current) return;

    const fetchAllSettings = async (): Promise<void> => {
      isFetchingRef.current = true;
      setIsLoading(true);
      try {
        // If appId is not provided, try to discover it from /settings endpoint
        if (!passflow.appId) {
          dispatch({ type: 'SET_PASSFLOW_STATE', payload: { isDiscoveringAppId: true } });
          const discovered: Partial<PassflowState> = { isDiscoveringAppId: false };

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

            if (response) {
              const settings = await response.json();

              // Support both response formats:
              // Production: { login_app: { app_id: "...", ... } }
              // Dev: { appId: "..." }
              const discoveredAppId = settings.login_app?.app_id || settings.appId;

              if (discoveredAppId) {
                passflow.setAppId(discoveredAppId);
                discovered.appId = discoveredAppId;

                const discoveredScopes = settings.login_app?.scopes || settings.scopes;
                if (!state.scopes && discoveredScopes) discovered.scopes = discoveredScopes;

                const createTenant = settings.login_app?.create_tenant_for_new_user ?? settings.createTenantForNewUser;
                if (state.createTenantForNewUser === undefined && createTenant !== undefined) {
                  discovered.createTenantForNewUser = createTenant;
                }
              }
            }
          } catch (discoveryError) {
            console.warn('Failed to discover appId from /settings:', discoveryError);
            // Continue with the flow - we'll handle missing appId later
          }

          dispatch({ type: 'SET_PASSFLOW_STATE', payload: discovered });
        }

        // Discovery has finished. With no app id this is the bare default sign-in form, on empty settings.
        let appSettings = {} as AppSettings;
        if (passflow.appId) {
          appSettings = await passflow.getAppSettings();
        }

        // Each dispatch carries only what it changes, so nothing written meanwhile is overwritten.
        const finalStateUpdates: Partial<PassflowState> = { appSettings };

        const defaultScopes = appSettings.defaults?.scopes;
        if (!state.scopes && defaultScopes) finalStateUpdates.scopes = defaultScopes;
        const defaultCreateTenant = appSettings.defaults?.create_tenant_for_new_user;
        if (state.createTenantForNewUser === undefined && defaultCreateTenant !== undefined) {
          finalStateUpdates.createTenantForNewUser = defaultCreateTenant;
        }

        let passwordPolicy = null;
        if (appSettings.auth_strategies && hasPasswordStrategy(appSettings.auth_strategies)) {
          passwordPolicy = await passflow.getPasswordPolicySettings();
        }
        finalStateUpdates.passwordPolicy = passwordPolicy;

        dispatch({ type: 'SET_PASSFLOW_STATE', payload: finalStateUpdates });
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
        // Set error flag in context to prevent infinite retry loop
        dispatch({ type: 'SET_PASSFLOW_STATE', payload: { hasSettingsError: true } });
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };
    void fetchAllSettings();
  }, [dispatch, state.appSettings, state.hasSettingsError, state.isDiscoveringAppId, passflow]);

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
    // Clear error flag in context to allow retry
    dispatch({ type: 'SET_PASSFLOW_STATE', payload: { hasSettingsError: false } });
  };

  // `custom_css` is not written here: each screen passes `currentStyles.custom_css`
  // to its shell, which renders it inline.
  const applyThemeStyles = (style: CompatibleLoginWebAppStyle) => {
    applyLoginThemeStyles(document.documentElement, style);
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
