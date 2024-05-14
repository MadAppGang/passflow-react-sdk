import { AoothFlow } from '@/components/flow';
import { BrowserRouter } from 'react-router-dom';
import { AoothConfig } from '@aooth/aooth-js-sdk';
import { AoothProvider } from './components/provider';

const aoothConfig: AoothConfig = {
  url: (import.meta.env.VITE_AOOTH_URL as string) ?? 'http://localhost:8765',
  appId: (import.meta.env.VITE_AOOTH_APP_ID as string) ?? 'test_app_id',
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
      <AoothFlow
        federatedDisplayMode='redirect'
        successAuthRedirect='https://jwt.io'
        federatedCallbackUrl='https://jwt.io'
        pathPrefix='/web'
      />
    </BrowserRouter>
  </AoothProvider>
);

export default App;
