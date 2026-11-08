import type { LibraryPersistedData } from "@excalidraw/excalidraw/data/library";

import { exec, select } from "./db";

export class LibrarySqliteAdapter {
  static async load(): Promise<LibraryPersistedData | null> {
    const rows = await select<{ data: string }[]>(
      `SELECT data FROM library WHERE id = 1`,
    );

    if (!rows[0]) {
      return null;
    }

    try {
      return JSON.parse(rows[0].data) as LibraryPersistedData;
    } catch (error) {
      console.error("Failed to parse persisted library", error);
      return null;
    }
  }

  static async save(data: LibraryPersistedData): Promise<void> {
    await exec(
      `INSERT OR REPLACE INTO library (id, data, updated_at)
       VALUES (1, $1, $2)`,
      [JSON.stringify(data), Date.now()],
    );
  }
}
