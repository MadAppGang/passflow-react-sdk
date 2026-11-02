import { describe, expect, test } from 'vitest';
import { createMemoryHistory, detectPrefix, isUnderPrefix, matchScreen, normalizePrefix, screenPath } from '../flow-router';

describe('normalizePrefix', () => {
  test.each([
    [undefined, ''],
    ['', ''],
    ['/', ''],
    ['auth', '/auth'],
    ['/auth/', '/auth'],
    ['//web//', '/web'],
    ['/a/b', '/a/b'],
  ])('%s → %s', (input, expected) => expect(normalizePrefix(input)).toBe(expected));
});

describe('matchScreen', () => {
  test('matches a screen at the root and under a prefix', () => {
    expect(matchScreen('/signin', '')).toEqual({ screen: 'signin', params: {} });
    expect(matchScreen('/auth/signup', '/auth')).toEqual({ screen: 'signup', params: {} });
    expect(matchScreen('/auth/signup/', '/auth')).toEqual({ screen: 'signup', params: {} });
  });

  test('prefers the longer path: /forgot-password/success is its own screen', () => {
    expect(matchScreen('/forgot-password/success', '')?.screen).toBe('forgot_password_success');
    expect(matchScreen('/forgot-password', '')?.screen).toBe('forgot_password');
  });

  test('reads :token, decoded', () => {
    expect(matchScreen('/web/two-factor-setup-magic-link/ab%20c', '/web')).toEqual({
      screen: 'two_factor_setup_magic_link',
      params: { token: 'ab c' },
    });
  });

  test('no match outside the prefix, for unknown paths, or for screens the flow does not render', () => {
    expect(matchScreen('/signin', '/auth')).toBeNull();
    expect(matchScreen('/auth/nope', '/auth')).toBeNull();
    expect(matchScreen('/auth', '/auth')).toBeNull();
    expect(matchScreen('/passkeysss', '')).toBeNull();
  });
});

describe('detectPrefix', () => {
  test.each([
    ['/signin', ''],
    ['/', ''],
    ['', ''],
    ['/auth/signin', '/auth'],
    ['/auth/signin/', '/auth'],
    ['/auth', '/auth'],
    ['/auth/', '/auth'],
    ['/a/b/forgot-password/success', '/a/b'],
    ['/web/two-factor-setup-magic-link/token123', '/web'],
    ['/web/verify-challenge-otp', '/web'],
  ])('%s → %s', (pathname, expected) => expect(detectPrefix(pathname)).toBe(expected));
});

describe('screenPath', () => {
  test('joins the prefix and fills params', () => {
    expect(screenPath('signin', '')).toBe('/signin');
    expect(screenPath('two_factor_verify', '/auth')).toBe('/auth/two-factor-verify');
    expect(screenPath('two_factor_setup_magic_link', '/web', { token: 'a/b' })).toBe('/web/two-factor-setup-magic-link/a%2Fb');
  });
});

describe('isUnderPrefix', () => {
  test('everything is under the empty prefix; otherwise the prefix or below it', () => {
    expect(isUnderPrefix('/dashboard', '')).toBe(true);
    expect(isUnderPrefix('/auth', '/auth')).toBe(true);
    expect(isUnderPrefix('/auth/signin', '/auth')).toBe(true);
    expect(isUnderPrefix('/authors', '/auth')).toBe(false);
    expect(isUnderPrefix('/dashboard', '/auth')).toBe(false);
  });
});

describe('createMemoryHistory', () => {
  test('pushes, replaces and notifies; read is stable between changes', () => {
    const history = createMemoryHistory();
    let calls = 0;
    const unsubscribe = history.subscribe(() => {
      calls += 1;
    });
    const first = history.read();
    expect(history.read()).toBe(first);
    history.navigate({ pathname: '/signup', search: 'a=1' }, { replace: false });
    expect(history.read()).toEqual({ pathname: '/signup', search: '?a=1' });
    history.navigate({ pathname: '/signin', search: '' }, { replace: true });
    expect(history.read()).toEqual({ pathname: '/signin', search: '' });
    expect(calls).toBe(2);
    unsubscribe();
    history.navigate({ pathname: '/x', search: '' }, { replace: false });
    expect(calls).toBe(2);
  });
});
