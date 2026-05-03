const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'github_trending.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS repositories (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name         TEXT    NOT NULL UNIQUE,
    name              TEXT    NOT NULL,
    owner             TEXT    NOT NULL,
    description       TEXT,
    language          TEXT,
    stars             INTEGER NOT NULL DEFAULT 0,
    html_url          TEXT    NOT NULL,
    avatar_url        TEXT,
    features_summary  TEXT,
    install_code      TEXT,
    first_fetched_at  TEXT NOT NULL,
    last_fetched_at   TEXT NOT NULL,
    is_favorited      INTEGER NOT NULL DEFAULT 0,
    favorited_at      TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_repos_favorited  ON repositories(is_favorited);
  CREATE INDEX IF NOT EXISTS idx_repos_fetched_at ON repositories(first_fetched_at);
`);

module.exports = db;
