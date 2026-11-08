import type { AppSettings, Passflow, PassflowPasswordPolicySettings } from '@passflow/core';
import { createContext, type Dispatch } from 'react';
import { handOffScopesUpdate } from '@/utils/hand-off';

/**
 * What the app that sent the user to the hosted login asked for. `scopes` decide what goes back to it (`id` gives an
 * ID token, `offline` or `offline_access` a refresh token); unset, they are filled from the app's configuration.
 * `state` is echoed back to the app.
 */
export type HandOff = { scopes?: string[]; state?: string };

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
  handOff?: HandOff;
};

export type PassflowAction =
  /** Merged into the state: a dispatch carries only the fields it changes. */
  | { type: 'SET_PASSFLOW_STATE'; payload: Partial<PassflowState> }
  /** Scopes found in the app's configuration, applied under a hand-off against the current state. */
  | { type: 'SET_FOUND_SCOPES'; found: string[] | undefined };

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
  handOff: undefined,
};

export const PassflowContext = createContext<PassflowContextType | undefined>(undefined);

export const passflowReducer = (state: PassflowState, action: PassflowAction): PassflowState => {
  switch (action.type) {
    case 'SET_PASSFLOW_STATE':
      return { ...state, ...action.payload };
    case 'SET_FOUND_SCOPES': {
      const update = handOffScopesUpdate(state, action.found);
      return Object.keys(update).length ? { ...state, ...update } : state;
    }
    default:
      return state;
  }
};
