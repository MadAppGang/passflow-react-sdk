import { describe, expect, it } from 'vitest';
import { initialState, passflowReducer } from '@/context/passflow-context';
import { handOffScopes, handOffScopesUpdate, withScope } from '../hand-off';

describe('withScope', () => {
  it('appends a missing scope at the end', () => {
    expect(withScope(['openid', 'profile'], 'id')).toEqual(['openid', 'profile', 'id']);
  });

  it('keeps the list as it is when the scope is already there', () => {
    expect(withScope(['openid', 'id', 'profile'], 'id')).toEqual(['openid', 'id', 'profile']);
  });

  it('drops duplicates and keeps the first position', () => {
    expect(withScope(['openid', 'openid', 'email'], 'offline')).toEqual(['openid', 'email', 'offline']);
  });

  it('does not change the list it is given', () => {
    const list = ['openid'];
    withScope(list, 'id');
    expect(list).toEqual(['openid']);
  });
});

describe('handOffScopes', () => {
  it('is undefined without a hand-off', () => {
    expect(handOffScopes(undefined)).toBeUndefined();
  });

  it('is the requested scopes verbatim', () => {
    expect(handOffScopes({ scopes: ['openid'] })).toEqual(['openid']);
  });

  it('falls back to openid profile id when nothing was requested or found', () => {
    expect(handOffScopes({})).toEqual(['openid', 'profile', 'id']);
    expect(handOffScopes({ state: 'xyz' })).toEqual(['openid', 'profile', 'id']);
  });
});

describe('handOffScopesUpdate', () => {
  const base = { ...initialState };

  it('writes nothing without a hand-off', () => {
    expect(handOffScopesUpdate(base, ['openid', 'email'])).toEqual({});
  });

  it('writes nothing when the hand-off scopes are already set', () => {
    expect(handOffScopesUpdate({ ...base, handOff: { scopes: ['openid'] } }, ['openid', 'email'])).toEqual({});
  });

  it('writes nothing when nothing was found', () => {
    expect(handOffScopesUpdate({ ...base, handOff: {} }, undefined)).toEqual({});
    expect(handOffScopesUpdate({ ...base, handOff: {} }, [])).toEqual({});
  });

  it('writes the found scopes with id, and sign-in scopes with offline, while unset', () => {
    expect(handOffScopesUpdate({ ...base, handOff: { state: 's' } }, ['openid', 'email', 'profile'])).toEqual({
      handOff: { state: 's', scopes: ['openid', 'email', 'profile', 'id'] },
      scopes: ['openid', 'email', 'profile', 'id', 'offline'],
    });
  });
});

describe('passflowReducer found scopes', () => {
  it('applies the rule to the current state, so the first value found wins', () => {
    const start = { ...initialState, handOff: {} };
    const afterDiscovery = passflowReducer(start, { type: 'SET_FOUND_SCOPES', found: ['openid', 'email'] });
    const afterDefaults = passflowReducer(afterDiscovery, { type: 'SET_FOUND_SCOPES', found: ['openid', 'phone'] });

    expect(afterDefaults.handOff?.scopes).toEqual(['openid', 'email', 'id']);
    expect(afterDefaults.scopes).toEqual(['openid', 'email', 'id', 'offline']);
  });

  it('returns the same state when there is nothing to write', () => {
    const start = { ...initialState, handOff: { scopes: ['openid'] } };
    expect(passflowReducer(start, { type: 'SET_FOUND_SCOPES', found: ['openid', 'email'] })).toBe(start);
  });
});
