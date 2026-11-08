CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS documents_updated_at ON documents(updated_at DESC);

CREATE TABLE IF NOT EXISTS document_scenes (
  document_id TEXT PRIMARY KEY,
  scene       TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS document_files (
  document_id    TEXT NOT NULL,
  file_id        TEXT NOT NULL,
  mime_type      TEXT NOT NULL,
  data           BLOB NOT NULL,
  created        INTEGER NOT NULL,
  last_retrieved INTEGER,
  PRIMARY KEY (document_id, file_id)
);

CREATE TABLE IF NOT EXISTS document_thumbnails (
  document_id TEXT PRIMARY KEY,
  data        BLOB NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS library (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ttd_chats (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
