import type { AuthStrategies } from '@passflow/core';
import { describe, expect, it } from 'vitest';
import { getAuthMethods } from '../get-auth-methods';

describe('getAuthMethods', () => {
  it('should return default methods when no strategies provided', () => {
    const result = getAuthMethods();

    expect(result).toEqual({
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
    });
  });

  it('should return default methods when empty strategies array provided', () => {
    const result = getAuthMethods([]);

    expect(result).toEqual({
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
    });
  });

  it('should enable email password authentication', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'email', challenge: 'password', transport: 'none' },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.email.password).toBe(true);
    expect(result.hasEmailMethods).toBe(true);
    expect(result.hasSignInEmailMethods).toBe(true);
  });

  it('should enable email OTP authentication', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'email', challenge: 'otp', transport: 'email' },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.email.otp).toBe(true);
    expect(result.hasEmailMethods).toBe(true);
    expect(result.hasSignInEmailMethods).toBe(true);
  });

  it('should enable email magic link authentication', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'email', challenge: 'magic_link', transport: 'email' },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.email.magicLink).toBe(true);
    expect(result.hasEmailMethods).toBe(true);
    expect(result.hasSignInEmailMethods).toBe(true);
  });

  it('should enable phone password authentication', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'phone', challenge: 'password', transport: 'none' },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.phone.password).toBe(true);
    expect(result.hasPhoneMethods).toBe(true);
    expect(result.hasSignInPhoneMethods).toBe(true);
  });

  it('should enable phone OTP authentication', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'phone', challenge: 'otp', transport: 'sms' },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.phone.otp).toBe(true);
    expect(result.hasPhoneMethods).toBe(true);
    expect(result.hasSignInPhoneMethods).toBe(true);
  });

  it('should enable phone magic link authentication', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'phone', challenge: 'magic_link', transport: 'sms' },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.phone.magicLink).toBe(true);
    expect(result.hasPhoneMethods).toBe(true);
    expect(result.hasSignInPhoneMethods).toBe(true);
  });

  it('should enable username password authentication', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'username', challenge: 'password', transport: 'none' },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.username.password).toBe(true);
    expect(result.hasUsernameMethods).toBe(true);
    expect(result.hasSignInUsernameMethods).toBe(true);
  });

  it('should enable passkey authentication', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'passkey',
        strategy: {},
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.passkey).toBe(true);
  });

  it('should enable FIM providers', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'fim',
        strategy: { fim_type: 'google' as any },
      },
      {
        type: 'fim',
        strategy: { fim_type: 'github' as any },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.fim.providers).toEqual(['google', 'github']);
  });

  it('should handle multiple authentication methods', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'email', challenge: 'password', transport: 'none' },
      },
      {
        type: 'internal',
        strategy: { identity: 'email', challenge: 'otp', transport: 'email' },
      },
      {
        type: 'internal',
        strategy: { identity: 'username', challenge: 'password', transport: 'none' },
      },
      {
        type: 'passkey',
        strategy: {},
      },
      {
        type: 'fim',
        strategy: { fim_type: 'google' as any },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.email.password).toBe(true);
    expect(result.internal.email.otp).toBe(true);
    expect(result.internal.username.password).toBe(true);
    expect(result.passkey).toBe(true);
    expect(result.fim.providers).toEqual(['google']);
    expect(result.hasEmailMethods).toBe(true);
    expect(result.hasSignInEmailMethods).toBe(true);
    expect(result.hasUsernameMethods).toBe(true);
    expect(result.hasSignInUsernameMethods).toBe(true);
  });

  it('should throw error for unsupported identity type', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'invalid' as any, challenge: 'password', transport: 'none' },
      },
    ];

    expect(() => getAuthMethods(strategies)).toThrow('Unsupported identity type: invalid');
  });

  it('should throw error for unsupported strategy type', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'invalid' as any,
        strategy: {},
      },
    ];

    expect(() => getAuthMethods(strategies)).toThrow('Unsupported strategy type: invalid');
  });

  it('should enable all email methods', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'email', challenge: 'password', transport: 'none' },
      },
      {
        type: 'internal',
        strategy: { identity: 'email', challenge: 'otp', transport: 'email' },
      },
      {
        type: 'internal',
        strategy: { identity: 'email', challenge: 'magic_link', transport: 'email' },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.email.password).toBe(true);
    expect(result.internal.email.otp).toBe(true);
    expect(result.internal.email.magicLink).toBe(true);
    expect(result.hasEmailMethods).toBe(true);
    expect(result.hasSignInEmailMethods).toBe(true);
  });

  it('should enable all phone methods', () => {
    const strategies: AuthStrategies[] = [
      {
        type: 'internal',
        strategy: { identity: 'phone', challenge: 'password', transport: 'none' },
      },
      {
        type: 'internal',
        strategy: { identity: 'phone', challenge: 'otp', transport: 'sms' },
      },
      {
        type: 'internal',
        strategy: { identity: 'phone', challenge: 'magic_link', transport: 'sms' },
      },
    ];

    const result = getAuthMethods(strategies);

    expect(result.internal.phone.password).toBe(true);
    expect(result.internal.phone.otp).toBe(true);
    expect(result.internal.phone.magicLink).toBe(true);
    expect(result.hasPhoneMethods).toBe(true);
    expect(result.hasSignInPhoneMethods).toBe(true);
  });
});
