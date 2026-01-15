import { type Mock, vi } from 'vitest';

type MockFn = Mock<(...args: any[]) => any>;

export const createMockPassflow = (): Record<string, MockFn> => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  passwordlessSignIn: vi.fn(),
  passkeyAuthenticate: vi.fn(),
  passkeyRegister: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  resetPassword: vi.fn(),
  completeChallenge: vi.fn(),
  getAppSettings: vi.fn(),
  getPasswordPolicySettings: vi.fn(),
  getTokens: vi.fn(),
  logOut: vi.fn(),
  beginTwoFactorSetup: vi.fn(),
  confirmTwoFactorSetup: vi.fn(),
  verifyTwoFactor: vi.fn(),
  getTwoFactorStatus: vi.fn(),
  disableTwoFactor: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
});

export type MockPassflow = ReturnType<typeof createMockPassflow>;
