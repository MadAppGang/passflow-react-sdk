import { AuthStrategies, FirstFactorFim, FirstFactorInternal, Providers } from '@passflow/passflow-js-sdk';
import { eq } from 'lodash';

export type AuthMethods = {
  username: {
    password: boolean;
    passkey: boolean;
  };
  email: {
    password: boolean;
    otp: boolean;
    magicLink: boolean;
    passkey: boolean;
  };
  phone: {
    password: boolean;
    otp: boolean;
    magicLink: boolean;
    passkey: boolean;
  };
  providers: Providers[];
  hasEmailMethods: boolean;
  hasSignInEmailMethods: boolean;
  hasPhoneMethods: boolean;
  hasSignInPhoneMethods: boolean;
  hasUsernameMethods: boolean;
  hasSignInUsernameMethods: boolean;
};

export const getAuthMethods = (strategies?: AuthStrategies[]): AuthMethods => {
  const methods: AuthMethods = {
    username: {
      password: false,
      passkey: false,
    },
    email: {
      password: false,
      otp: false,
      magicLink: false,
      passkey: false,
    },
    phone: {
      password: false,
      otp: false,
      magicLink: false,
      passkey: false,
    },
    providers: [],
    hasEmailMethods: false,
    hasSignInEmailMethods: false,
    hasPhoneMethods: false,
    hasSignInPhoneMethods: false,
    hasUsernameMethods: false,
    hasSignInUsernameMethods: false,
  };

  if (!strategies) return methods;

  // eslint-disable-next-line complexity
  strategies.forEach((strategy: AuthStrategies) => {
    const { identity, challenge, fim_type: fimType } = strategy.strategy as FirstFactorInternal & FirstFactorFim;

    switch (strategy.type) {
      case 'first_factor_internal':
        switch (identity) {
          case 'email':
            if (eq(challenge, 'magic_link')) methods.email.magicLink = true;
            else methods.email[challenge as keyof AuthMethods['email']] = true;
            methods.hasEmailMethods = true;

            if (methods.email.magicLink || methods.email.otp || methods.email.password) methods.hasSignInEmailMethods = true;

            break;
          case 'phone':
            if (eq(challenge, 'magic_link')) methods.phone.magicLink = true;
            else methods.phone[challenge as keyof AuthMethods['phone']] = true;
            methods.hasPhoneMethods = true;

            if (methods.phone.magicLink || methods.phone.otp || methods.phone.password) methods.hasSignInPhoneMethods = true;

            break;
          case 'username':
            methods.username[challenge as keyof AuthMethods['username']] = true;
            methods.hasUsernameMethods = true;

            if (methods.username.password) methods.hasSignInUsernameMethods = true;

            break;
          default:
            throw new Error(`Unsupported identity type: ${identity}`);
        }
        break;
      case 'first_factor_fim':
        methods.providers.push(fimType);
        break;
      default:
        throw new Error(`Unsupported strategy type: ${strategy.type}`);
    }
  });

  return methods;
};
