/* eslint-disable complexity */
import { eq } from 'lodash';
import { AuthMethods } from '../get-auth-methods';
import { DefaultMethod } from '@/types';
import { ChallengeType } from '@passflow/passflow-js-sdk';

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
): { label: string; challengeType: ChallengeType } | null => {
  if (eq(currentMethod, 'phone')) {
    if (methods.phone.otp) return { label: 'SMS code', challengeType: 'otp' };
    if (methods.phone.magicLink) return { label: 'SMS link', challengeType: 'magic_link' };
  }

  if (eq(currentMethod, 'email_or_username')) {
    if (methods.email.otp) return { label: 'email code', challengeType: 'otp' };
    if (methods.email.magicLink) return { label: 'email link', challengeType: 'magic_link' };
  }

  return null;
};

export const getValidationErrorsLabel = (methods: AuthMethods) => {
  if (methods.hasSignInEmailMethods && methods.hasSignInUsernameMethods) return 'Email or username is required';
  if (methods.hasSignInEmailMethods) return 'Email is required';
  if (methods.hasSignInUsernameMethods) return 'Username is required';

  return 'Field is required';
};
