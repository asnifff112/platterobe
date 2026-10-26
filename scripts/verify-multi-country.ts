import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const idx = t.indexOf("=");
      if (idx !== -1) process.env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    }
  }
} catch (e) {
  // ignore
}

import {
  formatPrice,
  getCountryPrice,
  getCountryOriginalPrice,
  isProductVisibleInCountry,
  isProductAvailableInCountry,
  getCountryConfig,
  SUPPORTED_COUNTRIES,
} from "../src/lib/country";
import { buildProductOrderUrl } from "../src/lib/whatsapp";
import { getAvailableProducts, getAllProducts } from "../src/lib/db";
import type { Product } from "../src/data/products";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${msg}`);
}

async function runTests() {
  console.log("\n========================================================");
  console.log("PLATTEROBE — MULTI-COUNTRY INDIA & UAE VERIFICATION SUITE");
  console.log("========================================================\n");

  // 1. Country Config & Options
  console.log("--- TEST 1: Country Configuration & Currencies ---");
  assert(SUPPORTED_COUNTRIES.length === 2, "SUPPORTED_COUNTRIES contains India and UAE");
  const indiaConfig = getCountryConfig("IN");
  const uaeConfig = getCountryConfig("AE");
  assert(indiaConfig.currency === "INR" && indiaConfig.currencySymbol === "₹", "India is INR (₹)");
  assert(uaeConfig.currency === "AED" && uaeConfig.currencySymbol === "AED", "UAE is AED (AED)");

  // 2. formatPrice formatting
  console.log("\n--- TEST 2: Price Formatting ---");
  assert(formatPrice(79, "IN") === "₹79", "INR 79 formats to ₹79");
  assert(formatPrice(12, "AE") === "AED 12.00", "AED 12 formats to AED 12.00");
  assert(formatPrice(12.5, "AE") === "AED 12.50", "AED 12.5 formats to AED 12.50");
  assert(formatPrice(null, "IN") === "Price on request", "null price returns 'Price on request'");

  // 3. Product Country-Aware Logic
  console.log("\n--- TEST 3: Product Country Visibility & Availability ---");
  const sampleProduct: Product = {
    id: "test-item-1",
    name: "Classic Overnight Oats",
    slug: "classic-overnight-oats",
    seriesNo: "PROBE-001",
    category: "breakfast",
    subtitle: "Fuel your morning",
    shortDescription: "Creamy overnight oats",
    description: "Full description",
    whyYoullLikeIt: "High protein",
    image: "/oats.jpg",
    price: 79,
    originalPrice: 99,
    priceAed: 12,
    originalPriceAed: 15,
    available: true,
    availableInIndia: true,
    availableInUae: false, // Not yet live in UAE
    publishedInIndia: "published",
    publishedInUae: "draft", // Safe draft mode
    weight: "300g",
    nutrition: {
      calories: 350,
      protein: "14g",
      carbs: "52g",
      fat: "9g",
      fiber: "7g",
    },
    ingredients: [
      { name: "Rolled Oats", quantity: "60", unit: "g" },
      { name: "Chia Seeds", quantity: "15", unit: "g" },
    ],
  };

  assert(getCountryPrice(sampleProduct, "IN") === 79, "India gets INR price 79");
  assert(getCountryPrice(sampleProduct, "AE") === 12, "UAE gets AED price 12");
  assert(getCountryOriginalPrice(sampleProduct, "IN") === 99, "India original price 99");
  assert(getCountryOriginalPrice(sampleProduct, "AE") === 15, "UAE original price 15");

  assert(isProductVisibleInCountry(sampleProduct, "IN") === true, "Visible in India");
  assert(isProductVisibleInCountry(sampleProduct, "AE") === false, "Not visible in UAE (Draft mode)");
  assert(isProductAvailableInCountry(sampleProduct, "IN") === true, "Available in India");
  assert(isProductAvailableInCountry(sampleProduct, "AE") === false, "Not available in UAE");

  // When published in UAE
  const uaeLiveProduct: Product = {
    ...sampleProduct,
    availableInUae: true,
    publishedInUae: "published",
  };
  assert(isProductVisibleInCountry(uaeLiveProduct, "AE") === true, "Visible in UAE once published");
  assert(isProductAvailableInCountry(uaeLiveProduct, "AE") === true, "Available in UAE once published");

  // 4. WhatsApp Ordering Flow
  console.log("\n--- TEST 4: WhatsApp Message & Phone Number Preservation ---");
  const indiaOrderUrl = buildProductOrderUrl(sampleProduct.name, sampleProduct.price, "IN", "₹79");
  const uaeOrderUrl = buildProductOrderUrl(uaeLiveProduct.name, uaeLiveProduct.priceAed ?? null, "AE", "AED 12");

  assert(indiaOrderUrl.startsWith("https://wa.me/919497716349"), "India order URL preserves exact phone number 919497716349");
  assert(uaeOrderUrl.startsWith("https://wa.me/919497716349"), "UAE order URL preserves exact phone number 919497716349");

  const indiaDecoded = decodeURIComponent(indiaOrderUrl);
  const uaeDecoded = decodeURIComponent(uaeOrderUrl);

  assert(indiaDecoded.includes("Country: India"), "India order text includes 'Country: India'");
  assert(indiaDecoded.includes("Price: ₹79"), "India order text includes 'Price: ₹79'");
  assert(uaeDecoded.includes("Country: UAE") || uaeDecoded.includes("Country: United Arab Emirates"), "UAE order text includes Country UAE");
  assert(uaeDecoded.includes("Price: AED 12"), "UAE order text includes 'Price: AED 12'");

  // 5. Database Multi-Country Queries
  console.log("\n--- TEST 5: Database Country Filtering ---");
  const allProducts = await getAllProducts();
  console.log(`Total catalog products loaded: ${allProducts.length}`);
  assert(allProducts.length > 0, "Catalog contains existing products");

  const indiaProducts = await getAvailableProducts("IN");
  console.log(`India visible/available products: ${indiaProducts.length}`);
  assert(indiaProducts.length > 0, "Existing Indian products remain active and visible");

  const uaeProducts = await getAvailableProducts("AE");
  console.log(`UAE live products: ${uaeProducts.length}`);
  console.log(`UAE starts safe with ${uaeProducts.length} live products.`);

  console.log("\n========================================================");
  console.log("🎉 ALL MULTI-COUNTRY UNIT & INTEGRATION TESTS PASSED!");
  console.log("========================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
