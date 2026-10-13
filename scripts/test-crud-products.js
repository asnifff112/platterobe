/**
 * Verification test for Complete Admin Product Management (16 Official Items + Full CRUD)
 */
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "platterobe.db");
const db = new Database(dbPath);

console.log("==================================================");
console.log("PLATTEROBE CRUD & 16 PRODUCTS VERIFICATION TEST");
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

// 1. Verify all 16 items exist
const allRows = db.prepare("SELECT * FROM products ORDER BY sort_order ASC").all();
assert(allRows.length === 16, `Expected 16 products in database, found ${allRows.length}`);

const expectedNames = [
  "Oat Jar",
  "Fruit Oat Jar",
  "Nutty Oat Jar",
  "Banana Parfait",
  "Fruit Parfait",
  "Apple Parfait",
  "Chia Cloud",
  "Nutty Chia Cloud",
  "Fruit Chia Cloud",
  "Protein Toast",
  "Banana Toast",
  "Peanut Stack",
  "Power Duo",
  "Oat Cakes",
  "Banana Blend",
  "ABC Glow",
];

for (const expectedName of expectedNames) {
  const match = allRows.find((r) => r.name === expectedName);
  assert(Boolean(match), `Official product "${expectedName}" exists`);
  if (match) {
    const ingredients = JSON.parse(match.ingredients);
    const nutrition = JSON.parse(match.nutrition);
    assert(
      Array.isArray(ingredients) && ingredients.length > 0,
      `"${expectedName}" has structured ingredients (${ingredients.length} items)`
    );
    assert(
      Boolean(match.weight),
      `"${expectedName}" has weight recorded (${match.weight})`
    );
    assert(
      match.price !== null && match.price > 0,
      `"${expectedName}" has valid selling price (₹${match.price})`
    );
  }
}

// 2. Test CREATE (CRUD - C)
console.log("\n--- Testing Product Creation (CRUD: Create) ---");
const testId = "test-item-" + Date.now();
const testSlug = "test-super-bowl-" + Date.now();

const insertStmt = db.prepare(`
  INSERT INTO products (
    id, slug, name, subtitle, shortDescription, description, whyYoullLikeIt,
    price, original_price, is_featured, image, ingredients, nutrition, available, category, sort_order, weight, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
  )
`);

insertStmt.run(
  testId,
  testSlug,
  "Super Energy Bowl",
  "Quinoa · Almond Milk · Blueberries",
  "High protein breakfast bowl",
  "Full description of energy bowl",
  "Long lasting clean morning stamina",
  89,
  119,
  1,
  "/images/classic-overnight-oats.jpg",
  JSON.stringify([
    { name: "Quinoa", quantity: "70", unit: "g" },
    { name: "Almond milk", quantity: "150", unit: "ml" },
  ]),
  JSON.stringify({ calories: 420, protein: "16g" }),
  1,
  "breakfast",
  99,
  "320g"
);

const createdRow = db.prepare("SELECT * FROM products WHERE id = ?").get(testId);
assert(Boolean(createdRow), "Product created successfully in SQLite database");
assert(createdRow.name === "Super Energy Bowl", "Created product name matches");
assert(createdRow.price === 89, "Created product price matches (₹89)");
assert(createdRow.weight === "320g", "Created product weight matches (320g)");
assert(createdRow.is_featured === 1, "Created product featured status is 1");

// 3. Test READ (CRUD - R)
console.log("\n--- Testing Product Read (CRUD: Read) ---");
const readRow = db.prepare("SELECT * FROM products WHERE slug = ?").get(testSlug);
assert(readRow && readRow.id === testId, "Product read by slug works");
const parsedIngs = JSON.parse(readRow.ingredients);
assert(parsedIngs.length === 2 && parsedIngs[0].name === "Quinoa", "Ingredients read and parsed correctly");

// 4. Test UPDATE (CRUD - U)
console.log("\n--- Testing Product Update (CRUD: Update) ---");
const updateStmt = db.prepare(`
  UPDATE products SET
    name = ?,
    price = ?,
    original_price = ?,
    weight = ?,
    ingredients = ?,
    available = ?,
    is_featured = ?,
    category = ?,
    updated_at = datetime('now')
  WHERE id = ?
`);

const updatedIngredients = [
  { name: "Quinoa", quantity: "80", unit: "g" },
  { name: "Almond milk", quantity: "160", unit: "ml" },
  { name: "Chia seeds", quantity: "10", unit: "g" }, // added ingredient
];

updateStmt.run(
  "Super Energy Bowl (Updated)",
  99,
  129,
  "350g",
  JSON.stringify(updatedIngredients),
  0, // toggled unavailable
  0, // toggled standard
  "lunch", // changed category
  testId
);

const updatedRow = db.prepare("SELECT * FROM products WHERE id = ?").get(testId);
assert(updatedRow.name === "Super Energy Bowl (Updated)", "Updated product name persisted");
assert(updatedRow.price === 99, "Updated product price persisted (₹99)");
assert(updatedRow.weight === "350g", "Updated product weight persisted (350g)");
assert(updatedRow.available === 0, "Updated product availability toggled to 0 (Sold Out)");
assert(updatedRow.is_featured === 0, "Updated product featured toggled to 0");
assert(updatedRow.category === "lunch", "Updated product category persisted as lunch");
const reloadedIngs = JSON.parse(updatedRow.ingredients);
assert(reloadedIngs.length === 3, "Updated dynamic ingredient list persisted with 3 items");
assert(reloadedIngs[2].name === "Chia seeds", "Added ingredient preserved");

// 5. Test DELETE (CRUD - D)
console.log("\n--- Testing Safe Deletion (CRUD: Delete) ---");
const deleteStmt = db.prepare("DELETE FROM products WHERE id = ?");
const delRes = deleteStmt.run(testId);
assert(delRes.changes === 1, "Delete operation successfully removed product");

const postDelete = db.prepare("SELECT * FROM products WHERE id = ?").get(testId);
assert(!postDelete, "Product no longer exists after deletion");

const finalCount = db.prepare("SELECT COUNT(*) as count FROM products").get().count;
assert(finalCount === 16, `Total product count is exactly 16 after test cleanup (actual: ${finalCount})`);

console.log(`\n==================================================`);
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`==================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
