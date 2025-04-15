import ReactDOM from 'react-dom/client';
import { App } from './app';
import './styles/index.css';
import React from 'react';

// biome-ignore lint/style/noNonNullAssertion: <explanation>
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
