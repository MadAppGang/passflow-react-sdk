import ReactDOM from 'react-dom/client';
import { App } from './app';
import './styles/index.css';
import React from 'react';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
