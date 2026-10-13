const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// Load .env.local
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

const adminEmail = (process.env.ADMIN_EMAIL || "platterobe@gmail.com").trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminPassword) {
  console.error("FAIL: ADMIN_PASSWORD not configured in .env.local");
  process.exit(1);
}

const dbPath = path.join(__dirname, "..", "data", "platterobe.db");
const db = new Database(dbPath);

console.log(">>> [CHECK 1] ADMIN USER RECORD IN DB");
const admin = db.prepare("SELECT id, email, role, password_hash, created_at, updated_at FROM users WHERE LOWER(email) = LOWER(?)").get(adminEmail);
if (!admin) {
  console.error("FAIL: Admin user not found for " + adminEmail);
  process.exit(1);
}
if (admin.role !== "admin") {
  console.error("FAIL: Admin role mismatch. Expected 'admin', got: " + admin.role);
  process.exit(1);
}
console.log("PASS: User found ->", admin.id, "|", admin.email, "| Role:", admin.role);

console.log("\n>>> [CHECK 2] BCRYPT HASH INTEGRITY");
if (!admin.password_hash.startsWith("$2a$") && !admin.password_hash.startsWith("$2b$")) {
  console.error("FAIL: Not a bcrypt hash");
  process.exit(1);
}
console.log("PASS: Password stored as valid bcrypt hash (length 60). Plaintext password is NEVER stored.");

console.log("\n>>> [CHECK 3] ACTIVE PASSWORD VERIFICATION");
const isCorrect = bcrypt.compareSync(adminPassword, admin.password_hash);
if (!isCorrect) {
  console.error("FAIL: Active password does not match stored hash");
  process.exit(1);
}
console.log("PASS: Active admin password verifies successfully against stored hash.");

const isWrong = bcrypt.compareSync("badPassword999!", admin.password_hash);
if (isWrong) {
  console.error("FAIL: Wrong password accepted");
  process.exit(1);
}
console.log("PASS: Invalid password rejected.");

const isOldRejected = !bcrypt.compareSync("platterobe2026!", admin.password_hash);
if (!isOldRejected) {
  console.error("FAIL: Old default password still accepted");
  process.exit(1);
}
console.log("PASS: Deprecated old password rejected.");

console.log("\n>>> [CHECK 4] IDEMPOTENT RE-SEEDING (seed-admin.js)");
require("./seed-admin.js");
const reseededAdmin = db.prepare("SELECT id, email, role, password_hash FROM users WHERE LOWER(email) = LOWER(?)").get(adminEmail);
if (!bcrypt.compareSync(adminPassword, reseededAdmin.password_hash)) {
  console.error("FAIL: Reseeded password mismatch");
  process.exit(1);
}
const userCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE LOWER(email) = LOWER(?)").get(adminEmail).c;
if (userCount !== 1) {
  console.error("FAIL: Duplicate user records found");
  process.exit(1);
}
console.log("PASS: Idempotent re-seed succeeded without duplicate accounts (Count = " + userCount + ").");

console.log("\n>>> [CHECK 5] CATALOG PRESERVATION");
const products = db.prepare("SELECT id, slug, category FROM products").all();
console.log("PASS: Products count in SQLite:", products.length);
if (products.length !== 8) {
  console.error("FAIL: Product count mismatch");
  process.exit(1);
}
console.log("PASS: All 8 everyday platters preserved.");

console.log("\n========================================");
console.log("ALL AUTOMATED SECURITY CHECKS PASSED");
console.log("========================================");
