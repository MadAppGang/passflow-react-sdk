export type PreferIdentity = 'identity' | 'phone' | 'none';

export type DefaultMethod = 'email_or_username' | 'phone';

export type PreferChallenge = 'passkey' | 'password' | 'otp' | 'magic_link';

export type SuccessAuthRedirect = string;

export type { TwoFactorErrorType, TwoFactorError } from './two-factor-errors';

// Re-export 2FA types from @passflow/core
export type {
  TwoFactorMethod,
  TwoFactorChallengeResponse,
  RegisteredTwoFactorMethod,
  TwoFactorVerifyRequestV2,
  TwoFactorVerifyResponseV2,
} from '@passflow/core';

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
