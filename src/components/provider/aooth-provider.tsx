import { FC, ReactNode, useMemo, useReducer } from 'react';
import { AoothContext, aoothReducer, initialState } from '@/context';
import { Aooth, AoothConfig } from '@aooth/aooth-js-sdk';
import '@/styles/index.css';

type TAoothProvider = AoothConfig & {
  children: ReactNode;
};

export const AoothProvider: FC<TAoothProvider> = ({ children, ...config }) => {
  const [state, dispatch] = useReducer(aoothReducer, {
    ...initialState,
    ...config,
  });

  const aooth = useMemo(() => new Aooth(config), [config]);
  const value = useMemo(() => ({ state, dispatch, aooth }), [state, dispatch, aooth]);

  return <AoothContext.Provider value={value}>{children}</AoothContext.Provider>;
};
