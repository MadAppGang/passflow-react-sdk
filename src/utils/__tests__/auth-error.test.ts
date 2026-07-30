import { authErrorFor } from '../auth-error';

describe('authErrorFor', () => {
  it('scopes bad password sign-in to credentials', () => {
    expect(authErrorFor('sign-in', 'password')).toEqual({
      message: "We couldn't sign you in. Check your details and try again.",
      scope: 'credentials',
    });
  });

  it('keeps passwordless and registration failures at form scope', () => {
    expect(authErrorFor('sign-in', 'passwordless').scope).toBe('form');
    expect(authErrorFor('sign-up', 'password').scope).toBe('form');
    expect(authErrorFor('sign-up', 'passkey').message).not.toMatch(/status code|request failed|exception/i);
  });
});
