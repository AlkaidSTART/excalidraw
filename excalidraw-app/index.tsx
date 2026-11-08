import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import "../excalidraw-app/sentry";

import ExcalidrawApp from "./App";
import { installTauriIntegrations, isRunningInTauri } from "./tauri";

// the entry's JavaScript and CSS loaded and ran (`scripts/stats/perf.mjs`)
performance.mark("excalidraw:app-start");

window.__EXCALIDRAW_SHA__ = import.meta.env.VITE_APP_GIT_SHA;
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// the native shell serves the bundle itself, so the service worker is pointless
if (!isRunningInTauri()) {
  registerSW();
}

installTauriIntegrations().catch((error) => {
  console.error("Failed to install Tauri integrations", error);
});

root.render(
  <StrictMode>
    <ExcalidrawApp />
  </StrictMode>,
);
