export type PreferIdentity = 'identity' | 'phone' | 'none';

export type DefaultMethod = 'email_or_username' | 'phone';

export type PreferChallenge = 'passkey' | 'password' | 'otp' | 'magic_link';

export type SuccessAuthRedirect = string;

export type FederatedLanding = 'app' | 'login-page';

// Re-export 2FA types from @passflow/core
export type {
  RegisteredTwoFactorMethod,
  TwoFactorChallengeResponse,
  TwoFactorMethod,
  TwoFactorVerifyRequestV2,
  TwoFactorVerifyResponseV2,
} from '@passflow/core';
export type { AuthErrorScope, AuthFlow, AuthOperation, AuthUiError } from './auth-errors';
export type { DeviceError, DeviceErrorType } from './device-errors';
export type { EmailCodeStep, EmailVerificationStep } from './email-verification';
export type { TwoFactorError, TwoFactorErrorType } from './two-factor-errors';

// React-specific hook return types
export interface UseTwoFactorChallengeReturn {
  challenge: import('@passflow/core').TwoFactorChallengeResponse | null;
  isLoading: boolean;
  error: Error | null;
  requestChallenge: (firstFactorMethod?: string) => Promise<void>;
  verify: (response: string, trustDevice?: boolean) => Promise<void>;
  switchMethod: (method: import('@passflow/core').TwoFactorMethod) => Promise<void>;
  selectedMethod: import('@passflow/core').TwoFactorMethod | null;
}

export interface UseTwoFactorMethodsReturn {
  availableMethods: import('@passflow/core').TwoFactorMethod[];
  registeredMethods: import('@passflow/core').RegisteredTwoFactorMethod[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  removeMethod: (methodId: string) => Promise<void>;
}
