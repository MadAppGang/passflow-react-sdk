import ReactDOM from 'react-dom/client';
import { App } from './app';
import { HostedLogin } from './dev-hosted-login';
import { TanStackHostApp } from './dev-tanstack-host';
import './styles/index.css';
import React from 'react';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
// /tanstack/* is a TanStack Router app around the flow, /hosted/* the hosted login app's mount; everything else is the
// plain demo.
const { pathname } = window.location;
const Host = pathname.startsWith('/tanstack') ? TanStackHostApp : pathname.startsWith('/hosted') ? HostedLogin : App;
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Host />
  </React.StrictMode>,
);
