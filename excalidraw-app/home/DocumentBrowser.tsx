import { restoreAppState } from "@excalidraw/excalidraw/data/restore";
import { saveAsJSON } from "@excalidraw/excalidraw/data/json";
import { loadFromBlob } from "@excalidraw/excalidraw/data/blob";
import { fileOpen } from "@excalidraw/excalidraw/data/filesystem";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DocumentCard } from "./DocumentCard";
import { HomeHeader } from "./HomeHeader";

import "./home.scss";

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
      await store.saveScene(
        document.id,
        data.elements,
        data.appState,
      );
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
        const appState = restoreAppState(scene.appState ?? null, null);
        const filesMap = Object.fromEntries(files.map((file) => [file.id, file]));
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
    <div className="app-home">
      <HomeHeader
        query={query}
        onQueryChange={setQuery}
        onNew={() => void createDocument()}
        onImport={() => void importDocument()}
      />

      {error && (
        <div className="app-home__error">
          {error}
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="app-home__empty">Loading drawings…</p>
      ) : filteredDocuments.length === 0 ? (
        <div className="app-home__empty">
          <h2>{documents.length ? "No drawings found" : "No drawings yet"}</h2>
          <p>Create a new drawing or import an existing .excalidraw file.</p>
          <div className="app-home__empty-actions">
            <button type="button" onClick={() => void createDocument()}>
              New drawing
            </button>
            <button type="button" onClick={() => void importDocument()}>
              Import file
            </button>
          </div>
        </div>
      ) : (
        <div className="app-home__grid">
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
        <div className="app-dialog-backdrop" role="presentation">
          <div className="app-dialog" role="dialog" aria-modal="true">
            {dialog.type === "rename" ? (
              <>
                <h2>Rename drawing</h2>
                <input
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
                <div className="app-dialog__actions">
                  <button type="button" onClick={() => setDialog({ type: "none" })}>
                    Cancel
                  </button>
                  <button type="button" onClick={() => void confirmRename()}>
                    Save
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Delete “{dialog.document.name}”?</h2>
                <p>This removes the drawing and its images from this device.</p>
                <div className="app-dialog__actions">
                  <button type="button" onClick={() => setDialog({ type: "none" })}>
                    Cancel
                  </button>
                  <button type="button" onClick={() => void confirmDelete()}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
