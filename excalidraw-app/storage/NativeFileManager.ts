import type { FileId } from "@excalidraw/element/types";

import type { BinaryFiles } from "@excalidraw/excalidraw/types";

import { FileManager } from "../data/FileManager";
import { FileStatusStore } from "../data/fileStatusStore";

import type { DocumentStore } from "./types";

export class NativeFileManager extends FileManager {
  constructor(
    private readonly documentId: string,
    private readonly store: DocumentStore,
  ) {
    super({
      onFileStatusChange: FileStatusStore.updateStatuses.bind(FileStatusStore),
      getFiles: (fileIds) => this.store.loadFiles(this.documentId, fileIds),
      saveFiles: ({ addedFiles }) =>
        this.store.saveFiles(
          this.documentId,
          Object.fromEntries(addedFiles) as BinaryFiles,
        ),
    });
  }

  clearObsoleteFiles = async ({
    currentFileIds,
  }: {
    currentFileIds: FileId[];
  }) => {
    await this.store.deleteObsoleteFiles(this.documentId, currentFileIds);
  };
}
