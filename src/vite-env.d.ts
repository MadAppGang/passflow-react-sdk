/// <reference types="vite/client" />
declare module '*.svg';

interface ImportMetaEnv {
  readonly AOOTH_APP_ID: string;
  readonly AOOTH_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
