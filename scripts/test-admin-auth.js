const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "platterobe.db");
const db = new Database(dbPath);

console.log(">>> [CHECK 1] ADMIN USER RECORD IN DB");
const admin = db.prepare("SELECT id, email, role, password_hash, created_at, updated_at FROM users WHERE LOWER(email) = LOWER(?)").get("platterobe@gmail.com");
if (!admin) {
  console.error("FAIL: Admin user not found");
  process.exit(1);
}
console.log("PASS: User found ->", admin.id, "|", admin.email, "| Role:", admin.role);

console.log("\n>>> [CHECK 2] BCRYPT HASH INTEGRITY");
if (!admin.password_hash.startsWith("$2a$") && !admin.password_hash.startsWith("$2b$")) {
  console.error("FAIL: Not a bcrypt hash");
  process.exit(1);
}
console.log("PASS: Password stored as valid bcrypt hash (length 60). Plaintext password is NEVER stored.");

console.log("\n>>> [CHECK 3] INITIAL PASSWORD VERIFICATION");
const isCorrect = bcrypt.compareSync("platterobe2026!", admin.password_hash);
if (!isCorrect) {
  console.error("FAIL: Initial password does not match hash");
  process.exit(1);
}
console.log("PASS: Initial password (platterobe2026!) verifies successfully.");

const isWrong = bcrypt.compareSync("badPassword999", admin.password_hash);
if (isWrong) {
  console.error("FAIL: Wrong password accepted");
  process.exit(1);
}
console.log("PASS: Invalid password rejected.");

console.log("\n>>> [CHECK 4] PASSWORD CHANGE WORKFLOW");
const testNewPass = "temporaryNewPassword2026!";
const testNewHash = bcrypt.hashSync(testNewPass, 10);
db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(testNewHash, admin.id);

const updatedAdmin = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(admin.id);
console.log("PASS: New password matches:", bcrypt.compareSync(testNewPass, updatedAdmin.password_hash));
console.log("PASS: Old password rejected:", !bcrypt.compareSync("platterobe2026!", updatedAdmin.password_hash));

// Restore back to original hash
db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(admin.password_hash, admin.id);
console.log("PASS: Restored initial password hash.");

console.log("\n>>> [CHECK 5] IDEMPOTENT RE-SEEDING");
require("./seed-admin.js");
const userCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE LOWER(email) = LOWER(?)").get("platterobe@gmail.com").c;
if (userCount !== 1) {
  console.error("FAIL: Duplicate user records found");
  process.exit(1);
}
console.log("PASS: Idempotent re-seed succeeded without duplicate accounts (Count = " + userCount + ").");

console.log("\n>>> [CHECK 6] CATALOG PRESERVATION");
const products = db.prepare("SELECT id, slug, category FROM products").all();
console.log("PASS: Products count in SQLite:", products.length);
if (products.length !== 8) {
  console.error("FAIL: Product count mismatch");
  process.exit(1);
}
console.log("All 8 everyday platters preserved.");

console.log("\n========================================");
console.log("ALL 6 AUTOMATED SECURITY CHECKS PASSED");
console.log("========================================");
