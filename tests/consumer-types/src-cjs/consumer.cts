// A CommonJS consumer: in a .cts file `import` compiles to require(), so TypeScript resolves the package's
// "require" condition (dist/index.cjs, typed by dist/src/index.d.cts). Same canaries as src/consumer.tsx.
import {
  FieldOtp,
  type FieldOtpProps,
  Passflow,
  type PassflowConfig,
  PassflowFlow,
  type PassflowProps,
  type PassflowProvider,
  type TwoFactorSetupMagicLinkFlow,
  type useAuth,
} from '@passflow/react';
import { createElement } from 'react';

type IsAny<T> = 0 extends 1 & T ? true : false;
type ExpectFalse<T extends false> = T;

export type Canaries = [
  ExpectFalse<IsAny<typeof PassflowProvider>>,
  ExpectFalse<IsAny<typeof PassflowFlow>>,
  ExpectFalse<IsAny<typeof TwoFactorSetupMagicLinkFlow>>,
  ExpectFalse<IsAny<ReturnType<typeof useAuth>>>,
  ExpectFalse<IsAny<FieldOtpProps>>,
  ExpectFalse<IsAny<PassflowProps>>,
  ExpectFalse<IsAny<PassflowConfig>>,
  ExpectFalse<IsAny<typeof Passflow>>,
];

export const flow = createElement(PassflowFlow, { pathPrefix: '/web', routerType: 'memory' });
export const zeroConfigFlow = createElement(PassflowFlow);

// @ts-expect-error routerType is a closed union
export const badFlowProps: PassflowProps = { routerType: 'electron' };

export const otp = createElement(FieldOtp, {
  id: 'code',
  length: 6,
  value: '',
  onChange: (value: string) => void value,
  labelledBy: 'code-label',
});

// @ts-expect-error scopes is a string array
export const badConfig: PassflowConfig = { scopes: 'openid' };

export const createClient = (): Passflow => new Passflow({ url: 'https://auth.example.com', appId: 'app' });
