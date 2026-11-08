import { serializeAsJSON } from "@excalidraw/excalidraw";

import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";
import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";

import {
  bytesToBase64,
  bytesToDataUrl,
  dataUrlToBytes,
  toUint8Array,
} from "./db";

import type Database from "@tauri-apps/plugin-sql";

import type {
  DocumentMeta,
  DocumentStore,
  LoadedDocument,
  LoadedFiles,
  SavedFiles,
} from "./types";

type DocumentRow = {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  has_thumbnail?: number | boolean;
};

type SceneRow = {
  scene: string;
};

type FileRow = {
  file_id: string;
  mime_type: string;
  data: unknown;
  created: number;
  last_retrieved: number | null;
};

const EMPTY_SCENE = JSON.stringify({ elements: [], appState: {} });

const toMeta = (row: DocumentRow): DocumentMeta => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  hasThumbnail: Boolean(row.has_thumbnail),
});

const toFileData = (row: FileRow): BinaryFileData => ({
  id: row.file_id as FileId,
  mimeType: row.mime_type as BinaryFileData["mimeType"],
  dataURL: bytesToDataUrl(
    toUint8Array(row.data),
    row.mime_type,
  ) as BinaryFileData["dataURL"],
  created: row.created,
  lastRetrieved: row.last_retrieved ?? undefined,
  version: 1,
});

export class DocumentRepository implements DocumentStore {
  private readonly lastSceneByDocument = new Map<string, string>();

  constructor(private readonly database: Database) {}

  async list(): Promise<DocumentMeta[]> {
    const rows = await this.database.select<DocumentRow[]>(
      `SELECT d.id, d.name, d.created_at, d.updated_at,
        EXISTS(
          SELECT 1 FROM document_thumbnails t WHERE t.document_id = d.id
        ) AS has_thumbnail
       FROM documents d
       ORDER BY d.updated_at DESC`,
    );
    return rows.map(toMeta);
  }

  async get(id: string): Promise<DocumentMeta | null> {
    const rows = await this.database.select<DocumentRow[]>(
      `SELECT d.id, d.name, d.created_at, d.updated_at,
        EXISTS(
          SELECT 1 FROM document_thumbnails t WHERE t.document_id = d.id
        ) AS has_thumbnail
       FROM documents d
       WHERE d.id = $1`,
      [id],
    );
    return rows[0] ? toMeta(rows[0]) : null;
  }

  async create(
    name = "Untitled",
    id = crypto.randomUUID(),
  ): Promise<DocumentMeta> {
    const now = Date.now();
    await this.database.execute(
      `INSERT OR IGNORE INTO documents (id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4)`,
      [id, name, now, now],
    );
    await this.database.execute(
      `INSERT OR IGNORE INTO document_scenes (document_id, scene, updated_at)
       VALUES ($1, $2, $3)`,
      [id, EMPTY_SCENE, now],
    );

    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Failed to create document ${id}`);
    }
    return existing;
  }

  async load(id: string): Promise<LoadedDocument> {
    const sceneRows = await this.database.select<SceneRow[]>(
      `SELECT scene FROM document_scenes WHERE document_id = $1`,
      [id],
    );

    let scene: ImportedDataState | null = null;
    if (sceneRows[0]) {
      try {
        const parsed = JSON.parse(sceneRows[0].scene) as ImportedDataState;
        const hasElements =
          Array.isArray(parsed.elements) && parsed.elements.length > 0;
        const hasAppState =
          parsed.appState && Object.keys(parsed.appState).length > 0;
        scene = hasElements || hasAppState ? parsed : null;
      } catch (error) {
        console.error(`Failed to parse scene for document ${id}`, error);
      }
    }

    const fileRows = await this.database.select<FileRow[]>(
      `SELECT file_id, mime_type, data, created, last_retrieved
       FROM document_files
       WHERE document_id = $1`,
      [id],
    );

    return { scene, files: fileRows.map(toFileData) };
  }

  async loadFiles(id: string, fileIds: FileId[]): Promise<LoadedFiles> {
    if (!fileIds.length) {
      return { loadedFiles: [], erroredFiles: new Map() };
    }

    const placeholders = fileIds.map((_, index) => `$${index + 2}`).join(", ");
    const rows = await this.database.select<FileRow[]>(
      `SELECT file_id, mime_type, data, created, last_retrieved
       FROM document_files
       WHERE document_id = $1 AND file_id IN (${placeholders})`,
      [id, ...fileIds],
    );

    const loadedFiles = rows.map(toFileData);
    const loadedIds = new Set(loadedFiles.map((file) => file.id));
    const erroredFiles = new Map<FileId, true>();

    for (const fileId of fileIds) {
      if (!loadedIds.has(fileId)) {
        erroredFiles.set(fileId, true);
      }
    }

    if (loadedIds.size) {
      const now = Date.now();
      const updatePlaceholders = [...loadedIds]
        .map((_, index) => `$${index + 2}`)
        .join(", ");
      await this.database
        .execute(
          `UPDATE document_files
           SET last_retrieved = $1
           WHERE document_id = $${loadedIds.size + 2}
             AND file_id IN (${updatePlaceholders})`,
          [now, ...loadedIds, id],
        )
        .catch((error) => {
          console.warn("Failed to update file lastRetrieved", error);
        });
    }

    return { loadedFiles, erroredFiles };
  }

  async saveScene(
    id: string,
    elements: readonly ExcalidrawElement[],
    appState: AppState,
  ): Promise<void> {
    const serialized = serializeAsJSON(elements, appState, {}, "local");

    if (this.lastSceneByDocument.get(id) === serialized) {
      return;
    }

    const now = Date.now();
    const result = await this.database.execute(
      `UPDATE document_scenes SET scene = $1, updated_at = $2
       WHERE document_id = $3`,
      [serialized, now, id],
    );

    if (result.rowsAffected === 0) {
      await this.database.execute(
        `INSERT INTO document_scenes (document_id, scene, updated_at)
         VALUES ($1, $2, $3)`,
        [id, serialized, now],
      );
    }

    await this.database.execute(
      `UPDATE documents SET updated_at = $1 WHERE id = $2`,
      [now, id],
    );

    this.lastSceneByDocument.set(id, serialized);
  }

  async saveFiles(id: string, files: BinaryFiles): Promise<SavedFiles> {
    const savedFiles = new Map<FileId, BinaryFileData>();
    const erroredFiles = new Map<FileId, BinaryFileData>();

    await Promise.all(
      Object.values(files).map(async (file) => {
        if (!file?.dataURL) {
          return;
        }

        try {
          const { bytes, mimeType } = dataUrlToBytes(file.dataURL);
          const created = file.created ?? Date.now();
          const lastRetrieved = file.lastRetrieved ?? Date.now();
          // SQLite binds serde_json arrays as TEXT, not BLOB, so store the
          // base64 payload explicitly and decode it on read.
          const base64 = bytesToBase64(bytes);

          await this.database.execute(
            `INSERT OR REPLACE INTO document_files
              (document_id, file_id, mime_type, data, created, last_retrieved)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              id,
              file.id,
              file.mimeType || mimeType,
              base64,
              created,
              lastRetrieved,
            ],
          );

          savedFiles.set(file.id, file);
        } catch (error) {
          console.error(`Failed to save file ${file.id}`, error);
          erroredFiles.set(file.id, file);
        }
      }),
    );

    return { savedFiles, erroredFiles };
  }

  async rename(id: string, name: string): Promise<void> {
    await this.database.execute(
      `UPDATE documents SET name = $1, updated_at = $2 WHERE id = $3`,
      [name, Date.now(), id],
    );
  }

  async remove(id: string): Promise<void> {
    await this.database.execute(
      `DELETE FROM document_thumbnails WHERE document_id = $1`,
      [id],
    );
    await this.database.execute(
      `DELETE FROM document_files WHERE document_id = $1`,
      [id],
    );
    await this.database.execute(
      `DELETE FROM document_scenes WHERE document_id = $1`,
      [id],
    );
    await this.database.execute(`DELETE FROM documents WHERE id = $1`, [id]);
    this.lastSceneByDocument.delete(id);
  }

  async duplicate(id: string): Promise<DocumentMeta> {
    const source = await this.get(id);
    if (!source) {
      throw new Error(`Document ${id} not found`);
    }

    const newId = crypto.randomUUID();
    const now = Date.now();
    const name = source.name.endsWith(" copy")
      ? source.name
      : `${source.name} copy`;

    await this.database.execute(
      `INSERT INTO documents (id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4)`,
      [newId, name, now, now],
    );

    await this.database.execute(
      `INSERT INTO document_scenes (document_id, scene, updated_at)
       SELECT $1, scene, $2 FROM document_scenes WHERE document_id = $3`,
      [newId, now, id],
    );

    await this.database.execute(
      `INSERT INTO document_files
        (document_id, file_id, mime_type, data, created, last_retrieved)
       SELECT $1, file_id, mime_type, data, created, last_retrieved
       FROM document_files WHERE document_id = $2`,
      [newId, id],
    );

    await this.database.execute(
      `INSERT INTO document_thumbnails (document_id, data, updated_at)
       SELECT $1, data, $2 FROM document_thumbnails WHERE document_id = $3`,
      [newId, now, id],
    );

    const duplicated = await this.get(newId);
    if (!duplicated) {
      throw new Error(`Failed to duplicate document ${id}`);
    }
    return duplicated;
  }

  async saveThumbnail(id: string, blob: Blob): Promise<void> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const dataURL = bytesToDataUrl(bytes, "image/png");
    await this.database.execute(
      `INSERT OR REPLACE INTO document_thumbnails (document_id, data, updated_at)
       VALUES ($1, $2, $3)`,
      [id, dataURL, Date.now()],
    );
  }

  async getThumbnail(id: string): Promise<Blob | null> {
    const rows = await this.database.select<{ data: unknown }[]>(
      `SELECT data FROM document_thumbnails WHERE document_id = $1`,
      [id],
    );
    if (!rows[0]) {
      return null;
    }
    const data = rows[0].data;
    const bytes =
      typeof data === "string" && data.startsWith("data:")
        ? dataUrlToBytes(data).bytes
        : toUint8Array(data);
    return new Blob([bytes as unknown as BlobPart], { type: "image/png" });
  }

  async deleteObsoleteFiles(
    id: string,
    currentFileIds: FileId[],
  ): Promise<void> {
    const rows = await this.database.select<
      { file_id: string; last_retrieved: number | null }[]
    >(
      `SELECT file_id, last_retrieved FROM document_files WHERE document_id = $1`,
      [id],
    );

    const current = new Set(currentFileIds);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    for (const row of rows) {
      if (
        !current.has(row.file_id as FileId) &&
        (!row.last_retrieved || row.last_retrieved < cutoff)
      ) {
        await this.database.execute(
          `DELETE FROM document_files WHERE document_id = $1 AND file_id = $2`,
          [id, row.file_id],
        );
      }
    }
  }
}
