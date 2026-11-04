export type AuthErrorScope = 'form' | 'identity' | 'password' | 'credentials';

export type AuthUiError = {
  message: string;
  scope: AuthErrorScope;
  /** The request behind this form is gone, so the screen offers a full reload without its parent challenge. */
  startAgain?: boolean;
};

export type AuthOperation = 'password' | 'passwordless' | 'passkey';
export type AuthFlow = 'sign-in' | 'sign-up';
