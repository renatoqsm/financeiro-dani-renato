-- Reconstructed from SQL used by the recovered Worker. LOCAL DEVELOPMENT ONLY.
-- This is not an export of the production schema. Never apply to the remote DB.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS households (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT NOT NULL UNIQUE,
 salt TEXT NOT NULL,
 password TEXT NOT NULL,
 data TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
 token TEXT PRIMARY KEY,
 household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
 expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_attempts (
 ip TEXT PRIMARY KEY,
 window INTEGER NOT NULL,
 count INTEGER NOT NULL
);
