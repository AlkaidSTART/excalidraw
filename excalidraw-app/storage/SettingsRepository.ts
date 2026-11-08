import { exec, select } from "./db";

export class SettingsRepository {
  async get(key: string): Promise<string | null> {
    const rows = await select<{ value: string }[]>(
      `SELECT value FROM app_settings WHERE key = $1`,
      [key],
    );
    return rows[0]?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await exec(
      `INSERT OR REPLACE INTO app_settings (key, value) VALUES ($1, $2)`,
      [key, value],
    );
  }

  async delete(key: string): Promise<void> {
    await exec(`DELETE FROM app_settings WHERE key = $1`, [key]);
  }
}
