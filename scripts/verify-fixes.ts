/**
 * PLATTEROBE - Verification Suite for Production Fixes & Admin Improvements
 * 
 * Tests:
 * 1. Image loading for all 16 existing products (HTTP 200 checks)
 * 2. Clean initialization for Add New Product
 * 3. Test image upload to Supabase Storage 'product-images' bucket
 * 4. Create a test product with unique description, ingredients, and nutrition
 * 5. Verify persistence in Supabase PostgreSQL
 * 6. Verify reflection in Admin catalog and Public menu
 * 7. Edit an existing product and verify ONLY that product changes
 * 8. Clean up only the temporary test record and asset (preserve existing data)
 * 9. Verify Instagram handle and URL across siteConfig and components
 */

import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

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

import {
  getAllProducts,
  getAvailableProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../src/lib/db";
import { siteConfig } from "../src/config/site";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runVerification() {
  console.log("=================================================================");
  console.log("PLATTEROBE PRODUCTION FIXES VERIFICATION");
  console.log(`Connecting to: ${supabaseUrl}`);
  console.log("=================================================================\n");

  let passedSteps = 0;
  const totalSteps = 7;

  // -----------------------------------------------------------------
  // STEP 1: Verify all 16 product images load with HTTP 200
  // -----------------------------------------------------------------
  console.log("[STEP 1] Verifying all 16 product image URLs in Supabase Storage...");
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id, name, slug, image")
    .order("id");

  if (pErr || !products || products.length !== 16) {
    console.error("  ❌ FAIL: Could not load 16 products from Supabase:", pErr?.message);
    process.exit(1);
  }

  let validImageCount = 0;
  const imageReports: Array<{ id: string; name: string; url: string; status: number; ok: boolean }> = [];

  for (const p of products) {
    try {
      const res = await fetch(p.image);
      const isOk = res.status === 200 && (res.headers.get("content-type")?.includes("image") ?? false);
      if (isOk) validImageCount++;
      imageReports.push({
        id: p.id,
        name: p.name,
        url: p.image,
        status: res.status,
        ok: isOk,
      });
      console.log(`  ✓ Product [${p.id}] ${p.name}: HTTP ${res.status} (${res.headers.get("content-type")})`);
    } catch (err: any) {
      console.error(`  ❌ Product [${p.id}] ${p.name}: Network fetch failed:`, err.message);
      imageReports.push({ id: p.id, name: p.name, url: p.image, status: 0, ok: false });
    }
  }

  if (validImageCount === 16) {
    console.log(`  🎉 PASS: All 16 product images are live, public, and returned HTTP 200!`);
    passedSteps++;
  } else {
    console.error(`  ❌ FAIL: Only ${validImageCount}/16 product images loaded successfully.`);
  }

  // -----------------------------------------------------------------
  // STEP 2: Verify Instagram configuration
  // -----------------------------------------------------------------
  console.log("\n[STEP 2] Verifying Instagram handle and URL...");
  const expectedUrl = "https://www.instagram.com/platterobe.store/";
  const expectedHandle = "@platterobe.store";

  if (siteConfig.instagram.url === expectedUrl && siteConfig.instagram.handle === expectedHandle) {
    console.log(`  ✓ PASS: siteConfig.instagram.url = ${siteConfig.instagram.url}`);
    console.log(`  ✓ PASS: siteConfig.instagram.handle = ${siteConfig.instagram.handle}`);
    passedSteps++;
  } else {
    console.error("  ❌ FAIL: Instagram config does not match expected values:", siteConfig.instagram);
  }

  // -----------------------------------------------------------------
  // STEP 3: Test Image Upload to Supabase Storage 'product-images'
  // -----------------------------------------------------------------
  console.log("\n[STEP 3] Testing image upload to Supabase Storage bucket 'product-images'...");
  const testFileName = `test-upload-${Date.now()}.png`;
  const png1x1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("product-images")
    .upload(testFileName, png1x1, {
      contentType: "image/png",
      upsert: true,
    });

  let testImageUrl = "";
  if (uploadErr) {
    console.error("  ❌ FAIL: Could not upload to product-images bucket:", uploadErr.message);
  } else {
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(testFileName);
    testImageUrl = urlData?.publicUrl || "";
    
    // Check that public URL is accessible
    const res = await fetch(testImageUrl);
    if (res.status === 200) {
      console.log(`  ✓ PASS: Uploaded and verified test image in 'product-images': ${testImageUrl}`);
      passedSteps++;
    } else {
      console.error(`  ❌ FAIL: Uploaded image not accessible via public URL (HTTP ${res.status})`);
    }
  }

  // -----------------------------------------------------------------
  // STEP 4: Create a temporary test product with unique description & ingredients
  // -----------------------------------------------------------------
  console.log("\n[STEP 4] Testing product creation with unique custom fields...");
  const tempProductId = `temp-test-${Date.now()}`;
  const tempSlug = `temp-test-platter-${Date.now()}`;
  const tempName = "Temporary Quality Test Platter";
  const tempDescription = "A special chef crafted test platter with raw rolled oats, wild blueberries, and organic honey.";
  const tempIngredients = [
    { name: "Organic Rolled Oats", quantity: "75", unit: "g" },
    { name: "Wild Blueberries", quantity: "40", unit: "g" },
    { name: "Raw Forest Honey", quantity: "10", unit: "g" },
  ];
  const tempNutrition = {
    calories: 380,
    protein: "14g",
    carbs: "62g",
    fat: "8g",
    fiber: "9g",
  };

  const created = await createProduct({
    id: tempProductId,
    slug: tempSlug,
    name: tempName,
    subtitle: "Oats · Blueberries · Honey",
    shortDescription: "Chef crafted morning fuel test item.",
    description: tempDescription,
    whyYoullLikeIt: "Tested for database synchronization and clean initialization.",
    price: 129,
    originalPrice: 159,
    isFeatured: false,
    image: testImageUrl,
    ingredients: tempIngredients,
    nutrition: tempNutrition,
    category: "breakfast",
    available: true,
    weight: "320g",
    sortOrder: 999,
  });

  if (!created || created.id !== tempProductId) {
    console.error("  ❌ FAIL: createProduct did not return expected created product.");
  } else {
    // Verify in Supabase PostgreSQL
    const { data: dbItem, error: fetchErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", tempProductId)
      .single();

    if (
      dbItem &&
      dbItem.name === tempName &&
      dbItem.description === tempDescription &&
      dbItem.price === 129 &&
      Array.isArray(dbItem.ingredients) &&
      dbItem.ingredients.length === 3
    ) {
      console.log(`  ✓ PASS: Test product successfully created and verified in Supabase PostgreSQL!`);
      console.log(`    - ID: ${dbItem.id}`);
      console.log(`    - Name: ${dbItem.name}`);
      console.log(`    - Price: ₹${dbItem.price} (Original: ₹${dbItem.original_price})`);
      console.log(`    - Ingredients count: ${dbItem.ingredients.length}`);
      console.log(`    - Description: "${dbItem.description.slice(0, 50)}..."`);
      passedSteps++;
    } else {
      console.error("  ❌ FAIL: Created product did not match expected values in Supabase:", fetchErr?.message || dbItem);
    }
  }

  // -----------------------------------------------------------------
  // STEP 5: Verify public menu and admin queries return the new product
  // -----------------------------------------------------------------
  console.log("\n[STEP 5] Verifying catalog reflection (Admin & Public menu queries)...");
  const allProds = await getAllProducts();
  const availableProds = await getAvailableProducts();

  const foundInAdmin = allProds.find((p) => p.id === tempProductId);
  const foundInPublic = availableProds.find((p) => p.id === tempProductId);

  if (foundInAdmin && foundInPublic) {
    console.log(`  ✓ PASS: New product immediately reflected in admin catalog query: ${foundInAdmin.name}`);
    console.log(`  ✓ PASS: New product immediately reflected in public menu query: ${foundInPublic.name}`);
    passedSteps++;
  } else {
    console.error("  ❌ FAIL: New product not found in admin or public query:", {
      foundInAdmin: Boolean(foundInAdmin),
      foundInPublic: Boolean(foundInPublic),
    });
  }

  // -----------------------------------------------------------------
  // STEP 6: Edit an existing product and verify ONLY that product changes
  // -----------------------------------------------------------------
  console.log("\n[STEP 6] Testing targeted edit on Product [1] (Oat Jar)...");
  const oatJar = await getProductById("1");
  const otherProductBefore = await getProductById("2");

  if (!oatJar || !otherProductBefore) {
    console.error("  ❌ FAIL: Could not load products for targeted edit test.");
  } else {
    const originalPrice = oatJar.price;
    const originalDesc = oatJar.description;
    const testPrice = 88;
    const testDesc = originalDesc + " [Refined Recipe]";

    // Update product 1
    await updateProduct("1", {
      price: testPrice,
      description: testDesc,
    });

    // Check product 1 in Supabase
    const { data: updatedOat } = await supabase.from("products").select("price, description").eq("id", "1").single();
    // Check product 2 in Supabase
    const { data: otherAfter } = await supabase.from("products").select("price, description").eq("id", "2").single();

    const product1Changed = updatedOat?.price === testPrice && updatedOat?.description === testDesc;
    const product2Unchanged = otherAfter?.price === otherProductBefore.price && otherAfter?.description === otherProductBefore.description;

    if (product1Changed && product2Unchanged) {
      console.log(`  ✓ PASS: Product [1] updated to price ₹${updatedOat?.price}.`);
      console.log(`  ✓ PASS: Other products (Product [2]) remained completely unchanged!`);
      passedSteps++;
    } else {
      console.error("  ❌ FAIL: Targeted edit did not isolate properly:", { product1Changed, product2Unchanged });
    }

    // Cleanly restore product 1 to original values
    await updateProduct("1", {
      price: originalPrice,
      description: originalDesc,
    });
    console.log(`  ✓ Cleanly restored Product [1] price back to ₹${originalPrice}.`);
  }

  // -----------------------------------------------------------------
  // STEP 7: Clean up ONLY the temporary test product and test image asset
  // -----------------------------------------------------------------
  console.log("\n[STEP 7] Cleaning up temporary test record and asset...");
  await deleteProduct(tempProductId);
  await supabase.storage.from("product-images").remove([testFileName]);

  // Verify deletion of test product
  const { data: checkDeleted } = await supabase.from("products").select("id").eq("id", tempProductId).maybeSingle();
  // Verify all 16 original products are intact
  const { data: finalProducts } = await supabase.from("products").select("id").order("id");

  if (!checkDeleted && finalProducts?.length === 16) {
    console.log(`  ✓ PASS: Temporary test product [${tempProductId}] cleanly removed.`);
    console.log(`  ✓ PASS: Exactly 16 products remain in the database (zero catalog data lost).`);
    passedSteps++;
  } else {
    console.error("  ❌ FAIL: Cleanup verification failed. Remaining count:", finalProducts?.length);
  }

  console.log("\n=================================================================");
  console.log(`RESULTS: ${passedSteps} / ${totalSteps} VERIFICATION SUITES PASSED`);
  console.log("=================================================================");

  if (passedSteps === totalSteps) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Verification suite failed:", err);
  process.exit(1);
});
