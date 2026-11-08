import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type { LibraryPersistedData } from "@excalidraw/excalidraw/data/library";

import { LibrarySqliteAdapter } from "./LibrarySqliteAdapter";
import { SettingsRepository } from "./SettingsRepository";
import { TTDSqliteAdapter } from "./TTDSqliteAdapter";

import type { DocumentStore } from "./types";

const LEGACY_KEYS = {
  elements: "excalidraw",
  appState: "excalidraw-state",
  collab: "excalidraw-collab",
  library: "excalidraw-library",
  debug: "excalidraw-debug",
  versionDataState: "version-dataState",
  versionFiles: "version-files",
} as const;

const LEGACY_DATABASES = [
  { name: "files-db", store: "files-store" },
  { name: "excalidraw-library-db", store: "excalidraw-library-store" },
  { name: "excalidraw-ttd-chats-db", store: "excalidraw-ttd-chats-store" },
];

const LEGACY_DOCUMENT_ID = "legacy-recovered-drawing";

const readJSON = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.warn(`Failed to read legacy localStorage key "${key}"`, error);
    return null;
  }
};

const readAllFromIndexedDB = <T>(
  databaseName: string,
  storeName: string,
): Promise<T[]> =>
  new Promise((resolve) => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(databaseName);
    } catch (error) {
      console.warn(`Failed to open legacy IndexedDB "${databaseName}"`, error);
      resolve([]);
      return;
    }

    request.onupgradeneeded = () => {
      request.transaction?.abort();
      resolve([]);
    };

    request.onerror = () => {
      resolve([]);
    };

    request.onsuccess = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(storeName)) {
        database.close();
        resolve([]);
        return;
      }

      try {
        const transaction = database.transaction(storeName, "readonly");
        const all = transaction.objectStore(storeName).getAll();
        all.onsuccess = () => {
          resolve((all.result as T[]) ?? []);
          database.close();
        };
        all.onerror = () => {
          resolve([]);
          database.close();
        };
      } catch (error) {
        console.warn(
          `Failed to read legacy IndexedDB store "${storeName}"`,
          error,
        );
        database.close();
        resolve([]);
      }
    };
  });

const deleteIndexedDB = (databaseName: string) =>
  new Promise<void>((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });

const normalizeLibrary = (
  value: unknown,
  idbData: LibraryPersistedData[],
): LibraryPersistedData | null => {
  if (Array.isArray(value)) {
    return { libraryItems: value };
  }

  if (value && typeof value === "object" && "libraryItems" in value) {
    return value as LibraryPersistedData;
  }

  const stored = idbData.find((item) => item?.libraryItems);
  return stored ?? null;
};

const normalizeChats = (value: unknown, idbData: unknown[]) => {
  if (Array.isArray(value)) {
    return value;
  }

  const stored = idbData.find((item) => Array.isArray(item));
  return Array.isArray(stored) ? stored : [];
};

export const runLegacyMigration = async (store: DocumentStore) => {
  const settings = new SettingsRepository();

  if ((await settings.get("migrated")) === "1") {
    return;
  }

  const elements = readJSON<ExcalidrawElement[]>(LEGACY_KEYS.elements) ?? [];
  const appState = readJSON<Partial<AppState>>(LEGACY_KEYS.appState) ?? {};
  const legacyLibrary = readJSON<unknown>(LEGACY_KEYS.library);

  const legacyFiles = await readAllFromIndexedDB<BinaryFileData>(
    "files-db",
    "files-store",
  );
  const legacyLibraryIndexedDB =
    await readAllFromIndexedDB<LibraryPersistedData>(
      "excalidraw-library-db",
      "excalidraw-library-store",
    );
  const legacyChatsIndexedDB = await readAllFromIndexedDB<unknown>(
    "excalidraw-ttd-chats-db",
    "excalidraw-ttd-chats-store",
  );

  const hasScene = elements.length > 0 || Object.keys(appState).length > 0;

  if (hasScene) {
    await store.create("Recovered drawing", LEGACY_DOCUMENT_ID);

    await store.saveScene(LEGACY_DOCUMENT_ID, elements, appState as AppState);

    if (legacyFiles.length) {
      const files: BinaryFiles = {};
      for (const file of legacyFiles) {
        if (file?.id) {
          files[file.id as FileId] = file;
        }
      }
      if (Object.keys(files).length) {
        await store.saveFiles(LEGACY_DOCUMENT_ID, files);
      }
    }
  }

  const library = normalizeLibrary(legacyLibrary, legacyLibraryIndexedDB);
  if (library) {
    await LibrarySqliteAdapter.save(library);
  }

  const chats = normalizeChats(undefined, legacyChatsIndexedDB);
  if (chats.length) {
    await TTDSqliteAdapter.saveChats(chats as never);
  }

  await settings.set("migrated", "1");

  for (const key of Object.values(LEGACY_KEYS)) {
    localStorage.removeItem(key);
  }

  for (const database of LEGACY_DATABASES) {
    await deleteIndexedDB(database.name);
  }
};
