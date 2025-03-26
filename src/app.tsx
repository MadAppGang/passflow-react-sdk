import { PassflowFlow } from '@/components/flow';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { PassflowConfig } from '@passflow/passflow-js-sdk';
import { PassflowProvider } from './components/provider';
import { FC, PropsWithChildren } from 'react';

const passflowConfig: PassflowConfig = {
  url: process.env.PASSFLOW_URL ?? 'http://localhost:5432',
  appId: process.env.PASSFLOW_APP_ID ?? 'test_app_id',
  createTenantForNewUser: true,
  scopes: ['openid', 'email', 'profile', 'offline'],
};

export const PassflowProviderWrapper: FC<PropsWithChildren> = ({
  children,
}) => {
  const navigate = useNavigate();

  return (
    <PassflowProvider
      url={passflowConfig.url}
      appId={passflowConfig.appId}
      createTenantForNewUser={passflowConfig.createTenantForNewUser}
      scopes={passflowConfig.scopes}
      navigate={(options) =>
        navigate({ pathname: options.to, search: options.search })
      }
      router="react-router"
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
