import { describe, expect, it } from 'vitest';
import type { AuthMethods } from '../get-auth-methods';
import { getIdentityLabel, getPasswordlessData, getValidationErrorsLabel } from '../get-form-labels';

describe('getIdentityLabel', () => {
  it('should return email or username label when both are enabled', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: true },
        email: { password: true, otp: false, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: true,
      hasSignInEmailMethods: true,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: true,
      hasSignInUsernameMethods: true,
    };

    expect(getIdentityLabel(methods, 'label')).toBe('Email or username');
    expect(getIdentityLabel(methods, 'button')).toBe('Use email or username');
  });

  it('should return email label when only email is enabled', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: true, otp: false, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: true,
      hasSignInEmailMethods: true,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    expect(getIdentityLabel(methods, 'label')).toBe('Email');
    expect(getIdentityLabel(methods, 'button')).toBe('Use email');
  });

  it('should return username label when only username is enabled', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: true },
        email: { password: false, otp: false, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: false,
      hasSignInEmailMethods: false,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: true,
      hasSignInUsernameMethods: true,
    };

    expect(getIdentityLabel(methods, 'label')).toBe('Username');
    expect(getIdentityLabel(methods, 'button')).toBe('Use username');
  });

  it('should return null when no sign-in methods are enabled', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: false, otp: false, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: false,
      hasSignInEmailMethods: false,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    expect(getIdentityLabel(methods, 'label')).toBeNull();
    expect(getIdentityLabel(methods, 'button')).toBeNull();
  });
});

describe('getPasswordlessData', () => {
  it('should return SMS code for phone OTP', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: false, otp: false, magicLink: false },
        phone: { password: false, otp: true, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: false,
      hasSignInEmailMethods: false,
      hasPhoneMethods: true,
      hasSignInPhoneMethods: true,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    const result = getPasswordlessData(methods, 'phone');

    expect(result).toEqual({
      label: 'SMS code',
      challengeType: 'otp',
    });
  });

  it('should return SMS link for phone magic link', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: false, otp: false, magicLink: false },
        phone: { password: false, otp: false, magicLink: true },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: false,
      hasSignInEmailMethods: false,
      hasPhoneMethods: true,
      hasSignInPhoneMethods: true,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    const result = getPasswordlessData(methods, 'phone');

    expect(result).toEqual({
      label: 'SMS link',
      challengeType: 'magic_link',
    });
  });

  it('should return email code for email or username with OTP', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: false, otp: true, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: true,
      hasSignInEmailMethods: true,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    const result = getPasswordlessData(methods, 'email_or_username');

    expect(result).toEqual({
      label: 'email code',
      challengeType: 'otp',
    });
  });

  it('should return email link for email or username with magic link', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: false, otp: false, magicLink: true },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: true,
      hasSignInEmailMethods: true,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    const result = getPasswordlessData(methods, 'email_or_username');

    expect(result).toEqual({
      label: 'email link',
      challengeType: 'magic_link',
    });
  });

  it('should prioritize OTP over magic link for phone', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: false, otp: false, magicLink: false },
        phone: { password: false, otp: true, magicLink: true },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: false,
      hasSignInEmailMethods: false,
      hasPhoneMethods: true,
      hasSignInPhoneMethods: true,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    const result = getPasswordlessData(methods, 'phone');

    expect(result).toEqual({
      label: 'SMS code',
      challengeType: 'otp',
    });
  });

  it('should prioritize OTP over magic link for email', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: false, otp: true, magicLink: true },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: true,
      hasSignInEmailMethods: true,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    const result = getPasswordlessData(methods, 'email_or_username');

    expect(result).toEqual({
      label: 'email code',
      challengeType: 'otp',
    });
  });

  it('should return null when no passwordless methods available', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: true },
        email: { password: true, otp: false, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: true,
      hasSignInEmailMethods: true,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: true,
      hasSignInUsernameMethods: true,
    };

    expect(getPasswordlessData(methods, 'phone')).toBeNull();
    expect(getPasswordlessData(methods, 'email_or_username')).toBeNull();
  });

  it('should return null for null current method', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: false, otp: true, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: true,
      hasSignInEmailMethods: true,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    expect(getPasswordlessData(methods, null)).toBeNull();
  });
});

describe('getValidationErrorsLabel', () => {
  it('should return email or username error when both are enabled', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: true },
        email: { password: true, otp: false, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: true,
      hasSignInEmailMethods: true,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: true,
      hasSignInUsernameMethods: true,
    };

    expect(getValidationErrorsLabel(methods)).toBe('Email or username is required');
  });

  it('should return email error when only email is enabled', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: true, otp: false, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: true,
      hasSignInEmailMethods: true,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    expect(getValidationErrorsLabel(methods)).toBe('Email is required');
  });

  it('should return username error when only username is enabled', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: true },
        email: { password: false, otp: false, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: false,
      hasSignInEmailMethods: false,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: true,
      hasSignInUsernameMethods: true,
    };

    expect(getValidationErrorsLabel(methods)).toBe('Username is required');
  });

  it('should return generic error when no sign-in methods are enabled', () => {
    const methods: AuthMethods = {
      internal: {
        username: { password: false },
        email: { password: false, otp: false, magicLink: false },
        phone: { password: false, otp: false, magicLink: false },
      },
      fim: { providers: [] },
      passkey: false,
      hasEmailMethods: false,
      hasSignInEmailMethods: false,
      hasPhoneMethods: false,
      hasSignInPhoneMethods: false,
      hasUsernameMethods: false,
      hasSignInUsernameMethods: false,
    };

    expect(getValidationErrorsLabel(methods)).toBe('Field is required');
  });
});
