/**
 * PLATTEROBE - End-to-End System & Integration Verification
 * 
 * Verifies all 9 requirements:
 * 1. All 16 products load from Supabase PostgreSQL
 * 2. Admin login authentication flow
 * 3. Product edit (description/price) persists to Supabase
 * 4. Admin query reflects the updated product
 * 5. Public menu query reflects the updated product
 * 6. Image upload to Supabase Storage 'product-images' bucket
 * 7. Unauthorized operations (create/edit/delete) are strictly blocked
 * 8. WhatsApp ordering link generation and order inquiry recording work
 */

import path from "path";
import fs from "fs";

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

import { createClient } from "@supabase/supabase-js";
import { verifyAdminCredentials, createSessionToken, verifySessionToken } from "../src/lib/auth";
import { getAllProducts, getAvailableProducts, getProductById, updateProduct } from "../src/lib/db";
import { buildProductOrderUrl } from "../src/lib/whatsapp";
import { createOrder } from "../src/lib/db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const anonClient = createClient(supabaseUrl, anonKey);
const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function runTests() {
  console.log("=================================================================");
  console.log("PLATTEROBE E2E VERIFICATION SUITE");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log("=================================================================");

  let passedTests = 0;
  let totalTests = 8;

  // -------------------------------------------------------------
  // TEST 1: Verify all 16 products load from Supabase
  // -------------------------------------------------------------
  console.log("\n[TEST 1] Verifying all 16 products load from Supabase PostgreSQL...");
  const { data: dbProducts, error: prodErr } = await adminClient
    .from("products")
    .select("id, name, slug, price, category, available")
    .order("id");

  if (prodErr || !dbProducts) {
    console.error("  ❌ FAIL: Could not load products from Supabase:", prodErr?.message);
  } else if (dbProducts.length !== 16) {
    console.error(`  ❌ FAIL: Expected 16 products, found ${dbProducts.length}`);
  } else {
    console.log(`  ✓ PASS: Successfully loaded all ${dbProducts.length} products directly from Supabase.`);
    dbProducts.forEach((p) => console.log(`    - [${p.id}] ${p.name} (₹${p.price}) -> ${p.category}`));
    passedTests++;
  }

  // -------------------------------------------------------------
  // TEST 2: Admin login authentication flow
  // -------------------------------------------------------------
  console.log("\n[TEST 2] Verifying admin authentication flow...");
  const adminEmail = process.env.ADMIN_EMAIL || "platterobe@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("  ❌ FAIL: ADMIN_PASSWORD is not configured in .env.local");
  } else {
    const authResult = await verifyAdminCredentials(adminEmail, adminPassword);
    if (!authResult.isValid || !authResult.user) {
      console.error("  ❌ FAIL: verifyAdminCredentials failed for admin email:", adminEmail);
    } else {
      const token = await createSessionToken(authResult.user.id, authResult.user.email, authResult.user.role);
      const verified = await verifySessionToken(token);
      if (verified && verified.role === "admin") {
        console.log(`  ✓ PASS: Admin login successful. Session verified for: ${verified.email} (Role: ${verified.role})`);
        passedTests++;
      } else {
        console.error("  ❌ FAIL: Session token verification failed.");
      }
    }
  }

  // -------------------------------------------------------------
  // TEST 3 & 4: Edit product description/price & confirm persistence
  // -------------------------------------------------------------
  console.log("\n[TEST 3 & 4] Testing product editing and persistence in Supabase...");
  const targetId = "1"; // Oat Jar
  const initial = await getProductById(targetId);

  if (!initial) {
    console.error(`  ❌ FAIL: Target product [${targetId}] not found.`);
  } else {
    const originalPrice = initial.price;
    const testUpdatedPrice = 85;
    const testDescription = initial.description + " [Verified Fresh]";

    console.log(`  Modifying product [${targetId}] from ₹${originalPrice} to ₹${testUpdatedPrice}...`);
    const updated = await updateProduct(targetId, {
      price: testUpdatedPrice,
      description: testDescription,
    });

    if (!updated || updated.price !== testUpdatedPrice) {
      console.error("  ❌ FAIL: updateProduct returned unexpected result:", updated);
    } else {
      // Direct query from Supabase to confirm persistent storage
      const { data: verifiedRow } = await adminClient
        .from("products")
        .select("id, name, price, description")
        .eq("id", targetId)
        .single();

      if (verifiedRow && verifiedRow.price === testUpdatedPrice && verifiedRow.description === testDescription) {
        console.log(`  ✓ PASS [TEST 3]: Change persisted in Supabase database (Price: ₹${verifiedRow.price}).`);
        passedTests++;
        
        // TEST 4: Query via getAllProducts() used by admin dashboard
        const allProducts = await getAllProducts();
        const adminProduct = allProducts.find((p) => p.id === targetId);
        if (adminProduct && adminProduct.price === testUpdatedPrice) {
          console.log(`  ✓ PASS [TEST 4]: Admin catalog query confirms updated price: ₹${adminProduct.price}`);
          passedTests++;
        } else {
          console.error("  ❌ FAIL [TEST 4]: Admin product query did not reflect the update.");
        }
      } else {
        console.error("  ❌ FAIL: Verification query in Supabase did not match updated values.");
      }
    }

    // -------------------------------------------------------------
    // TEST 5: Verify change appears on public menu
    // -------------------------------------------------------------
    console.log("\n[TEST 5] Verifying updated product reflects on public menu query...");
    const availableProducts = await getAvailableProducts();
    const publicProduct = availableProducts.find((p) => p.id === targetId);

    if (publicProduct && publicProduct.price === 85) {
      console.log(`  ✓ PASS: Public menu query reflects the updated product: ${publicProduct.name} (₹${publicProduct.price})`);
      passedTests++;
    } else {
      console.error("  ❌ FAIL: Public menu query did not reflect the updated price:", publicProduct?.price);
    }

    // Restore original values to preserve initial catalog state cleanly
    console.log(`  Restoring product [${targetId}] price back to ₹${originalPrice}...`);
    await updateProduct(targetId, {
      price: originalPrice,
      description: initial.description,
    });
    console.log(`  ✓ Product [${targetId}] cleanly restored to ₹${originalPrice}.`);
  }

  // -------------------------------------------------------------
  // TEST 6: Test product image upload to product-images bucket
  // -------------------------------------------------------------
  console.log("\n[TEST 6] Testing image upload to Supabase Storage 'product-images' bucket...");
  const testFileName = `test-verify-${Date.now()}.png`;
  // Minimal valid 1x1 transparent PNG buffer (68 bytes)
  const png1x1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  const { data: uploadData, error: uploadErr } = await adminClient.storage
    .from("product-images")
    .upload(testFileName, png1x1, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadErr) {
    console.error("  ❌ FAIL: Could not upload test image to product-images bucket:", uploadErr.message);
  } else {
    const { data: urlData } = adminClient.storage
      .from("product-images")
      .getPublicUrl(testFileName);

    console.log(`  ✓ PASS: Image uploaded successfully to 'product-images' bucket.`);
    console.log(`    Public URL: ${urlData?.publicUrl}`);

    // Clean up test image
    await adminClient.storage.from("product-images").remove([testFileName]);
    console.log(`    Cleaned up temporary test image.`);
    passedTests++;
  }

  // -------------------------------------------------------------
  // TEST 7: Confirm unauthorized users cannot create, edit, or delete products
  // -------------------------------------------------------------
  console.log("\n[TEST 7] Testing security isolation (unauthorized product tampering)...");
  
  // 1. Unauthorized INSERT attempt
  const { error: unauthInsertErr } = await anonClient
    .from("products")
    .insert({
      id: "malicious-test-id",
      slug: "malicious-test-slug",
      name: "Malicious Test Item",
      price: 1,
      image: "/images/test.jpg",
      category: "breakfast",
    });

  const insertBlocked = Boolean(unauthInsertErr);

  // 2. Unauthorized UPDATE attempt
  const { error: unauthUpdateErr } = await anonClient
    .from("products")
    .update({ price: 0 })
    .eq("id", "1");

  const updateBlocked = Boolean(unauthUpdateErr);

  // 3. Unauthorized DELETE attempt
  const { error: unauthDeleteErr } = await anonClient
    .from("products")
    .delete()
    .eq("id", "1");

  const deleteBlocked = Boolean(unauthDeleteErr);

  if (insertBlocked && updateBlocked && deleteBlocked) {
    console.log("  ✓ PASS: All unauthorized operations correctly rejected by PostgreSQL RLS.");
    console.log(`    - Unauthorized INSERT: Blocked (${unauthInsertErr?.message})`);
    console.log(`    - Unauthorized UPDATE: Blocked (${unauthUpdateErr?.message})`);
    console.log(`    - Unauthorized DELETE: Blocked (${unauthDeleteErr?.message})`);
    passedTests++;
  } else {
    console.error("  ❌ FAIL: One or more unauthorized operations were not blocked:", {
      insertBlocked,
      updateBlocked,
      deleteBlocked,
    });
  }

  // -------------------------------------------------------------
  // TEST 8: Verify WhatsApp ordering functionality
  // -------------------------------------------------------------
  console.log("\n[TEST 8] Testing WhatsApp ordering URL builder and inquiry logging...");
  const orderUrl = buildProductOrderUrl("Oat Jar", 79);
  const isUrlValid =
    orderUrl.startsWith("https://wa.me/919497716349?text=") &&
    orderUrl.includes("Oat%20Jar") &&
    orderUrl.includes("79");

  if (!isUrlValid) {
    console.error("  ❌ FAIL: Generated WhatsApp URL is invalid:", orderUrl);
  } else {
    console.log("  ✓ Generated WhatsApp URL:", orderUrl);

    // Record an order inquiry and verify it saves to Supabase public.orders
    const testOrderId = `order-test-${Date.now()}`;
    const recordedOrder = await createOrder({
      customerName: "E2E Verification Customer",
      customerPhone: "+91 9497716349",
      productId: "1",
      productName: "Oat Jar",
      quantity: 1,
      unitPrice: 79,
      totalAmount: 79,
      notes: "E2E test inquiry",
      source: "whatsapp",
    });

    if (recordedOrder && recordedOrder.id) {
      // Verify recorded in Supabase
      const { data: orderRow } = await adminClient
        .from("orders")
        .select("id, customer_name, product_name, total_amount, source")
        .eq("id", recordedOrder.id)
        .single();

      if (orderRow && orderRow.customer_name === "E2E Verification Customer") {
        console.log(`  ✓ PASS: WhatsApp order inquiry persisted in Supabase [${orderRow.id}]: ₹${orderRow.total_amount}`);
        passedTests++;
      } else {
        console.error("  ❌ FAIL: Order inquiry was not found in Supabase.");
      }
    } else {
      console.error("  ❌ FAIL: createOrder failed to return created order.");
    }
  }

  console.log("\n=================================================================");
  console.log(`RESULTS: ${passedTests} / ${totalTests} TEST SUITES PASSED`);
  console.log("=================================================================");

  if (passedTests === totalTests) {
    console.log("🎉 ALL FUNCTIONAL AND SECURITY TESTS PASSED!");
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Verification suite crashed:", err);
  process.exit(1);
});
