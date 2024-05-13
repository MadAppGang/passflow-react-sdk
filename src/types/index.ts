import { AppSettings, Providers } from '@aooth/aooth-js-sdk';

export type PreferIdentity = 'identity' | 'phone' | 'none';

export type PreferChallenge = 'passkey' | 'password' | 'otp' | 'magic_link';

export type SuccessAuthRedirect = string;

export type CombinedAppSettigns = AppSettings & {
  PROVIDERS: Providers[];
  INTERNAL: { [key: string]: { challenge: string; transport: string }[] };
  IDENTITY_FIELDS: string[];
  IDENTITY_FIELDS_PASSKEY: string[];
  CHALLENGES: string[];
};
