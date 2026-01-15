import type { DefaultMethod } from '@/types';
import type { InternalStrategyChallenge } from '@passflow/passflow-js-sdk';
/* eslint-disable complexity */
import { eq } from 'lodash';
import type { AuthMethods } from './get-auth-methods';

export const getIdentityLabel = (methods: AuthMethods, type: 'label' | 'button') => {
  if (methods.hasSignInEmailMethods && methods.hasSignInUsernameMethods)
    return eq(type, 'label') ? 'Email or username' : 'Use email or username';
  if (methods.hasSignInEmailMethods) return eq(type, 'label') ? 'Email' : 'Use email';
  if (methods.hasSignInUsernameMethods) return eq(type, 'label') ? 'Username' : 'Use username';

  return null;
};

export const getPasswordlessData = (
  methods: AuthMethods,
  currentMethod: DefaultMethod | null,
): { label: string; challengeType: InternalStrategyChallenge } | null => {
  if (eq(currentMethod, 'phone')) {
    if (methods.internal.phone.otp) return { label: 'SMS code', challengeType: 'otp' };
    if (methods.internal.phone.magicLink) return { label: 'SMS link', challengeType: 'magic_link' };
  }

  if (eq(currentMethod, 'email_or_username')) {
    if (methods.internal.email.otp) return { label: 'email code', challengeType: 'otp' };
    if (methods.internal.email.magicLink) return { label: 'email link', challengeType: 'magic_link' };
  }

  return null;
};

export const getValidationErrorsLabel = (methods: AuthMethods) => {
  if (methods.hasSignInEmailMethods && methods.hasSignInUsernameMethods) return 'Email or username is required';
  if (methods.hasSignInEmailMethods) return 'Email is required';
  if (methods.hasSignInUsernameMethods) return 'Username is required';

  return 'Field is required';
};
