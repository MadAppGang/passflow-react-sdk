import { describe, expect, it } from 'vitest';
import { initialState, passflowReducer, type PassflowState } from '../passflow-context';

describe('passflowReducer', () => {
  describe('initialState', () => {
    it('has correct default values', () => {
      expect(initialState).toEqual({
        appSettings: null,
        passwordPolicy: null,
        url: undefined,
        appId: undefined,
        scopes: undefined,
        createTenantForNewUser: undefined,
        parseQueryParams: true,
      });
    });

    it('has parseQueryParams default to true', () => {
      expect(initialState.parseQueryParams).toBe(true);
    });
  });

  describe('SET_PASSFLOW_STATE action', () => {
    it('merges new state with existing state', () => {
      const currentState: PassflowState = {
        ...initialState,
        url: 'https://example.com',
      };

      const result = passflowReducer(currentState, {
        type: 'SET_PASSFLOW_STATE',
        payload: { ...currentState, appId: 'test-app-id' },
      });

      expect(result).toEqual({
        ...initialState,
        url: 'https://example.com',
        appId: 'test-app-id',
      });
    });

    it('can set appSettings', () => {
      const appSettings = {
        appName: 'Test App',
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#000000',
      };

      const result = passflowReducer(initialState, {
        type: 'SET_PASSFLOW_STATE',
        payload: { ...initialState, appSettings: appSettings as any },
      });

      expect(result.appSettings).toEqual(appSettings);
    });

    it('can set passwordPolicy', () => {
      const passwordPolicy = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
      };

      const result = passflowReducer(initialState, {
        type: 'SET_PASSFLOW_STATE',
        payload: { ...initialState, passwordPolicy: passwordPolicy as any },
      });

      expect(result.passwordPolicy).toEqual(passwordPolicy);
    });

    it('can set scopes', () => {
      const scopes = ['openid', 'profile', 'email'];

      const result = passflowReducer(initialState, {
        type: 'SET_PASSFLOW_STATE',
        payload: { ...initialState, scopes },
      });

      expect(result.scopes).toEqual(scopes);
    });

    it('can set createTenantForNewUser', () => {
      const result = passflowReducer(initialState, {
        type: 'SET_PASSFLOW_STATE',
        payload: { ...initialState, createTenantForNewUser: true },
      });

      expect(result.createTenantForNewUser).toBe(true);
    });

    it('can disable parseQueryParams', () => {
      const result = passflowReducer(initialState, {
        type: 'SET_PASSFLOW_STATE',
        payload: { ...initialState, parseQueryParams: false },
      });

      expect(result.parseQueryParams).toBe(false);
    });

    it('preserves existing values when partially updating', () => {
      const stateWithUrl: PassflowState = {
        ...initialState,
        url: 'https://api.example.com',
        appId: 'my-app',
      };

      const result = passflowReducer(stateWithUrl, {
        type: 'SET_PASSFLOW_STATE',
        payload: { ...stateWithUrl, scopes: ['openid'] },
      });

      expect(result.url).toBe('https://api.example.com');
      expect(result.appId).toBe('my-app');
      expect(result.scopes).toEqual(['openid']);
    });
  });

  describe('default action', () => {
    it('returns current state for unknown action type', () => {
      const currentState: PassflowState = {
        ...initialState,
        url: 'https://example.com',
      };

      // @ts-expect-error - Testing unknown action type
      const result = passflowReducer(currentState, { type: 'UNKNOWN_ACTION' });

      expect(result).toBe(currentState);
    });
  });
});
