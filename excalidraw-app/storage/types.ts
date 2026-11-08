import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";
import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";

export type DocumentMeta = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  hasThumbnail: boolean;
};

export type LoadedDocument = {
  scene: ImportedDataState | null;
  files: BinaryFileData[];
};

export type LoadedFiles = {
  loadedFiles: BinaryFileData[];
  erroredFiles: Map<FileId, true>;
};

export type SavedFiles = {
  savedFiles: Map<FileId, BinaryFileData>;
  erroredFiles: Map<FileId, BinaryFileData>;
};

export interface DocumentStore {
  list(): Promise<DocumentMeta[]>;
  get(id: string): Promise<DocumentMeta | null>;
  create(name?: string, id?: string): Promise<DocumentMeta>;
  load(id: string): Promise<LoadedDocument>;
  loadFiles(id: string, fileIds: FileId[]): Promise<LoadedFiles>;
  saveScene(
    id: string,
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ): Promise<void>;
  saveFiles(id: string, files: BinaryFiles): Promise<SavedFiles>;
  rename(id: string, name: string): Promise<void>;
  remove(id: string): Promise<void>;
  duplicate(id: string): Promise<DocumentMeta>;
  saveThumbnail(id: string, blob: Blob): Promise<void>;
  getThumbnail(id: string): Promise<Blob | null>;
  deleteObsoleteFiles(id: string, currentFileIds: FileId[]): Promise<void>;
}
