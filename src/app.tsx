import { AoothFlow } from '@/components/flow';
import { BrowserRouter } from 'react-router-dom';
import { AoothConfig } from '@aooth/aooth-js-sdk';
import { AoothProvider } from './components/provider';

const aoothConfig: AoothConfig = {
  url: process.env.AOOTH_URL ?? 'http://localhost:5432',
  appId: process.env.AOOTH_APP_ID ?? 'test_app_id',
  createTenantForNewUser: true,
  scopes: ['openid', 'email', 'profile', 'offline'],
};

export const App = () => (
  <AoothProvider
    url={aoothConfig.url}
    appId={aoothConfig.appId}
    createTenantForNewUser={aoothConfig.createTenantForNewUser}
    scopes={aoothConfig.scopes}
  >
    <BrowserRouter>
      <AoothFlow federatedDisplayMode='redirect' successAuthRedirect='/' pathPrefix='/web' />
    </BrowserRouter>
  </AoothProvider>
);

export default App;
