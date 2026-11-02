// A consumer of the packed @passflow/react, type-checked (never run) in every leg.
// Canaries: each `ExpectFalse<IsAny<…>>` and each `@ts-expect-error` below fails the leg if an
// import silently resolves to `any`, so a leg cannot pass vacuously.
import {
  FieldOtp,
  type FieldOtpProps,
  PassflowFlow,
  type PassflowProps,
  PassflowProvider,
  TwoFactorSetupMagicLinkFlow,
  useAuth,
} from '@passflow/react';
import type { ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';


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
];

const flowProps: PassflowProps = { pathPrefix: '/web', routerType: 'memory' };

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
      <BrowserRouter>
        <Routes>
          <Route path='/auth/*' element={<PassflowFlow {...flowProps} />} />
          <Route
            path='/2fa/setup/:token'
            element={<TwoFactorSetupMagicLinkFlow signInPath='/auth/signin' onSuccess={() => undefined} />}
          />
        </Routes>
      </BrowserRouter>
      <FieldOtp {...otpProps} />
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
