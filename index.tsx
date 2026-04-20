import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './contexts/I18nContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { Buffer } from 'buffer';
import process from 'process';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW({ immediate: true });

// @ts-ignore
window.Buffer = Buffer;
// @ts-ignore
window.process = process;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>
);