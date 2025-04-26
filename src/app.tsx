import { PassflowFlow } from '@/components/flow';
import type { NavigateOptions } from '@/context';
import type { PassflowConfig } from '@passflow/passflow-js-sdk';
import React, { type FC, type PropsWithChildren } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { PassflowProvider } from './components/provider';

const passflowConfig: PassflowConfig = {
  url: process.env.PASSFLOW_URL ?? 'http://localhost:5432',
  appId: process.env.PASSFLOW_APP_ID ?? 'test_app_id',
  createTenantForNewUser: true,
  scopes: ['id', 'offline', 'tenant', 'email', 'oidc', 'openid', 'access:tenant:all'],
};

export const PassflowProviderWrapper: FC<PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <PassflowProvider
      url={passflowConfig.url}
      appId={passflowConfig.appId}
      createTenantForNewUser={passflowConfig.createTenantForNewUser}
      scopes={passflowConfig.scopes}
      navigate={(options: NavigateOptions) =>
        navigate(
          {
            pathname: options.to,
            search: options.search,
          },
          { replace: options.replace },
        )
      }
      router='react-router'
    >
      {children}
    </PassflowProvider>
  );
};

export const App = () => (
  <BrowserRouter>
    <PassflowProviderWrapper>
      <PassflowFlow
        federatedDisplayMode='redirect'
        successAuthRedirect='https://jwt.io'
        federatedCallbackUrl='https://jwt.io'
        pathPrefix='/web'
      />
    </PassflowProviderWrapper>
  </BrowserRouter>
);

export default App;
