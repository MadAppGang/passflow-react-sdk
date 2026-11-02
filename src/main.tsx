import ReactDOM from 'react-dom/client';
import { App } from './app';
import { TanStackHostApp } from './dev-tanstack-host';
import './styles/index.css';
import React from 'react';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
// /tanstack/* is a TanStack Router app around the flow; everything else is the plain demo.
const isTanStackHost = window.location.pathname.startsWith('/tanstack');
ReactDOM.createRoot(rootElement).render(<React.StrictMode>{isTanStackHost ? <TanStackHostApp /> : <App />}</React.StrictMode>);
