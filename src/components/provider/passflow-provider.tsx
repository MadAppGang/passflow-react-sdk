import {
  AuthProvider,
  type NavigateFunction,
  NavigationContext,
  PassflowContext,
  type RouterType,
  defaultNavigate,
  initialState,
  passflowReducer,
} from '@/context';
import { Passflow, type PassflowConfig } from '@passflow/core';
import React, { type FC, type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import '@/styles/index.css';

type PassflowProviderProps = PassflowConfig & {
  children: ReactNode;
  navigate?: NavigateFunction;
  router?: RouterType;
};

export const PassflowProvider: FC<PassflowProviderProps> = ({
  children,
  navigate: initialNavigate,
  router = 'default',
  ...config
}) => {
  // If appId is not provided, set isDiscoveringAppId to true to signal
  // that auto-discovery should happen (prevents showing error before discovery)
  const needsDiscovery = !config.appId;

  const [state, dispatch] = useReducer(passflowReducer, {
    ...initialState,
    ...config,
    isDiscoveringAppId: needsDiscovery,
  });

  const [navigate, setNavigate] = useState<NavigateFunction>(() => {
    if (initialNavigate) {
      return initialNavigate;
    }
    return defaultNavigate;
  });

  const passflow = useMemo(() => new Passflow(state), [state]);

  // Auto-discover appId from /settings endpoint if not provided
  const discoveryAttemptedRef = useRef(false);
  useEffect(() => {
    if (needsDiscovery && !discoveryAttemptedRef.current && state.isDiscoveringAppId) {
      discoveryAttemptedRef.current = true;

      const discoverAppId = async () => {
        // Try relative path first (works with dev server proxy and same-origin production)
        // Then fall back to absolute URL if configured
        const urlsToTry = ['/settings'];
        if (config.url) {
          urlsToTry.push(`${config.url}/settings`);
        }

        for (const url of urlsToTry) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              const settings = await response.json();
              const discoveredAppId = settings.login_app?.app_id || settings.appId;

              if (discoveredAppId) {
                passflow.setAppId(discoveredAppId);
                dispatch({
                  type: 'SET_PASSFLOW_STATE',
                  payload: {
                    ...state,
                    appId: discoveredAppId,
                    scopes: settings.login_app?.scopes || settings.scopes || state.scopes,
                    createTenantForNewUser:
                      settings.login_app?.create_tenant_for_new_user ??
                      settings.createTenantForNewUser ??
                      state.createTenantForNewUser,
                    isDiscoveringAppId: false,
                  },
                });
                return;
              }
            }
          } catch (error) {
            // Try next URL
            continue;
          }
        }

        // All URLs failed
        console.warn('Failed to discover appId from /settings');
        dispatch({
          type: 'SET_PASSFLOW_STATE',
          payload: {
            ...state,
            isDiscoveringAppId: false,
          },
        });
      };

      void discoverAppId();
    }
  }, [needsDiscovery, state.isDiscoveringAppId, config.url, passflow, state]);

  const passflowValue = useMemo(() => ({ state, dispatch, passflow }), [state, passflow]);

  const handleSetNavigate = useCallback((newNavigate: NavigateFunction | null) => {
    setNavigate(() => newNavigate || defaultNavigate);
  }, []);

  const navigationValue = useMemo(
    () => ({
      navigate,
      setNavigate: handleSetNavigate,
      router,
    }),
    [navigate, handleSetNavigate, router],
  );

  return (
    <PassflowContext.Provider value={passflowValue}>
      <NavigationContext.Provider value={navigationValue}>
        <AuthProvider>{children}</AuthProvider>
      </NavigationContext.Provider>
    </PassflowContext.Provider>
  );
};
