export type PreferIdentity = 'identity' | 'phone' | 'none';

export type DefaultMethod = 'email_or_username' | 'phone';

export type PreferChallenge = 'passkey' | 'password' | 'otp' | 'magic_link';

export type SuccessAuthRedirect = string;

export type { TwoFactorErrorType, TwoFactorError } from './two-factor-errors';
