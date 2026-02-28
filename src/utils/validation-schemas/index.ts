/* eslint-disable complexity */
/* eslint-disable max-len */
import type { PassflowPasswordPolicySettings } from '@passflow/core';
import { size } from 'lodash';
import * as Yup from 'yup';

export const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const phoneNumberRegex =
  /^(\+{0,})(\d{0,})([(]{1}\d{1,3}[)]{0,}){0,}(\s?\d+|\+\d{2,3}\s{1}\d+|\d+){1}[\s|-]?\d+([\s|-]?\d+){1,2}(\s){0,}$/gm;

export const passwordValidation = (passwordPolicy: PassflowPasswordPolicySettings | null) =>
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

          return new Yup.ValidationError(validationError, value, 'password');
        }

        return true;
      },
    });
