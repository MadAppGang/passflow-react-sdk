// A consumer of the packed @passflow/react, type-checked (never run) in every leg.
// Canaries: each `ExpectFalse<IsAny<…>>` and each `@ts-expect-error` below fails the leg if an
// import silently resolves to `any`, so a leg cannot pass vacuously.
// No router is installed in any leg: the package must not need one.
import {
  FieldOtp,
  type FieldOtpProps,
  PassflowFlow,
  type PassflowFlowLocation,
  type PassflowFlowNavigate,
  type PassflowProps,
  PassflowProvider,
  TwoFactorSetupMagicLinkFlow,
  useAuth,
} from '@passflow/react';
import type { ReactElement } from 'react';

type IsAny<T> = 0 extends 1 & T ? true : false;
type ExpectFalse<T extends false> = T;

export type Canaries = [
  ExpectFalse<IsAny<typeof PassflowProvider>>,
  ExpectFalse<IsAny<typeof PassflowFlow>>,
  ExpectFalse<IsAny<typeof TwoFactorSetupMagicLinkFlow>>,
  ExpectFalse<IsAny<typeof useAuth>>,
  ExpectFalse<IsAny<ReturnType<typeof useAuth>>>,
  ExpectFalse<IsAny<typeof FieldOtp>>,
  ExpectFalse<IsAny<FieldOtpProps>>,
  ExpectFalse<IsAny<PassflowProps>>,
  ExpectFalse<IsAny<PassflowFlowLocation>>,
  ExpectFalse<IsAny<PassflowFlowNavigate>>,
];

const flowProps: PassflowProps = { pathPrefix: '/web', routerType: 'memory' };

// Full control: an app router hands over its location and navigate, together.
const location: PassflowFlowLocation = { pathname: '/auth/signin', search: '' };
const navigate: PassflowFlowNavigate = (to, { replace }) => void [to.pathname, to.search, replace];
export const controlledProps: PassflowProps = { location, navigate };

// @ts-expect-error location comes with navigate
export const locationOnly: PassflowProps = { location };

// @ts-expect-error routerType is a closed union
export const badFlowProps: PassflowProps = { routerType: 'electron' };

export const otpProps = {
  id: 'code',
  length: 6,
  value: '',
  onChange: (value: string) => void value,
  labelledBy: 'code-label',
  charset: 'numeric',
  state: 'error',
} satisfies FieldOtpProps;

export function App(): ReactElement {
  return (
    <PassflowProvider url='https://auth.example.com' appId='app'>
      <PassflowFlow />
      <PassflowFlow {...flowProps} />
      <PassflowFlow {...controlledProps} />
      <TwoFactorSetupMagicLinkFlow signInPath='/auth/signin' onSuccess={() => undefined} />
      <TwoFactorSetupMagicLinkFlow token='abc' />
      <FieldOtp {...otpProps} />
      <FieldOtp id='code-2' length={6} value='' onChange={() => undefined} label='Verification code' />
      {/* @ts-expect-error length is a number */}
      <FieldOtp {...otpProps} length='6' />
    </PassflowProvider>
  );
}

export function useIsSignedIn(): boolean {
  const auth = useAuth();
  // @ts-expect-error isAuthenticated is a function
  const notAFunction: boolean = auth.isAuthenticated;
  void notAFunction;
  return auth.isAuthenticated();
}
