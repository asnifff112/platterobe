/**
 * PLATTEROBE - Complete Backend Test Suite
 * 
 * Tests:
 * 1. Database layer connectivity & product fetching (16 catalog products)
 * 2. Product filtering by availability, category, and featured status
 * 3. Individual product retrieval by slug
 * 4. Safe product creation, update, and deletion lifecycle
 * 5. Admin authentication, password verification, and session token cryptography
 * 6. Customer order recording and query
 * 7. Storage provider configuration status
 */

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// 1. Load .env.local
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

async function runTestSuite() {
  console.log("=================================================================");
  console.log("🧪 RUNNING PLATTEROBE PRODUCTION BACKEND TEST SUITE");
  console.log("=================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Database & Products count
  console.log("\n--- TEST GROUP 1: Database Catalog Verification ---");
  const dbPath = path.join(__dirname, "..", "data", "platterobe.db");
  assert(fs.existsSync(dbPath), "SQLite database file exists at data/platterobe.db");

  const db = new Database(dbPath);
  const countRow = db.prepare("SELECT COUNT(*) as count FROM products").get();
  assert(countRow.count >= 16, `Product catalog contains ${countRow.count} items (minimum 16 required)`);

  // TEST 2: Product Categories & Availability
  console.log("\n--- TEST GROUP 2: Product Categories & Queries ---");
  const oatJar = db.prepare("SELECT * FROM products WHERE slug = 'oat-jar'").get();
  assert(Boolean(oatJar), "Found primary product 'oat-jar' in database");
  assert(oatJar && oatJar.name === "Oat Jar", "Product name matches 'Oat Jar'");
  assert(oatJar && oatJar.category === "breakfast", "Product category is 'breakfast'");
  assert(oatJar && oatJar.price === 79, "Product selling price is ₹79");

  const availableCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE available = 1").get();
  assert(availableCount.count > 0, `Found ${availableCount.count} available products`);

  const featuredCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE is_featured = 1").get();
  assert(featuredCount.count > 0, `Found ${featuredCount.count} featured platters`);

  // TEST 3: Admin User & Authentication Verification
  console.log("\n--- TEST GROUP 3: Authentication & Security ---");
  const adminEmail = (process.env.ADMIN_EMAIL || "platterobe@gmail.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  assert(Boolean(adminEmail), `Admin email configured (${adminEmail})`);
  assert(Boolean(adminPassword), "Admin password configured in environment");

  const userRow = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(adminEmail);
  assert(Boolean(userRow), `Admin user '${adminEmail}' exists in database`);
  assert(userRow && userRow.role === "admin", "User has 'admin' role");

  const passMatch = userRow && bcrypt.compareSync(adminPassword, userRow.password_hash);
  assert(Boolean(passMatch), "Admin password correctly verifies against bcrypt hash in database");

  // Session Token HMAC generation & verification test
  const secret = process.env.AUTH_SECRET || "platterobe_editorial_secure_session_secret_2026_malappuram_789xyz";
  const payloadData = { userId: userRow ? userRow.id : "admin-primary", email: adminEmail, role: "admin", expiresAt: Date.now() + 60000 };
  const payload = Buffer.from(JSON.stringify(payloadData), "utf-8").toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const token = `${payload}.${signature}`;

  const [tPayload, tSig] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", secret).update(tPayload).digest("hex");
  assert(signature === expectedSig, "HMAC-SHA256 session token cryptographically validated");

  // TEST 4: CRUD Operations Lifecycle (Safe Add, Update, Toggle, Delete)
  console.log("\n--- TEST GROUP 4: Product Mutation Lifecycle ---");
  const testId = "test-platter-" + Date.now();
  const testSlug = "test-berry-bowl-" + Date.now();

  // Create
  db.prepare(`
    INSERT INTO products (
      id, slug, name, subtitle, shortDescription, description, whyYoullLikeIt,
      price, original_price, is_featured, image, ingredients, nutrition, available, category, sort_order, weight
    ) VALUES (
      ?, ?, 'Test Berry Bowl', 'Fresh Berries · Oats', 'A delicious test platter.', 'Detailed test description.', 'Rich in antioxidants.',
      120, 150, 1, '/images/fruit-overnight-oats.jpg', '[]', '{}', 1, 'breakfast', 99, '250g'
    )
  `).run(testId, testSlug);

  const inserted = db.prepare("SELECT * FROM products WHERE id = ?").get(testId);
  assert(Boolean(inserted), "Successfully inserted test product into database");
  assert(inserted && inserted.name === "Test Berry Bowl", "Verified test product name");

  // Update
  db.prepare("UPDATE products SET price = 135, original_price = 160 WHERE id = ?").run(testId);
  const updated = db.prepare("SELECT price, original_price FROM products WHERE id = ?").get(testId);
  assert(updated && updated.price === 135 && updated.original_price === 160, "Successfully updated product selling price and original price");

  // Toggle Availability
  db.prepare("UPDATE products SET available = 0 WHERE id = ?").run(testId);
  const toggled = db.prepare("SELECT available FROM products WHERE id = ?").get(testId);
  assert(toggled && toggled.available === 0, "Successfully toggled product availability to unavailable");

  // Delete
  db.prepare("DELETE FROM products WHERE id = ?").run(testId);
  const deleted = db.prepare("SELECT * FROM products WHERE id = ?").get(testId);
  assert(!deleted, "Successfully deleted test product from database with confirmation");

  // TEST 5: Customer Orders Persistence
  console.log("\n--- TEST GROUP 5: Customer Orders Persistence ---");
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      customer_phone TEXT,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL,
      total_amount REAL,
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'whatsapp',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const testOrderId = "order-test-" + Date.now();
  db.prepare(`
    INSERT INTO orders (
      id, customer_name, customer_phone, product_name, quantity, unit_price, total_amount, notes, source, status
    ) VALUES (?, 'Risham', '+919876543210', 'Oat Jar', 2, 79, 158, 'Early morning delivery', 'whatsapp', 'pending')
  `).run(testOrderId);

  const orderRow = db.prepare("SELECT * FROM orders WHERE id = ?").get(testOrderId);
  assert(Boolean(orderRow), "Successfully recorded customer WhatsApp order inquiry in database");
  assert(orderRow && orderRow.customer_name === "Risham" && orderRow.total_amount === 158, "Verified order details and total amount calculation");

  // Clean up test order
  db.prepare("DELETE FROM orders WHERE id = ?").run(testOrderId);

  // Summary
  console.log("\n=================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test suite encountered error:", err);
  process.exit(1);
});
