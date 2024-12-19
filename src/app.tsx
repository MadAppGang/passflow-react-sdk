import { PassflowFlow } from '@/components/flow';
import { BrowserRouter } from 'react-router-dom';
import { PassflowConfig } from '@passflow/passflow-js-sdk';
import { PassflowProvider } from './components/provider';

const passflowConfig: PassflowConfig = {
  url: process.env.PASSFLOW_URL ?? 'http://localhost:5432',
  appId: process.env.PASSFLOW_APP_ID ?? 'test_app_id',
  createTenantForNewUser: true,
  scopes: ['openid', 'email', 'profile', 'offline'],
};

export const App = () => (
  <PassflowProvider
    url={passflowConfig.url}
    appId={passflowConfig.appId}
    createTenantForNewUser={passflowConfig.createTenantForNewUser}
    scopes={passflowConfig.scopes}
  >
    <BrowserRouter>
      <PassflowFlow
        federatedDisplayMode='redirect'
        successAuthRedirect='https://jwt.io'
        federatedCallbackUrl='https://jwt.io'
        pathPrefix='/web'
      />
    </BrowserRouter>
  </PassflowProvider>
);

export default App;
