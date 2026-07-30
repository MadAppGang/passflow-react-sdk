import type { AuthFlow, AuthOperation, AuthUiError } from '@/types';

const AUTH_ERROR_COPY: Record<AuthFlow, Record<AuthOperation, AuthUiError>> = {
  'sign-in': {
    password: {
      message: "We couldn't sign you in. Check your details and try again.",
      scope: 'credentials',
    },
    passwordless: {
      message: "We couldn't start passwordless sign-in. Check your connection and try again.",
      scope: 'form',
    },
    passkey: {
      message: "We couldn't complete passkey sign-in. Try again or use another sign-in method.",
      scope: 'form',
    },
  },
  'sign-up': {
    password: {
      message: "We couldn't create your account. Check the information you entered and try again.",
      scope: 'form',
    },
    passwordless: {
      message: "We couldn't start passwordless registration. Check your connection and try again.",
      scope: 'form',
    },
    passkey: {
      message: "We couldn't create your account with a passkey. Try again or choose another method.",
      scope: 'form',
    },
  },
};

export const authRedirectErrorMessage = "We couldn't continue this authentication request. Return to the app and try again.";

export const verificationLinkErrorMessage =
  'This verification link is invalid or incomplete. Request a new link or code and try again.';

export const invitationLinkErrorMessage = 'This invitation link is invalid or has expired.';

export const verificationRequestErrorMessage =
  'This verification request is no longer available. Start again to request a new link or code.';

export const authErrorFor = (flow: AuthFlow, operation: AuthOperation): AuthUiError => AUTH_ERROR_COPY[flow][operation];
