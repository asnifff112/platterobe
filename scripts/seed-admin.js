const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

// Read .env.local if present
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (!process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  });
}

const dbDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "platterobe.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Ensure users table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const email = (process.env.ADMIN_EMAIL || "platterobe@gmail.com").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";

if (!email || !password) {
  console.error("Error: ADMIN_EMAIL or ADMIN_PASSWORD not configured.");
  process.exit(1);
}

const saltRounds = 10;
const passwordHash = bcrypt.hashSync(password, saltRounds);

const existingUser = db.prepare("SELECT id, email, role FROM users WHERE LOWER(email) = LOWER(?)").get(email);

if (existingUser) {
  db.prepare(`
    UPDATE users SET
      password_hash = ?,
      role = 'admin',
      updated_at = datetime('now')
    WHERE id = ?
  `).run(passwordHash, existingUser.id);
  console.log(`[PLATTEROBE] Primary administrator account updated successfully: ${email} (Role: admin)`);
} else {
  const id = "admin-primary";
  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, 'admin', datetime('now'), datetime('now'))
  `).run(id, email, passwordHash);
  console.log(`[PLATTEROBE] Primary administrator account created successfully: ${email} (Role: admin)`);
}
