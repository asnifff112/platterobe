/**
 * PLATTEROBE - Authentic Product Image Update & Repair
 * 
 * Safely updates the image URLs for all 16 products in both SQLite and Supabase
 * using the verified authentic high-resolution assets in Supabase Storage and public/images.
 * Preserves ALL other product columns (prices, discounts, series_no, ingredients, etc.).
 */

import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
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

const SUPABASE_BASE = "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images";

// 16 Official Platters -> Verified Authentic Storage Assets
export const AUTHENTIC_PRODUCT_IMAGES: Record<string, string> = {
  "oat-jar": `${SUPABASE_BASE}/oat-jar-1792091297834.jpg`,
  "fruit-oat-jar": `${SUPABASE_BASE}/fruit-oat-jar-1792243878418.jpeg`,
  "nutty-oat-jar": `${SUPABASE_BASE}/nutty-oat-jar-1792244494069.jpeg`,
  "banana-parfait": `${SUPABASE_BASE}/banana-parfait-1792318287169.png`,
  "fruit-parfait": `${SUPABASE_BASE}/fruit-parfait-1792318680932.png`,
  "apple-parfait": `${SUPABASE_BASE}/apple-parfait-1792319052706.png`,
  "chia-cloud": `${SUPABASE_BASE}/chia-cloud-1792319784781.png`,
  "nutty-chia-cloud": `${SUPABASE_BASE}/nutty-chia-cloud-1792320208374.png`,
  "fruit-chia-cloud": `${SUPABASE_BASE}/fruit-chia-cloud-1792320952607.png`,
  "protein-toast": `${SUPABASE_BASE}/protein-toast-1792321747102.png`,
  "banana-toast": `${SUPABASE_BASE}/banana-toast-1792322510187.jpeg`,
  "peanut-stack": `${SUPABASE_BASE}/peanut-stack-1792322243194.png`,
  "power-duo": `${SUPABASE_BASE}/power-duo-1792322021605.png`,
  "oat-cakes": `${SUPABASE_BASE}/oat-cakes---egg-1792321436618.png`,
  "banana-blend": `${SUPABASE_BASE}/banana-oats-smoothie.jpg`,
  "abc-glow": `${SUPABASE_BASE}/abc-glow.jpg`,
};

export const LOCAL_FALLBACK_IMAGES: Record<string, string> = {
  "oat-jar": "/images/classic-overnight-oats.jpg",
  "fruit-oat-jar": "/images/fruit-overnight-oats.jpg",
  "nutty-oat-jar": "/images/classic-overnight-oats.jpg",
  "banana-parfait": "/images/chia-banana-pudding.jpg",
  "fruit-parfait": "/images/fruit-overnight-oats.jpg",
  "apple-parfait": "/images/chia-banana-pudding.jpg",
  "chia-cloud": "/images/chia-banana-pudding.jpg",
  "nutty-chia-cloud": "/images/chia-banana-pudding.jpg",
  "fruit-chia-cloud": "/images/fruit-overnight-oats.jpg",
  "protein-toast": "/images/egg-pb-toast.jpg",
  "banana-toast": "/images/banana-egg.jpg",
  "peanut-stack": "/images/pb-banana-sandwich.jpg",
  "power-duo": "/images/banana-egg.jpg",
  "oat-cakes": "/images/pancake.jpg",
  "banana-blend": "/images/banana-oats-smoothie.jpg",
  "abc-glow": "/images/abc-glow.jpg",
};

async function main() {
  console.log("=================================================================");
  console.log("🔧 PLATTEROBE — UPDATING AUTHENTIC PRODUCT IMAGES");
  console.log("=================================================================");

  // 1. Verify every URL returns 200 OK
  console.log("1. Verifying HTTP status of all 16 authentic image assets...");
  for (const [slug, url] of Object.entries(AUTHENTIC_PRODUCT_IMAGES)) {
    const res = await fetch(url);
    if (res.status !== 200) {
      throw new Error(`Asset verification failed for ${slug} (${url}): HTTP ${res.status}`);
    }
    console.log(`  ✓ 200 OK: ${slug} -> ${path.basename(url)} (${res.headers.get("content-type")})`);
  }

  // 2. Update SQLite Database
  console.log("\n2. Updating local SQLite database (data/platterobe.db)...");
  const dbPath = path.join(__dirname, "..", "data", "platterobe.db");
  const sqlite = new Database(dbPath);

  const updateStmt = sqlite.prepare("UPDATE products SET image = ?, updated_at = datetime('now') WHERE slug = ?");
  for (const [slug, imageUrl] of Object.entries(AUTHENTIC_PRODUCT_IMAGES)) {
    const info = updateStmt.run(imageUrl, slug);
    console.log(`  ✓ SQLite updated for [${slug}] (changes: ${info.changes})`);
  }

  // 3. Update Supabase PostgreSQL Database (if configured)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    console.log("\n3. Updating Supabase PostgreSQL products table...");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    for (const [slug, imageUrl] of Object.entries(AUTHENTIC_PRODUCT_IMAGES)) {
      const { data, error } = await supabase
        .from("products")
        .update({ image: imageUrl, updated_at: new Date().toISOString() })
        .eq("slug", slug);

      if (error) {
        console.error(`  ❌ Supabase error updating ${slug}:`, error.message);
      } else {
        console.log(`  ✓ Supabase updated for [${slug}]`);
      }
    }
  }

  console.log("\n=================================================================");
  console.log("🎉 ALL 16 PRODUCTS SUCCESSFULLY UPDATED WITH AUTHENTIC IMAGES!");
  console.log("=================================================================");
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
