import type { SavedChats } from "@excalidraw/excalidraw/components/TTDDialog/types";

import { exec, select } from "./db";

export class TTDSqliteAdapter {
  static async loadChats(): Promise<SavedChats> {
    const rows = await select<{ data: string }[]>(
      `SELECT data FROM ttd_chats WHERE id = 1`,
    );

    if (!rows[0]) {
      return [];
    }

    try {
      return JSON.parse(rows[0].data) as SavedChats;
    } catch (error) {
      console.error("Failed to parse persisted TTD chats", error);
      return [];
    }
  }

  static async saveChats(chats: SavedChats): Promise<void> {
    await exec(
      `INSERT OR REPLACE INTO ttd_chats (id, data, updated_at)
       VALUES (1, $1, $2)`,
      [JSON.stringify(chats), Date.now()],
    );
  }
}
