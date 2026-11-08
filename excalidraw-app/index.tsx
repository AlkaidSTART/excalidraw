import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import polyfill from "@excalidraw/excalidraw/polyfill";

import Root from "./Root";
import { DocumentRepository } from "./storage/DocumentRepository";
import { MemoryDocumentStore } from "./storage/MemoryDocumentStore";
import { getDatabase } from "./storage/db";
import { runLegacyMigration } from "./storage/legacyMigration";
import { installTauriIntegrations, isRunningInTauri } from "./tauri";
import "./index.scss";

import type { DocumentStore } from "./storage/types";

polyfill();

window.EXCALIDRAW_THROTTLE_RENDER = true;
window.__EXCALIDRAW_SHA__ = import.meta.env.VITE_APP_GIT_SHA;

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

root.render(<div className="app-bootstrap">Loading…</div>);

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
        <div className="app-bootstrap app-bootstrap--error">
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
