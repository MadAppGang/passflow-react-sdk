import ReactDOM from 'react-dom/client';
import { AoothProvider } from './components/provider';
import { App } from './app';
import './styles/index.css';
import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AoothProvider appId={process.env.AOOTH_APP_ID} aoothUrl={process.env.AOOTH_URL}>
      <App />
    </AoothProvider>
  </React.StrictMode>,
);
