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
import { Passflow, type PassflowConfig } from '@passflow/passflow-js-sdk';
import React, { type FC, type ReactNode, useCallback, useMemo, useReducer, useState } from 'react';
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
  const [state, dispatch] = useReducer(passflowReducer, {
    ...initialState,
    ...config,
  });

  const [navigate, setNavigate] = useState<NavigateFunction>(() => {
    if (initialNavigate) {
      return initialNavigate;
    }
    return defaultNavigate;
  });

  const passflow = useMemo(() => new Passflow(state), [state]);
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
