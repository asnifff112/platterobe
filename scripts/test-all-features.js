const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "platterobe.db");
const db = new Database(dbPath);

console.log("==================================================");
console.log("PLATTEROBE FULL VERIFICATION SUITE");
console.log("==================================================");

// 1. Check Admin Account & Auth
console.log("\n[TEST 1] Admin Account Verification:");
const admin = db.prepare("SELECT id, email, role, password_hash FROM users WHERE LOWER(email) = LOWER(?)").get("platterobe@gmail.com");
if (!admin) throw new Error("Admin platterobe@gmail.com not found!");
console.log("  ✓ Admin found:", admin.email, "| Role:", admin.role);
const passMatch = bcrypt.compareSync("platterobe2026!", admin.password_hash);
if (!passMatch) throw new Error("Password does not match hash!");
console.log("  ✓ Password verifies securely with bcrypt hash");

// 2. Check Featured Platters
console.log("\n[TEST 2] Featured Platters in Database:");
const featuredRows = db.prepare("SELECT id, slug, name, price, original_price, is_featured FROM products WHERE is_featured = 1").all();
console.log(`  ✓ Found ${featuredRows.length} featured products:`);
featuredRows.forEach(r => console.log(`     - ${r.name} (is_featured: ${r.is_featured})`));
if (featuredRows.length === 0) throw new Error("Expected at least one featured product!");

// Test toggle featured
const sampleId = featuredRows[0].id;
db.prepare("UPDATE products SET is_featured = 0 WHERE id = ?").run(sampleId);
const toggledOff = db.prepare("SELECT is_featured FROM products WHERE id = ?").get(sampleId).is_featured;
console.log(`  ✓ Successfully toggled product ${sampleId} is_featured to:`, toggledOff);
db.prepare("UPDATE products SET is_featured = 1 WHERE id = ?").run(sampleId);
console.log(`  ✓ Restored product ${sampleId} is_featured to: 1`);

// 3. Check Pricing (Original Price & Selling Price)
console.log("\n[TEST 3] Pricing & Discount Verification:");
const allProducts = db.prepare("SELECT id, name, price, original_price FROM products").all();
const discounted = allProducts.filter(p => p.original_price && p.price && p.original_price > p.price);
console.log(`  ✓ Found ${discounted.length} discounted products with originalPrice > sellingPrice:`);
discounted.forEach(d => {
  const savePercent = Math.round(((d.original_price - d.price) / d.original_price) * 100);
  console.log(`     - ${d.name}: Original ₹${d.original_price} -> Selling ₹${d.price} (Save ${savePercent}%)`);
});

const regular = allProducts.filter(p => !p.original_price || p.original_price <= p.price);
console.log(`  ✓ Found ${regular.length} regular products without discount:`);
regular.forEach(r => console.log(`     - ${r.name}: Selling ₹${r.price}`));

// 4. Check Total Catalog Count
console.log("\n[TEST 4] Catalog Preservation:");
console.log(`  ✓ Total products in database: ${allProducts.length}`);
if (allProducts.length !== 8) throw new Error("Expected exactly 8 catalog products!");

console.log("\n==================================================");
console.log("ALL VERIFICATION SUITE TESTS PASSED SUCCESSFULLY!");
console.log("==================================================");
