import { serializeAsJSON } from "@excalidraw/excalidraw";

import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";

import type {
  DocumentMeta,
  DocumentStore,
  LoadedDocument,
  LoadedFiles,
  SavedFiles,
} from "./types";

type MemoryDocument = {
  meta: DocumentMeta;
  scene: string;
  files: Map<FileId, BinaryFileData>;
  thumbnail: Blob | null;
};

export class MemoryDocumentStore implements DocumentStore {
  private readonly documents = new Map<string, MemoryDocument>();

  async list(): Promise<DocumentMeta[]> {
    return [...this.documents.values()]
      .map(({ meta }) => meta)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async get(id: string): Promise<DocumentMeta | null> {
    return this.documents.get(id)?.meta ?? null;
  }

  async create(
    name = "Untitled",
    id = crypto.randomUUID(),
  ): Promise<DocumentMeta> {
    const existing = this.documents.get(id);
    if (existing) {
      return existing.meta;
    }

    const now = Date.now();
    const meta: DocumentMeta = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      hasThumbnail: false,
    };

    this.documents.set(id, {
      meta,
      scene: JSON.stringify({ elements: [], appState: {} }),
      files: new Map(),
      thumbnail: null,
    });

    return meta;
  }

  async load(id: string): Promise<LoadedDocument> {
    const document = this.documents.get(id);
    if (!document) {
      return { scene: null, files: [] };
    }

    try {
      const parsed = JSON.parse(document.scene);
      const hasElements =
        Array.isArray(parsed.elements) && parsed.elements.length > 0;
      const hasAppState =
        parsed.appState && Object.keys(parsed.appState).length > 0;
      return {
        scene: hasElements || hasAppState ? parsed : null,
        files: [...document.files.values()],
      };
    } catch {
      return { scene: null, files: [...document.files.values()] };
    }
  }

  async loadFiles(id: string, fileIds: FileId[]): Promise<LoadedFiles> {
    const document = this.documents.get(id);
    const loadedFiles: BinaryFileData[] = [];
    const erroredFiles = new Map<FileId, true>();

    for (const fileId of fileIds) {
      const file = document?.files.get(fileId);
      if (file) {
        loadedFiles.push(file);
      } else {
        erroredFiles.set(fileId, true);
      }
    }

    return { loadedFiles, erroredFiles };
  }

  async saveScene(
    id: string,
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ): Promise<void> {
    const document = this.documents.get(id);
    if (!document) {
      return;
    }

    document.scene = serializeAsJSON(elements, appState, {}, "local");
    document.meta = { ...document.meta, updatedAt: Date.now() };
  }

  async saveFiles(id: string, files: BinaryFiles): Promise<SavedFiles> {
    const document = this.documents.get(id);
    const savedFiles = new Map<FileId, BinaryFileData>();
    const erroredFiles = new Map<FileId, BinaryFileData>();

    if (!document) {
      for (const file of Object.values(files)) {
        erroredFiles.set(file.id, file);
      }
      return { savedFiles, erroredFiles };
    }

    for (const file of Object.values(files)) {
      document.files.set(file.id, file);
      savedFiles.set(file.id, file);
    }

    return { savedFiles, erroredFiles };
  }

  async rename(id: string, name: string): Promise<void> {
    const document = this.documents.get(id);
    if (document) {
      document.meta = { ...document.meta, name, updatedAt: Date.now() };
    }
  }

  async remove(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async duplicate(id: string): Promise<DocumentMeta> {
    const source = this.documents.get(id);
    if (!source) {
      throw new Error(`Document ${id} not found`);
    }

    const newId = crypto.randomUUID();
    const now = Date.now();
    const meta: DocumentMeta = {
      ...source.meta,
      id: newId,
      name: `${source.meta.name} copy`,
      createdAt: now,
      updatedAt: now,
    };

    this.documents.set(newId, {
      meta,
      scene: source.scene,
      files: new Map(source.files),
      thumbnail: source.thumbnail,
    });

    return meta;
  }

  async saveThumbnail(id: string, blob: Blob): Promise<void> {
    const document = this.documents.get(id);
    if (document) {
      document.thumbnail = blob;
      document.meta = { ...document.meta, hasThumbnail: true };
    }
  }

  async getThumbnail(id: string): Promise<Blob | null> {
    return this.documents.get(id)?.thumbnail ?? null;
  }

  async deleteObsoleteFiles(): Promise<void> {
    // Memory store is development-only and short lived.
  }
}
