import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import polyfill from "@excalidraw/excalidraw/polyfill";

import Root from "./Root";
import { DocumentRepository } from "./storage/DocumentRepository";
import { MemoryDocumentStore } from "./storage/MemoryDocumentStore";
import { getDatabase } from "./storage/db";
import { runLegacyMigration } from "./storage/legacyMigration";
import { installTauriIntegrations, isRunningInTauri } from "./tauri";
import "./index.css";

import type { DocumentStore } from "./storage/types";

polyfill();

window.EXCALIDRAW_THROTTLE_RENDER = true;
window.__EXCALIDRAW_SHA__ = import.meta.env.VITE_APP_GIT_SHA;

try {
  const storedTheme = localStorage.getItem("excalidraw-theme") ?? "light";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle(
    "dark",
    storedTheme === "dark" || (storedTheme === "system" && prefersDark),
  );
} catch (error) {
  console.warn("Failed to restore theme", error);
}

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

root.render(
  <div className="flex h-dvh items-center justify-center bg-[#121212] p-4 text-center font-app text-base text-white">
    Loading…
  </div>,
);

const bootstrap = async () => {
  installTauriIntegrations();

  let store: DocumentStore;

  if (isRunningInTauri()) {
    try {
      const database = await getDatabase();
      store = new DocumentRepository(database);
      try {
        await runLegacyMigration(store);
      } catch (migrationError) {
        console.error("Legacy data migration failed", migrationError);
      }
    } catch (databaseError) {
      console.error("Failed to open the document database", databaseError);
      root.render(
        <div className="flex h-dvh items-center justify-center bg-[#121212] p-4 text-center font-app text-base text-[#ff8787]">
          Failed to open the local database. Restart the app and try again.
        </div>,
      );
      return;
    }
  } else {
    // Browser development fallback. Data is intentionally not persisted.
    store = new MemoryDocumentStore();
  }

  root.render(
    <StrictMode>
      <Root store={store} />
    </StrictMode>,
  );
};

void bootstrap();
