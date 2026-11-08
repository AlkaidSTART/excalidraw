/// <reference types="vite-plugin-svgr/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_APP_PORT: string;
  readonly VITE_APP_GIT_SHA: string;
  readonly VITE_APP_ENABLE_ESLINT: string;
  readonly VITE_APP_COLLAPSE_OVERLAY: string;
  readonly VITE_APP_UPDATE_REPO?: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
