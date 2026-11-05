import { afterEach, describe, expect, it } from 'vitest';
import { isSignInPage } from '../is-sign-in-page';

describe('isSignInPage', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('matches the sign-in page, whatever its spelling', () => {
    window.history.replaceState(null, '', '/web/signup');
    for (const target of [
      `${window.location.origin}/web/signin`,
      `${window.location.origin}/web/signin/`,
      `${window.location.origin}/web/signin?appid=x#y`,
      '/web/signin',
    ]) {
      expect(isSignInPage(target, '/web/signin')).toBe(true);
    }
  });

  it('does not match another page or another host', () => {
    expect(isSignInPage(`${window.location.origin}/web/signup`, '/web/signin')).toBe(false);
    expect(isSignInPage('https://app.example.test/web/signin', '/web/signin')).toBe(false);
    expect(isSignInPage('/signin', '/web/signin')).toBe(false);
  });
});
