import type { AuthStrategies, FimStrategy, InternalStrategy, Providers } from '@passflow/passflow-js-sdk';
import { eq } from 'lodash';

export type AuthMethods = {
  internal: {
    username: {
      password: boolean;
    };
    email: {
      password: boolean;
      otp: boolean;
      magicLink: boolean;
    };
    phone: {
      password: boolean;
      otp: boolean;
      magicLink: boolean;
    };
  };
  fim: {
    providers: Providers[];
  };
  passkey: boolean;
  hasEmailMethods: boolean;
  hasSignInEmailMethods: boolean;
  hasPhoneMethods: boolean;
  hasSignInPhoneMethods: boolean;
  hasUsernameMethods: boolean;
  hasSignInUsernameMethods: boolean;
};

export const getAuthMethods = (strategies?: AuthStrategies[]): AuthMethods => {
  const methods: AuthMethods = {
    internal: {
      username: {
        password: false,
      },
      email: {
        password: false,
        otp: false,
        magicLink: false,
      },
      phone: {
        password: false,
        otp: false,
        magicLink: false,
      },
    },
    fim: {
      providers: [],
    },
    passkey: false,
    hasEmailMethods: false,
    hasSignInEmailMethods: false,
    hasPhoneMethods: false,
    hasSignInPhoneMethods: false,
    hasUsernameMethods: false,
    hasSignInUsernameMethods: false,
  };

  if (!strategies) return methods;

  for (const strategy of strategies) {
    const { identity, challenge, fim_type: fimType } = strategy.strategy as InternalStrategy & FimStrategy;

    switch (strategy.type) {
      case 'internal':
        switch (identity) {
          case 'email':
            if (eq(challenge, 'magic_link')) methods.internal.email.magicLink = true;
            else methods.internal.email[challenge as keyof AuthMethods['internal']['email']] = true;
            methods.hasEmailMethods = true;

            if (methods.internal.email.magicLink || methods.internal.email.otp || methods.internal.email.password)
              methods.hasSignInEmailMethods = true;

            break;
          case 'phone':
            if (eq(challenge, 'magic_link')) methods.internal.phone.magicLink = true;
            else methods.internal.phone[challenge as keyof AuthMethods['internal']['phone']] = true;
            methods.hasPhoneMethods = true;

            if (methods.internal.phone.magicLink || methods.internal.phone.otp || methods.internal.phone.password)
              methods.hasSignInPhoneMethods = true;

            break;
          case 'username':
            methods.internal.username[challenge as keyof AuthMethods['internal']['username']] = true;
            methods.hasUsernameMethods = true;

            if (methods.internal.username.password) methods.hasSignInUsernameMethods = true;

            break;
          default:
            throw new Error(`Unsupported identity type: ${identity}`);
        }
        break;
      case 'fim':
        methods.fim.providers.push(fimType);
        break;
      case 'passkey':
        methods.passkey = true;
        break;
      default:
        throw new Error(`Unsupported strategy type: ${strategy.type}`);
    }
  }

  return methods;
};
