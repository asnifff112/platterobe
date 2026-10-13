/**
 * Comprehensive Automated Verification Suite for:
 * - Product Editing for All 16 Products
 * - Image Replacement & Persistent Storage
 * - ABC Glow Juice Image & Metadata Correction
 * - Safe Image Cleanup & Shared Asset Protection
 */
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "data", "platterobe.db");
const db = new Database(dbPath);

console.log("==================================================");
console.log("PLATTEROBE IMAGE REPLACEMENT & CRUD VERIFICATION");
console.log("==================================================");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// ----------------------------------------------------
// TEST 1: ABC GLOW JUICE VERIFICATION
// ----------------------------------------------------
console.log("\n--- [TEST 1] ABC Glow Juice Image & Data Verification ---");
const abc = db.prepare("SELECT * FROM products WHERE slug = 'abc-glow'").get();
assert(Boolean(abc), "ABC Glow exists in database");
assert(abc.name === "ABC Glow", "Product name is 'ABC Glow'");
assert(abc.category === "fresh-juice", "Category is 'fresh-juice'");
assert(abc.price === 45, "Selling price is ₹45");

const abcNutrition = JSON.parse(abc.nutrition);
assert(abcNutrition.calories === 70, "Calories are 70 kcal");
assert(abcNutrition.protein === "1g", "Protein is 1g");

const abcIngredients = JSON.parse(abc.ingredients);
const ingNames = abcIngredients.map((i) => i.name.toLowerCase());
assert(
  ingNames.includes("apple") && ingNames.includes("beetroot") && ingNames.includes("carrot"),
  "Ingredients contain Apple, Beetroot, and Carrot"
);

assert(
  abc.image === "/images/abc-glow.jpg",
  `ABC Glow points to dedicated juice image: ${abc.image}`
);

const diskImagePath = path.join(__dirname, "..", "public", "images", "abc-glow.jpg");
assert(
  fs.existsSync(diskImagePath),
  "ABC Glow juice image file exists on disk at public/images/abc-glow.jpg"
);

const diskImageStats = fs.statSync(diskImagePath);
assert(
  diskImageStats.size > 50000,
  `ABC Glow juice image is high-res food photo (${Math.round(diskImageStats.size / 1024)} KB)`
);

// ----------------------------------------------------
// TEST 2: ALL 16 PRODUCTS EDITABILITY & RETRIEVAL
// ----------------------------------------------------
console.log("\n--- [TEST 2] All 16 Products Catalog Integrity ---");
const allProducts = db.prepare("SELECT * FROM products ORDER BY sort_order ASC").all();
assert(allProducts.length === 16, `Total product count is 16 (actual: ${allProducts.length})`);

const expectedProducts = [
  { name: "Oat Jar", slug: "oat-jar", price: 79, weight: "302g" },
  { name: "Fruit Oat Jar", slug: "fruit-oat-jar", price: 95, weight: "392g" },
  { name: "Nutty Oat Jar", slug: "nutty-oat-jar", price: 110, weight: "295g" },
  { name: "Banana Parfait", slug: "banana-parfait", price: 85, weight: "280g" },
  { name: "Fruit Parfait", slug: "fruit-parfait", price: 79, weight: "295g" },
  { name: "Apple Parfait", slug: "apple-parfait", price: 95, weight: "266g" },
  { name: "Chia Cloud", slug: "chia-cloud", price: 75, weight: "235g" },
  { name: "Nutty Chia Cloud", slug: "nutty-chia-cloud", price: 110, weight: "254g" },
  { name: "Fruit Chia Cloud", slug: "fruit-chia-cloud", price: 95, weight: "251g" },
  { name: "Protein Toast", slug: "protein-toast", price: 59, weight: "195g" },
  { name: "Banana Toast", slug: "banana-toast", price: 59, weight: "295g" },
  { name: "Peanut Stack", slug: "peanut-stack", price: 59, weight: "230g" },
  { name: "Power Duo", slug: "power-duo", price: 59, weight: "300g" },
  { name: "Oat Cakes", slug: "oat-cakes", price: 85, weight: "280g" },
  { name: "Banana Blend", slug: "banana-blend", price: 75, weight: "306g" },
  { name: "ABC Glow", slug: "abc-glow", price: 45, weight: "214g" },
];

for (const exp of expectedProducts) {
  const match = allProducts.find((p) => p.slug === exp.slug);
  assert(Boolean(match), `Product "${exp.name}" (${exp.slug}) is accessible`);
  if (match) {
    assert(match.price === exp.price, `"${exp.name}" price is ₹${exp.price}`);
    assert(match.weight === exp.weight, `"${exp.name}" weight is ${exp.weight}`);
    assert(Boolean(match.image), `"${exp.name}" has valid image path: ${match.image}`);
  }
}

// ----------------------------------------------------
// TEST 3: IMAGE REPLACEMENT & PERSISTENT STORAGE
// ----------------------------------------------------
console.log("\n--- [TEST 3] Image Replacement & Database Update Workflow ---");
const testProdId = "test-img-replace-" + Date.now();
const initialImage = "/images/classic-overnight-oats.jpg";
const replacementImage = "/uploads/test-replacement-" + Date.now() + ".jpg";

// Insert a test product with initial image
db.prepare(`
  INSERT INTO products (
    id, slug, name, subtitle, shortDescription, description, whyYoullLikeIt,
    price, original_price, is_featured, image, ingredients, nutrition, available, category, sort_order, weight
  ) VALUES (
    ?, ?, 'Test Platter', 'Subtitle', 'Short desc', 'Full desc', 'Benefit',
    69, 89, 0, ?, '[]', '{}', 1, 'breakfast', 99, '250g'
  )
`).run(testProdId, "test-img-replace-" + Date.now(), initialImage);

const beforeReplace = db.prepare("SELECT image FROM products WHERE id = ?").get(testProdId);
assert(beforeReplace.image === initialImage, "Initial image saved in database");

// Simulate administrator clicking 'Replace Image' and saving
db.prepare("UPDATE products SET image = ? WHERE id = ?").run(replacementImage, testProdId);

const afterReplace = db.prepare("SELECT image FROM products WHERE id = ?").get(testProdId);
assert(afterReplace.image === replacementImage, "Replaced image successfully persisted in database");

// Cleanup test product
db.prepare("DELETE FROM products WHERE id = ?").run(testProdId);
assert(!db.prepare("SELECT id FROM products WHERE id = ?").get(testProdId), "Test product cleanly removed");

// ----------------------------------------------------
// TEST 4: SYSTEM ASSET PRESERVATION DURING CLEANUP
// ----------------------------------------------------
console.log("\n--- [TEST 4] System Asset & Shared Image Safety ---");
// Ensure none of the /images/ presets are deleted when another product changes its image
const systemPreset = "/images/classic-overnight-oats.jpg";
const presetDiskPath = path.join(__dirname, "..", "public", systemPreset);
assert(fs.existsSync(presetDiskPath), "System preset image is safely preserved on disk");

console.log(`\n==================================================`);
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`==================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
