// time constants (ms)
export const SAVE_DEBOUNCE_MS = 600;

// Legacy browser storage keys. Kept only for one-time migration and for the
// editor's theme preference, which is not part of the document database.
export const STORAGE_KEYS = {
  LOCAL_STORAGE_ELEMENTS: "excalidraw",
  LOCAL_STORAGE_APP_STATE: "excalidraw-state",
  LOCAL_STORAGE_THEME: "excalidraw-theme",
} as const;
