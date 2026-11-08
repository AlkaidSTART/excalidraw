import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import { restoreAppState } from "@excalidraw/excalidraw/data/restore";
import { saveAsJSON } from "@excalidraw/excalidraw/data/json";
import { loadFromBlob } from "@excalidraw/excalidraw/data/blob";
import { fileOpen } from "@excalidraw/excalidraw/data/filesystem";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AppState } from "@excalidraw/excalidraw/types";

import { Button } from "../components/Button";

import { DocumentCard } from "./DocumentCard";
import { HomeHeader } from "./HomeHeader";

import type { DocumentMeta, DocumentStore } from "../storage/types";

type DialogState =
  | { type: "none" }
  | { type: "rename"; document: DocumentMeta; name: string }
  | { type: "delete"; document: DocumentMeta };

export const DocumentBrowser = ({
  store,
  onOpen,
}: {
  store: DocumentStore;
  onOpen: (documentId: string) => void;
}) => {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const [loading, setLoading] = useState(true);

  const thumbnailUrlsRef = useRef<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const nextDocuments = await store.list();
      setDocuments(nextDocuments);
      setError(null);
    } catch (loadError: any) {
      console.error(loadError);
      setError(loadError?.message || "Failed to load drawings");
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    const loadThumbnails = async () => {
      const next: Record<string, string> = {};

      for (const document of documents) {
        if (!document.hasThumbnail) {
          continue;
        }

        try {
          const blob = await store.getThumbnail(document.id);
          if (blob) {
            const url = URL.createObjectURL(blob);
            thumbnailUrlsRef.current.push(url);
            next[document.id] = url;
          }
        } catch (thumbnailError) {
          console.warn("Failed to load thumbnail", thumbnailError);
        }
      }

      if (!cancelled) {
        setThumbnails(next);
      }
    };

    void loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [documents, store]);

  useEffect(() => {
    return () => {
      for (const url of thumbnailUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      thumbnailUrlsRef.current = [];
    };
  }, []);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return documents;
    }
    return documents.filter((document) =>
      document.name.toLowerCase().includes(normalizedQuery),
    );
  }, [documents, query]);

  const createDocument = useCallback(async () => {
    try {
      const document = await store.create();
      setDialog({ type: "none" });
      onOpen(document.id);
    } catch (createError: any) {
      setError(createError?.message || "Failed to create drawing");
    }
  }, [onOpen, store]);

  const importDocument = useCallback(async () => {
    try {
      const file = await fileOpen({
        description: "Excalidraw files",
        extensions: ["excalidraw", "json"],
      });
      const data = await loadFromBlob(file, null, null);
      const name = file.name.replace(/\.(excalidraw|json)$/i, "") || "Imported";
      const document = await store.create(name);
      await store.saveScene(document.id, data.elements, {
        ...getDefaultAppState(),
        ...data.appState,
      } as AppState);
      await store.saveFiles(document.id, data.files);
      onOpen(document.id);
    } catch (importError: any) {
      if (importError?.name !== "AbortError") {
        console.error(importError);
        setError(importError?.message || "Failed to import drawing");
      }
    }
  }, [onOpen, store]);

  const duplicateDocument = useCallback(
    async (document: DocumentMeta) => {
      try {
        await store.duplicate(document.id);
        await refresh();
      } catch (duplicateError: any) {
        setError(duplicateError?.message || "Failed to duplicate drawing");
      }
    },
    [refresh, store],
  );

  const exportDocument = useCallback(
    async (document: DocumentMeta) => {
      try {
        const { scene, files } = await store.load(document.id);
        if (!scene) {
          return;
        }
        const appState = {
          ...getDefaultAppState(),
          ...restoreAppState(scene.appState ?? null, null),
        } as AppState;
        const filesMap = Object.fromEntries(
          files.map((file) => [file.id, file]),
        );
        await saveAsJSON({
          data: {
            elements: scene.elements ?? [],
            appState,
            files: filesMap,
          },
          filename: document.name,
          fileHandle: null,
        });
      } catch (exportError: any) {
        if (exportError?.name !== "AbortError") {
          console.error(exportError);
          setError(exportError?.message || "Failed to export drawing");
        }
      }
    },
    [store],
  );

  const confirmDelete = useCallback(async () => {
    if (dialog.type !== "delete") {
      return;
    }

    try {
      await store.remove(dialog.document.id);
      setDialog({ type: "none" });
      await refresh();
    } catch (deleteError: any) {
      setError(deleteError?.message || "Failed to delete drawing");
    }
  }, [dialog, refresh, store]);

  const confirmRename = useCallback(async () => {
    if (dialog.type !== "rename") {
      return;
    }

    const name = dialog.name.trim() || "Untitled";

    try {
      await store.rename(dialog.document.id, name);
      setDialog({ type: "none" });
      await refresh();
    } catch (renameError: any) {
      setError(renameError?.message || "Failed to rename drawing");
    }
  }, [dialog, refresh, store]);

  return (
    <div className="box-border min-h-dvh bg-app-bg pl-[calc(env(safe-area-inset-left,0px)_+_1rem)] pr-[calc(env(safe-area-inset-right,0px)_+_1rem)] pt-[calc(env(safe-area-inset-top,0px)_+_1rem)] pb-[calc(env(safe-area-inset-bottom,0px)_+_1rem)] text-app-text">
      <HomeHeader
        query={query}
        onQueryChange={setQuery}
        onNew={() => void createDocument()}
        onImport={() => void importDocument()}
      />

      {error && (
        <div className="mx-auto mb-4 flex max-w-[1200px] items-center justify-between gap-4 rounded-[0.6rem] border border-app-danger px-4 py-3 text-app-danger">
          {error}
          <Button variant="secondary" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {loading ? (
        <p className="mx-auto my-12 max-w-[1200px] text-center text-app-text-muted">
          Loading drawings…
        </p>
      ) : filteredDocuments.length === 0 ? (
        <div className="mx-auto my-12 max-w-[1200px] text-center text-app-text-muted">
          <h2 className="mb-2 mt-0 font-bold text-app-text">
            {documents.length ? "No drawings found" : "No drawings yet"}
          </h2>
          <p className="mb-4 mt-0">
            Create a new drawing or import an existing .excalidraw file.
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => void createDocument()}>New drawing</Button>
            <Button variant="secondary" onClick={() => void importDocument()}>
              Import file
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 max-[600px]:grid-cols-1">
          {filteredDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              thumbnailUrl={thumbnails[document.id]}
              onOpen={() => onOpen(document.id)}
              onRename={() =>
                setDialog({ type: "rename", document, name: document.name })
              }
              onDuplicate={() => void duplicateDocument(document)}
              onDelete={() => setDialog({ type: "delete", document })}
              onExport={() => void exportDocument(document)}
            />
          ))}
        </div>
      )}

      {dialog.type !== "none" && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/[0.45] p-4"
          role="presentation"
        >
          <div
            className="box-border w-[min(420px,100%)] rounded-[0.9rem] bg-app-surface p-5 text-app-text shadow-[0_20px_60px_rgb(0_0_0_/_25%)]"
            role="dialog"
            aria-modal="true"
          >
            {dialog.type === "rename" ? (
              <>
                <h2 className="mb-3 mt-0 text-[1.15rem] font-bold">
                  Rename drawing
                </h2>
                <input
                  className="box-border min-h-11 w-full rounded-[0.5rem] border border-app-border bg-app-bg px-3 font-app text-base text-app-text outline-none focus:border-app-accent"
                  autoFocus
                  value={dialog.name}
                  onChange={(event) =>
                    setDialog({ ...dialog, name: event.target.value })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void confirmRename();
                    }
                    if (event.key === "Escape") {
                      setDialog({ type: "none" });
                    }
                  }}
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setDialog({ type: "none" })}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => void confirmRename()}>Save</Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-3 mt-0 text-[1.15rem] font-bold">
                  Delete “{dialog.document.name}”?
                </h2>
                <p className="mb-4 mt-0 text-app-text-muted">
                  This removes the drawing and its images from this device.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setDialog({ type: "none" })}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => void confirmDelete()}>Delete</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
