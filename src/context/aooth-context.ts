import { CombinedAppSettigns } from '@/types';
import { Aooth, AoothPasskeySettings, AoothPasswordPolicySettings } from '@aooth/aooth-js-sdk';
import { Dispatch, createContext } from 'react';

export type AoothState = {
  appSettings: CombinedAppSettigns | null;
  passwordPolicy: AoothPasswordPolicySettings | null;
  passkeyProvider: AoothPasskeySettings | null;
  url?: string;
  appId?: string;
  scopes?: string[];
  createTenantForNewUser?: boolean;
};

export type AoothAction = { type: 'SET_AOOTH_STATE'; payload: AoothState };

export type AoothContextType = {
  state: AoothState;
  dispatch: Dispatch<AoothAction>;
  aooth: Aooth;
};

export const initialState: AoothState = {
  appSettings: null,
  passwordPolicy: null,
  passkeyProvider: null,
  url: undefined,
  appId: undefined,
  scopes: undefined,
  createTenantForNewUser: false,
};

export const AoothContext = createContext<AoothContextType | undefined>(undefined);

export const aoothReducer = (state: AoothState, action: AoothAction): AoothState => {
  switch (action.type) {
    case 'SET_AOOTH_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};
