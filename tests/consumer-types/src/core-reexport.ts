// @passflow/react re-exports @passflow/core (`export * from '@passflow/core'`). Since core 0.20.1 ships
// node16-safe declarations, this is checked in every leg like the package's own types.
import { Passflow, type PassflowConfig } from '@passflow/react';

type IsAny<T> = 0 extends 1 & T ? true : false;
type ExpectFalse<T extends false> = T;

export type Canaries = [ExpectFalse<IsAny<PassflowConfig>>, ExpectFalse<IsAny<typeof Passflow>>];

export const config: PassflowConfig = { url: 'https://auth.example.com', appId: 'app', scopes: ['openid'] };

// @ts-expect-error scopes is a string array
export const badConfig: PassflowConfig = { scopes: 'openid' };

export const createClient = (): Passflow => new Passflow(config);
