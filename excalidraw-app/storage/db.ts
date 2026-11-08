import Database from "@tauri-apps/plugin-sql";

let databasePromise: Promise<Database> | null = null;

export const getDatabase = (): Promise<Database> => {
  if (!databasePromise) {
    databasePromise = Database.load("sqlite:excalidraw.db").then(
      async (database) => {
        // WAL persists at database level; synchronous is a nice-to-have.
        // Failures here must not prevent the app from starting.
        try {
          await database.execute("PRAGMA journal_mode = WAL");
          await database.execute("PRAGMA synchronous = NORMAL");
        } catch (error) {
          console.warn("Failed to configure SQLite pragmas", error);
        }
        return database;
      },
    );
  }
  return databasePromise;
};

export const exec = async (query: string, values?: unknown[]) => {
  const database = await getDatabase();
  return database.execute(query, values);
};

export const select = async <T>(query: string, values?: unknown[]) => {
  const database = await getDatabase();
  return database.select<T>(query, values);
};

export const toUint8Array = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }

  if (typeof value === "string") {
    try {
      return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    } catch {
      // Older plugin versions may return BLOBs as a JSON array string.
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return new Uint8Array(parsed);
        }
      } catch {
        // fall through
      }
      return new TextEncoder().encode(value);
    }
  }

  return new Uint8Array();
};

export const bytesToBase64 = (bytes: Uint8Array) => {
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};

export const dataUrlToBytes = (
  dataURL: string,
): { bytes: Uint8Array; mimeType: string } => {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataURL);

  if (!match) {
    const bytes = new TextEncoder().encode(dataURL);
    return { bytes, mimeType: "application/octet-stream" };
  }

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";

  if (!isBase64) {
    return {
      bytes: new TextEncoder().encode(decodeURIComponent(payload)),
      mimeType,
    };
  }

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { bytes, mimeType };
};

export const bytesToDataUrl = (bytes: Uint8Array, mimeType: string) =>
  `data:${mimeType};base64,${bytesToBase64(bytes)}`;
