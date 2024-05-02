/* eslint-disable complexity */
/* eslint-disable max-len */
import { PreferIdentity } from '@/types';
import { AoothPasswordPolicySettings, ChallengeType } from '@aooth/aooth-js-sdk';
import { size } from 'lodash';
import * as Yup from 'yup';

type AuthStrategy = {
  identity: PreferIdentity;
  challenge: ChallengeType;
};

export const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const phoneNumberRegex =
  /^(\+{0,})(\d{0,})([(]{1}\d{1,3}[)]{0,}){0,}(\s?\d+|\+\d{2,3}\s{1}\d+|\d+){1}[\s|-]?\d+([\s|-]?\d+){1,2}(\s){0,}$/gm;

const passwordValidation = (passwordPolicy: AoothPasswordPolicySettings | null) =>
  Yup.string()
    .required()
    .test({
      test: (value: string) => {
        const errors: string[] = [];

        if (passwordPolicy) {
          const {
            min_password_length: minPasswordLength,
            require_lowercase: requireLowerCase,
            require_number: requireNumber,
            require_symbol: requireSymbol,
            require_uppercase: requireUpperCase,
          } = passwordPolicy;

          if (size(value) < minPasswordLength) errors.push('length');
          if (requireUpperCase && !/[A-Z]/.test(value)) errors.push('uppercase');
          if (requireLowerCase && !/[a-z]/.test(value)) errors.push('lowercase');
          if (requireNumber && !/\d/.test(value)) errors.push('number');
          if (requireSymbol && !/[!@#$%^&*()_+{}[\]:;<>,.?~\\-]/.test(value)) errors.push('symbol');
        }

        if (errors.length > 0) {
          const validationError = {
            errors,
            inner: true,
            path: 'password',
            field: 'password',
            message: errors,
            value,
            name: 'ValidationError',
          } as Yup.ValidationError & {
            inner: boolean;
            field: string;
            message: string[];
          };

          throw new Yup.ValidationError(validationError, value, 'password');
        }

        return true;
      },
    });

export const validationSingUpSchemas = (fields: AuthStrategy, passwordPolicy: AoothPasswordPolicySettings | null) => {
  const { identity, challenge } = fields;

  if (identity === 'identity' && challenge === 'password') {
    return Yup.object().shape({
      identity: Yup.string().min(1).required(),
      password: passwordValidation(passwordPolicy),
    });
  }

  if (identity === 'phone' && challenge === 'password') {
    return Yup.object().shape({
      phone: Yup.string().min(2).matches(phoneNumberRegex).required(),
      password: passwordValidation(passwordPolicy),
    });
  }

  if (identity === 'identity' && challenge === 'none') {
    return Yup.object().shape({
      identity: Yup.string().min(1).required(),
    });
  }

  if (identity === 'phone' && challenge === 'none') {
    return Yup.object().shape({
      phone: Yup.string().min(6).matches(phoneNumberRegex).required(),
    });
  }

  return Yup.object().shape({});
};

export const validationSingInSchemas = (fields: AuthStrategy) => {
  const { identity, challenge } = fields;

  const passwordValidationRequired = Yup.string().test({
    test: (value?: string) => {
      if (size(value) > 0) return true;
      return false;
    },
  });

  if (identity === 'identity' && challenge === 'password') {
    return Yup.object().shape({
      identity: Yup.string().min(1).required(),
      password: passwordValidationRequired,
    });
  }

  if (identity === 'phone' && challenge === 'password') {
    return Yup.object().shape({
      phone: Yup.string().min(2).matches(phoneNumberRegex).required(),
      password: passwordValidationRequired,
    });
  }

  if (identity === 'identity' && challenge === 'none') {
    return Yup.object().shape({
      identity: Yup.string().min(1).required(),
    });
  }

  if (identity === 'phone' && challenge === 'none') {
    return Yup.object().shape({
      phone: Yup.string().min(6).matches(phoneNumberRegex).required(),
    });
  }

  return Yup.object().shape({});
};

export const validationResetPasswordSchema = (passwordPolicy: AoothPasswordPolicySettings | null) =>
  Yup.object().shape({
    password: passwordValidation(passwordPolicy),
  });

export const validationForgotPasswordSchema = (identity: PreferIdentity) => {
  if (identity === 'identity') {
    return Yup.object().shape({
      identity: Yup.string().min(1).required(),
    });
  }

  if (identity === 'phone') {
    return Yup.object().shape({
      phone: Yup.string().min(6).matches(phoneNumberRegex).required(),
    });
  }

  return Yup.object().shape({});
};
