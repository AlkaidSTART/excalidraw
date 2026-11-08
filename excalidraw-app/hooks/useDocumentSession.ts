import { debounce } from "@excalidraw/common";
import { getNonDeletedElements } from "@excalidraw/element";
import { exportScene } from "@excalidraw/excalidraw";
import { restoreAppState, restoreElements } from "@excalidraw/excalidraw/data/restore";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SAVE_DEBOUNCE_MS } from "../app_constants";

import { NativeFileManager } from "../storage/NativeFileManager";

import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import type { DocumentStore } from "../storage/types";

type LatestScene = {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

export const useDocumentSession = (docId: string, store: DocumentStore) => {
  const [initialData, setInitialData] =
    useState<ExcalidrawInitialDataState | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Untitled");

  const fileManagerRef = useRef<NativeFileManager | null>(null);
  const latestRef = useRef<LatestScene | null>(null);
  const dirtyRef = useRef(false);
  const mountedRef = useRef(true);
  const lastSavedTitleRef = useRef("Untitled");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInitialData(null);
    latestRef.current = null;
    dirtyRef.current = false;
    fileManagerRef.current = new NativeFileManager(docId, store);

    store
      .load(docId)
      .then(({ scene, files }) => {
        if (cancelled) {
          return;
        }

        const elements = restoreElements(scene?.elements ?? null, null, {
          repairBindings: true,
          deleteInvisibleElements: true,
        });
        const appState = restoreAppState(scene?.appState ?? null, null);
        const filesMap: BinaryFiles = {};
        for (const file of files) {
          filesMap[file.id] = file;
        }

        const name = appState.name?.trim() || "Untitled";
        lastSavedTitleRef.current = name;

        latestRef.current = { elements, appState, files: filesMap };
        setTitle(name);
        setInitialData({
          elements,
          appState,
          files: filesMap,
          scrollToContent: false,
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error(`Failed to load document ${docId}`, error);
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [docId, store]);

  const saveThumbnail = useCallback(async () => {
    const latest = latestRef.current;
    if (!latest || !latest.elements.length) {
      return;
    }

    try {
      const blob = await exportScene({
        type: "png",
        data: {
          elements: getNonDeletedElements(latest.elements),
          appState: latest.appState,
          files: latest.files,
        },
        config: {
          maxWidthOrHeight: 512,
          exportPadding: 10,
        },
      });
      await store.saveThumbnail(docId, blob);
    } catch (error) {
      console.warn(`Failed to generate thumbnail for ${docId}`, error);
    }
  }, [docId, store]);

  const saveNow = useCallback(
    async (options?: { force?: boolean }) => {
      const latest = latestRef.current;
      const fileManager = fileManagerRef.current;

      if (!latest || !fileManager) {
        return;
      }

      if (!dirtyRef.current && !options?.force) {
        return;
      }

      await store.saveScene(docId, latest.elements, latest.appState);
      await fileManager.saveFiles({
        elements: latest.elements,
        files: latest.files,
      });

      const name = latest.appState.name?.trim() || "Untitled";
      if (name !== lastSavedTitleRef.current) {
        await store.rename(docId, name);
        lastSavedTitleRef.current = name;
      }

      dirtyRef.current = false;

      if (mountedRef.current) {
        setTitle(name);
      }
    },
    [docId, store],
  );

  const scheduleSave = useMemo(
    () =>
      debounce(() => {
        void saveNow();
      }, SAVE_DEBOUNCE_MS),
    [saveNow],
  );

  const onChange = useCallback<NonNullable<ExcalidrawProps["onChange"]>>(
    (elements, appState, files) => {
      latestRef.current = { elements, appState, files };
      dirtyRef.current = true;

      const fileManager = fileManagerRef.current;
      if (fileManager) {
        void fileManager.saveFiles({ elements, files });
      }

      scheduleSave();
    },
    [scheduleSave],
  );

  const flush = useCallback(
    async (options?: { thumbnail?: boolean }) => {
      scheduleSave.cancel();

      try {
        await saveNow();
        if (options?.thumbnail !== false) {
          await saveThumbnail();
        }
      } catch (error) {
        console.error(`Failed to flush document ${docId}`, error);
      }
    },
    [docId, saveNow, saveThumbnail, scheduleSave],
  );

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        void flush();
      }
    };
    const onPageHide = () => {
      void flush();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      void flush();
    };
  }, [flush]);

  return {
    initialData,
    loading,
    title,
    onChange,
    flush,
    saveThumbnail,
  };
};
