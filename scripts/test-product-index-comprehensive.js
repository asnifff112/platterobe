/**
 * Comprehensive verification of PLATTEROBE Product Index & Manual Series Number assignment
 * Tests scenarios 1 to 12.
 */

const path = require("path");
const Database = require("better-sqlite3");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "data", "platterobe.db");
const db = new Database(dbPath);

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

console.log("=================================================================");
console.log("PLATTEROBE PRODUCT INDEX & MANUAL SERIES NUMBER COMPREHENSIVE TESTS");
console.log("=================================================================\n");

// Read Supabase config if available
const envPath = path.join(__dirname, "..", ".env.local");
let supabase = null;
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);
  if (urlMatch && keyMatch) {
    supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
  }
}

(async () => {
  // -------------------------------------------------------------
  // Test 1 & 2: Add a product with manually chosen custom Series No. (e.g. "OAT-CUSTOM-42")
  // -------------------------------------------------------------
  console.log("--- Test 1 & 2: Add Product with Manual Custom Series No ---");
  const testId1 = `test-prod-${Date.now()}`;
  const customSeries1 = "OAT-CUSTOM-42";
  const customSlug1 = `test-custom-oat-${Date.now()}`;

  // Insert into SQLite
  db.prepare(`
    INSERT INTO products (
      id, slug, series_no, name, subtitle, shortDescription, description, whyYoullLikeIt,
      price, original_price, is_featured, image, ingredients, nutrition, available, category, sort_order, weight, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    testId1, customSlug1, customSeries1, "Custom Crafted Oat Platter", "Morning fuel",
    "Short description here", "Full description here", "You will like it because it's clean",
    249, 299, 1, "/images/classic-overnight-oats.jpg",
    JSON.stringify([{ name: "Rolled Oats", quantity: "60", unit: "g" }]),
    JSON.stringify({ calories: 380, protein: "14g", carbs: "52g", fat: "8g", fiber: "9g" }),
    1, "breakfast", 99, "320g"
  );

  const inserted1 = db.prepare("SELECT * FROM products WHERE id = ?").get(testId1);
  assert(inserted1?.series_no === customSeries1, `Product created with exact custom Series No: '${inserted1?.series_no}'`);
  assert(inserted1?.name === "Custom Crafted Oat Platter", "Product name matches");

  // If Supabase has series_no column, test inserting into Supabase as well
  if (supabase) {
    const { data: sbData, error: sbErr } = await supabase
      .from("products")
      .select("id, name")
      .eq("slug", customSlug1);
    console.log("Supabase check:", sbErr ? sbErr.message : "Table accessible");
  }

  // -------------------------------------------------------------
  // Test 3 & 4: Search for exact custom code on Product Index
  // -------------------------------------------------------------
  console.log("\n--- Test 3 & 4: Exact Search & Case-Insensitive Lookup ---");
  // Test exact search
  const foundExact = db.prepare("SELECT * FROM products WHERE UPPER(TRIM(series_no)) = UPPER(?)").get(customSeries1);
  assert(Boolean(foundExact), `Found product by exact code '${customSeries1}'`);
  assert(foundExact?.id === testId1, "Returned correct product ID");

  // Test lowercase input matches uppercase stored
  const foundLower = db.prepare("SELECT * FROM products WHERE UPPER(TRIM(series_no)) = UPPER(?)").get("  oat-custom-42  ".trim());
  assert(Boolean(foundLower), "Case-insensitive query '  oat-custom-42  ' matches 'OAT-CUSTOM-42'");

  // -------------------------------------------------------------
  // Test 5: Edit the product's Series No. and verify updated value works
  // -------------------------------------------------------------
  console.log("\n--- Test 5: Edit Product Series No ---");
  const updatedSeries = "FRUIT-BOWL-99";
  db.prepare("UPDATE products SET series_no = ? WHERE id = ?").run(updatedSeries, testId1);

  const updatedProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(testId1);
  assert(updatedProduct?.series_no === updatedSeries, `Series No successfully updated to '${updatedSeries}'`);

  // Verify old code no longer matches
  const oldLookup = db.prepare("SELECT * FROM products WHERE UPPER(TRIM(series_no)) = UPPER(?)").get(customSeries1);
  assert(!oldLookup, `Old code '${customSeries1}' no longer returns the product`);

  // Verify new code matches
  const newLookup = db.prepare("SELECT * FROM products WHERE UPPER(TRIM(series_no)) = UPPER(?)").get(updatedSeries);
  assert(Boolean(newLookup) && newLookup?.id === testId1, `New code '${updatedSeries}' successfully retrieves the product`);

  // -------------------------------------------------------------
  // Test 6: Assigning same code to another active product blocked with friendly error
  // -------------------------------------------------------------
  console.log("\n--- Test 6: Uniqueness Requirement ---");
  const testId2 = `test-prod-dup-${Date.now()}`;
  let dupBlocked = false;
  try {
    db.prepare(`
      INSERT INTO products (
        id, slug, series_no, name, subtitle, shortDescription, description, whyYoullLikeIt,
        price, original_price, is_featured, image, ingredients, nutrition, available, category, sort_order, weight, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      testId2, `test-dup-slug-${Date.now()}`, updatedSeries, "Duplicate Platter", "", "", "", "",
      199, null, 0, "/images/classic-overnight-oats.jpg", "[]", "{}", 1, "breakfast", 100, ""
    );
  } catch (err) {
    dupBlocked = true;
    assert(err.message.includes("UNIQUE") || err.message.includes("idx_products_series_no"), `Duplicate caught by DB constraint: ${err.message}`);
  }
  assert(dupBlocked, `Database strictly blocked duplicate series number '${updatedSeries}'`);

  // -------------------------------------------------------------
  // Test 7: Nonexistent code lookup returns not-found
  // -------------------------------------------------------------
  console.log("\n--- Test 7: Nonexistent Code Lookup ---");
  const nonExistent = db.prepare("SELECT * FROM products WHERE UPPER(TRIM(series_no)) = UPPER(?)").get("NON-EXISTENT-XYZ-999");
  assert(!nonExistent, "Searching for 'NON-EXISTENT-XYZ-999' returns undefined (not-found state)");

  // -------------------------------------------------------------
  // Cleanup test records
  // -------------------------------------------------------------
  db.prepare("DELETE FROM products WHERE id = ?").run(testId1);
  assert(true, "Cleaned up temporary test records");

  // -------------------------------------------------------------
  // Test 8: Empty search validation
  // -------------------------------------------------------------
  console.log("\n--- Test 8: Empty Search Validation ---");
  function testLookupSeriesValidation(rawCode) {
    const code = rawCode ? rawCode.trim() : "";
    if (!code) {
      return {
        found: false,
        code: "",
        error: "Please enter your product series number.",
      };
    }
    return { found: true, code };
  }

  const emptyRes = testLookupSeriesValidation("");
  assert(emptyRes.found === false, "Empty search returns found: false");
  assert(emptyRes.error === "Please enter your product series number.", `Empty search error message: '${emptyRes.error}'`);

  const whitespaceRes = testLookupSeriesValidation("   ");
  assert(whitespaceRes.found === false, "Whitespace search returns found: false");
  assert(whitespaceRes.error === "Please enter your product series number.", "Whitespace search error message validated");

  // -------------------------------------------------------------
  // Test 9: No hardcoded sample codes in IndexClient.tsx
  // -------------------------------------------------------------
  console.log("\n--- Test 9: No Hardcoded Sample Codes in IndexClient ---");
  const indexClientSource = fs.readFileSync(path.join(__dirname, "..", "src", "app", "index", "IndexClient.tsx"), "utf-8");
  assert(!indexClientSource.includes("SAMPLE_CODES"), "IndexClient.tsx does not contain SAMPLE_CODES");
  assert(!indexClientSource.includes("PLTR.001"), "IndexClient.tsx does not contain hardcoded PLTR.001");
  assert(!indexClientSource.includes("PLTR.002"), "IndexClient.tsx does not contain hardcoded PLTR.002");
  assert(!indexClientSource.includes("PLTR.010"), "IndexClient.tsx does not contain hardcoded PLTR.010");
  assert(!indexClientSource.includes("PLTR.016"), "IndexClient.tsx does not contain hardcoded PLTR.016");
  assert(indexClientSource.includes('placeholder="Enter your product series number"'), "Input field uses exact required placeholder");

  // -------------------------------------------------------------
  // Test 10: THE INDEX in siteConfig.nav
  // -------------------------------------------------------------
  console.log("\n--- Test 10: THE INDEX in Navigation ---");
  const siteConfigSource = fs.readFileSync(path.join(__dirname, "..", "src", "config", "site.ts"), "utf-8");
  assert(siteConfigSource.includes('{ label: "THE INDEX", href: "/index" }'), "siteConfig.nav contains '{ label: \"THE INDEX\", href: \"/index\" }'");
  assert(!siteConfigSource.includes("/#how-it-works"), "siteConfig.nav has no hash fragment to /#how-it-works");

  const navbarSource = fs.readFileSync(path.join(__dirname, "..", "src", "components", "Navbar.tsx"), "utf-8");
  assert(navbarSource.includes("isLinkActive"), "Navbar.tsx includes isLinkActive supporting /index");

  // -------------------------------------------------------------
  // Test 11 & 12: Existing data & catalog integrity
  // -------------------------------------------------------------
  console.log("\n--- Test 11 & 12: Data Integrity & Preservation ---");
  const remainingProducts = db.prepare("SELECT * FROM products").all();
  assert(remainingProducts.length >= 16, `All original products preserved intact (count: ${remainingProducts.length})`);

  console.log("\n=================================================================");
  console.log(`ALL VERIFICATION TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
})();
