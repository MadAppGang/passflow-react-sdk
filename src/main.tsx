import ReactDOM from 'react-dom/client';
import { AoothProvider } from './components/provider';
import { App } from './app';
import './styles/index.css';
import React from 'react';
import { AoothConfig } from '@aooth/aooth-js-sdk';

const aoothConfig: AoothConfig = {
  url: process.env.AOOTH_URL,
  appId: process.env.AOOTH_APP_ID,
  createTenantForNewUser: true,
  scopes: ['openid', 'email', 'profile'],
};

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AoothProvider
      url={aoothConfig.url}
      appId={aoothConfig.appId}
      createTenantForNewUser={aoothConfig.createTenantForNewUser}
      scopes={aoothConfig.scopes}
    >
      <App />
    </AoothProvider>
  </React.StrictMode>,
);
