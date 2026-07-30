export type AuthErrorScope = 'form' | 'identity' | 'password' | 'credentials';

export type AuthUiError = {
  message: string;
  scope: AuthErrorScope;
};

export type AuthOperation = 'password' | 'passwordless' | 'passkey';
export type AuthFlow = 'sign-in' | 'sign-up';
