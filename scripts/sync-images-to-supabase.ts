/**
 * PLATTEROBE - Product Image Cloud Synchronization
 * 
 * Uploads all 16 product images from local public/images to the 
 * Supabase Storage 'product-images' bucket, verifies their public URLs,
 * and updates Supabase PostgreSQL and local SQLite with persistent URLs.
 */

import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Product to Image File Mapping based on official PLATTEROBE food photography catalog
const PRODUCT_IMAGE_MAP: Record<string, string> = {
  "1": "classic-overnight-oats.jpg",   // Oat Jar
  "2": "fruit-overnight-oats.jpg",     // Fruit Oat Jar
  "3": "classic-overnight-oats.jpg",   // Nutty Oat Jar
  "4": "chia-banana-pudding.jpg",      // Banana Parfait
  "5": "fruit-overnight-oats.jpg",     // Fruit Parfait
  "6": "chia-banana-pudding.jpg",      // Apple Parfait
  "7": "chia-banana-pudding.jpg",      // Chia Cloud
  "8": "chia-banana-pudding.jpg",      // Nutty Chia Cloud
  "9": "fruit-overnight-oats.jpg",     // Fruit Chia Cloud
  "10": "egg-pb-toast.jpg",            // Protein Toast
  "11": "banana-egg.jpg",              // Banana Toast
  "12": "pb-banana-sandwich.jpg",       // Peanut Stack
  "13": "banana-egg.jpg",              // Power Duo
  "14": "pancake.jpg",                 // Oat Cakes
  "15": "banana-oats-smoothie.jpg",     // Banana Blend
  "16": "abc-glow.jpg",                // ABC Glow
};

async function syncImages() {
  console.log("=================================================================");
  console.log("🚀 Syncing PLATTEROBE Product Images to Supabase Storage");
  console.log(`Bucket: ${bucketName}`);
  console.log(`Project: ${supabaseUrl}`);
  console.log("=================================================================");

  // 1. Upload all unique image files to Supabase Storage
  const uniqueFiles = Array.from(new Set(Object.values(PRODUCT_IMAGE_MAP)));
  const uploadedUrls: Record<string, string> = {};

  for (const filename of uniqueFiles) {
    const localFilePath = path.join(__dirname, "..", "public", "images", filename);
    if (!fs.existsSync(localFilePath)) {
      console.error(`❌ Local file not found: ${localFilePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(localFilePath);
    const mimeType = filename.endsWith(".png") ? "image/png" : "image/jpeg";

    console.log(`Uploading ${filename} (${Math.round(fileBuffer.length / 1024)} KB)...`);
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filename, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`❌ Upload failed for ${filename}:`, uploadError.message);
      continue;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      console.error(`❌ Could not get public URL for ${filename}`);
      continue;
    }

    // Verify accessible via HTTP
    try {
      const res = await fetch(publicUrl);
      if (res.status === 200) {
        console.log(`  ✓ Verified HTTP 200: ${publicUrl}`);
        uploadedUrls[filename] = publicUrl;
      } else {
        console.error(`  ❌ HTTP check returned status ${res.status} for ${publicUrl}`);
      }
    } catch (e: any) {
      console.error(`  ❌ Network check failed for ${publicUrl}:`, e.message);
    }
  }

  // 2. Update Supabase PostgreSQL products table
  console.log("\n📦 Updating Supabase PostgreSQL product image URLs...");
  const { data: currentProducts, error: prodErr } = await supabase
    .from("products")
    .select("id, name, slug, image")
    .order("id");

  if (prodErr || !currentProducts) {
    console.error("Could not fetch current products:", prodErr?.message);
    process.exit(1);
  }

  const results: Array<{
    id: string;
    name: string;
    filename: string;
    publicUrl: string;
    status: string;
  }> = [];

  const dbPath = path.join(__dirname, "..", "data", "platterobe.db");
  const sqlite = fs.existsSync(dbPath) ? new Database(dbPath) : null;

  for (const p of currentProducts) {
    const targetFile = PRODUCT_IMAGE_MAP[p.id];
    if (!targetFile || !uploadedUrls[targetFile]) {
      console.warn(`⚠️ No uploaded URL found for product [${p.id}] ${p.name}`);
      results.push({
        id: p.id,
        name: p.name,
        filename: targetFile || "unknown",
        publicUrl: p.image,
        status: "FAILED_MISSING_UPLOAD",
      });
      continue;
    }

    const newUrl = uploadedUrls[targetFile];

    // Update Supabase
    const { error: updateErr } = await supabase
      .from("products")
      .update({ image: newUrl, updated_at: new Date().toISOString() })
      .eq("id", p.id);

    if (updateErr) {
      console.error(`❌ Failed to update product [${p.id}] ${p.name}:`, updateErr.message);
      results.push({
        id: p.id,
        name: p.name,
        filename: targetFile,
        publicUrl: newUrl,
        status: `UPDATE_ERROR: ${updateErr.message}`,
      });
    } else {
      console.log(`  ✓ Updated product [${p.id}] ${p.name} -> ${newUrl}`);
      results.push({
        id: p.id,
        name: p.name,
        filename: targetFile,
        publicUrl: newUrl,
        status: "VERIFIED_200",
      });

      // Update SQLite mirror
      if (sqlite) {
        try {
          sqlite.prepare("UPDATE products SET image = ?, updated_at = datetime('now') WHERE id = ?").run(newUrl, p.id);
        } catch (e) {
          // ignore
        }
      }
    }
  }

  console.log("\n=================================================================");
  console.log("FINAL PRODUCT IMAGE REPORT (ALL 16 PRODUCTS)");
  console.log("=================================================================");
  console.table(results);
}

syncImages().catch((err) => {
  console.error("Sync script crashed:", err);
  process.exit(1);
});
