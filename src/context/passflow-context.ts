import type { AppSettings, Passflow, PassflowPasswordPolicySettings } from '@passflow/core';
import { type Dispatch, createContext } from 'react';

export type PassflowState = {
  appSettings: AppSettings | null;
  passwordPolicy: PassflowPasswordPolicySettings | null;
  url?: string;
  appId?: string;
  scopes?: string[];
  createTenantForNewUser?: boolean;
  parseQueryParams?: boolean;
  isDiscoveringAppId?: boolean;
  hasSettingsError?: boolean;
};

export type PassflowAction = { type: 'SET_PASSFLOW_STATE'; payload: PassflowState };

export type PassflowContextType = {
  state: PassflowState;
  dispatch: Dispatch<PassflowAction>;
  passflow: Passflow;
};

export const initialState: PassflowState = {
  appSettings: null,
  passwordPolicy: null,
  url: undefined,
  appId: undefined,
  scopes: undefined,
  createTenantForNewUser: undefined,
  parseQueryParams: true,
  isDiscoveringAppId: false,
  hasSettingsError: false,
};

export const PassflowContext = createContext<PassflowContextType | undefined>(undefined);

export const passflowReducer = (state: PassflowState, action: PassflowAction): PassflowState => {
  switch (action.type) {
    case 'SET_PASSFLOW_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};
