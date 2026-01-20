import { PassflowFlow } from '@/components/flow';
import type { PassflowConfig } from '@passflow/core';
import React, { type FC, type PropsWithChildren } from 'react';
import { PassflowProvider } from './components/provider';

const passflowConfig: PassflowConfig = {
  url: process.env.PASSFLOW_URL ?? 'http://localhost:5432',
  appId: process.env.PASSFLOW_APP_ID ?? 'test_app_id',
  createTenantForNewUser: true,
  scopes: ['id', 'offline', 'tenant', 'email', 'oidc', 'openid', 'access:tenant:all'],
};

export const PassflowProviderWrapper: FC<PropsWithChildren> = ({ children }) => {
  return (
    <PassflowProvider
      url={passflowConfig.url}
      appId={passflowConfig.appId}
      // createTenantForNewUser={passflowConfig.createTenantForNewUser}
      // scopes={passflowConfig.scopes}
      router='react-router'
    >
      {children}
    </PassflowProvider>
  );
};

export const App = () => (
  <PassflowProviderWrapper>
    <PassflowFlow pathPrefix='/web' />
  </PassflowProviderWrapper>
);

export default App;
