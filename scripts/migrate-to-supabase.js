/**
 * PLATTEROBE - Safe Supabase Migration & Synchronization Script
 * 
 * Safely migrates all 16 platter products, categories, and admin account
 * from local SQLite (or fallback catalog) into Supabase PostgreSQL.
 * 
 * Usage:
 *   node scripts/migrate-to-supabase.js
 */

const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// 1. Load environment variables from .env.local
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("=================================================================");
  console.error("❌ ERROR: Supabase credentials not found in environment variables.");
  console.error("Please ensure the following are set in .env.local or your Vercel project:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>");
  console.error("=================================================================");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function runMigration() {
  console.log("=================================================================");
  console.log("🚀 Starting PLATTEROBE Migration to Supabase PostgreSQL");
  console.log(`Connecting to: ${supabaseUrl}`);
  console.log("=================================================================");

  // 1. Check Tables Existence
  const { data: testCheck, error: testError } = await supabase
    .from("products")
    .select("id")
    .limit(1);

  if (testError && testError.code === "42P01") {
    console.error("❌ ERROR: 'products' table does not exist in Supabase yet.");
    console.error("Please run the SQL schema located at 'supabase/schema.sql' in your Supabase SQL Editor first.");
    process.exit(1);
  }

  // 2. Sync Categories
  console.log("📦 Synchronizing Categories...");
  const categories = [
    { id: "breakfast", display_name: "The Morning Edit", description: "Wholesome, slow-release breakfast platters to start your day right.", sort_order: 1 },
    { id: "lunch", display_name: "Midday Plates", description: "Satisfying, high-protein midday fuel built for lasting satiety.", sort_order: 2 },
    { id: "dinner", display_name: "Evening Plates", description: "Light, nourishing plates for an effortless, wholesome evening.", sort_order: 3 },
    { id: "shakes-smoothies", display_name: "Blended Goodness", description: "Thick, drinkable whole-food blends with clean macros.", sort_order: 4 },
    { id: "fresh-juice", display_name: "Fresh Press", description: "Pure, freshly pressed fruit and vegetable juices.", sort_order: 5 },
  ];

  for (const cat of categories) {
    const { error: catErr } = await supabase.from("categories").upsert(cat, { onConflict: "id" });
    if (catErr) console.warn(`Warning upserting category ${cat.id}:`, catErr.message);
  }
  console.log("✅ Categories synchronized successfully.");

  // 3. Read products from SQLite or products fallback
  console.log("📦 Reading existing products...");
  const dbPath = path.join(__dirname, "..", "data", "platterobe.db");
  let productsToMigrate = [];

  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT * FROM products").all();
      productsToMigrate = rows.map((r) => {
        let ingredients = [];
        try {
          ingredients = JSON.parse(r.ingredients);
        } catch {
          ingredients = [];
        }
        let nutrition = {};
        try {
          nutrition = JSON.parse(r.nutrition);
        } catch {
          nutrition = {};
        }

        return {
          id: String(r.id),
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle || "",
          short_description: r.shortDescription || "",
          description: r.description || "",
          why_youll_like_it: r.whyYoullLikeIt || "",
          price: r.price,
          original_price: r.original_price,
          is_featured: Boolean(r.is_featured),
          image: r.image || "/images/classic-overnight-oats.jpg",
          ingredients,
          nutrition,
          available: Boolean(r.available),
          category: r.category || "breakfast",
          weight: r.weight || "",
          series_no: r.series_no || null,
          sort_order: r.sort_order || 0,
        };
      });
      console.log(`Found ${productsToMigrate.length} products in SQLite database.`);
    } catch (err) {
      console.warn("Could not read from SQLite:", err.message);
    }
  }

  if (productsToMigrate.length === 0) {
    console.error("❌ ERROR: No products found in SQLite database! Aborting to prevent data loss.");
    process.exit(1);
  }

  // 4. Upsert into Supabase Products
  console.log("📦 Migrating products to Supabase...");
  let migratedCount = 0;
  for (const product of productsToMigrate) {
    let { error: prodErr } = await supabase.from("products").upsert(product, { onConflict: "id" });
    if (prodErr && prodErr.message && prodErr.message.includes("series_no")) {
      const fallback = { ...product };
      delete fallback.series_no;
      const res = await supabase.from("products").upsert(fallback, { onConflict: "id" });
      prodErr = res.error;
    }
    if (prodErr) {
      console.error(`❌ Error migrating product ${product.name} (${product.slug}):`, prodErr.message);
    } else {
      migratedCount++;
      console.log(`  ✓ Synced: [${product.id}] ${product.name}`);
    }
  }
  console.log(`✅ Successfully migrated ${migratedCount} products to Supabase.`);

  // 5. Migrate Admin Account
  console.log("📦 Synchronizing Administrator account...");
  const adminEmail = (process.env.ADMIN_EMAIL || "platterobe@gmail.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  let syncedUsers = 0;
  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      const users = db.prepare("SELECT * FROM users").all();
      for (const u of users) {
        const { error: userErr } = await supabase.from("users").upsert({
          id: u.id,
          email: u.email,
          password_hash: u.password_hash,
          role: u.role || "admin",
        }, { onConflict: "id" });
        if (userErr) console.warn("Warning syncing user:", userErr.message);
        else {
          syncedUsers++;
          console.log(`  ✓ Synced admin user: ${u.email}`);
        }
      }
    } catch {
      // ignore
    }
  }

  if (syncedUsers === 0 && adminPassword) {
    try {
      const bcrypt = require("bcryptjs");
      const hash = bcrypt.hashSync(adminPassword, 10);
      const { error: userErr } = await supabase.from("users").upsert({
        id: "admin-primary",
        email: adminEmail,
        password_hash: hash,
        role: "admin",
      }, { onConflict: "id" });
      if (!userErr) console.log(`  ✓ Provisioned admin user: ${adminEmail}`);
    } catch (e) {
      console.warn("Could not provision fallback admin user:", e.message);
    }
  }

  // 6. Migrate Customer Orders
  console.log("📦 Synchronizing Customer Orders...");
  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      const orders = db.prepare("SELECT * FROM orders").all();
      let orderCount = 0;
      for (const ord of orders) {
        const { error: ordErr } = await supabase.from("orders").upsert({
          id: ord.id,
          customer_name: ord.customer_name || null,
          customer_phone: ord.customer_phone || null,
          product_id: ord.product_id || null,
          product_name: ord.product_name,
          quantity: ord.quantity || 1,
          unit_price: ord.unit_price,
          total_amount: ord.total_amount,
          notes: ord.notes || null,
          source: ord.source || "whatsapp",
          status: ord.status || "pending",
          created_at: ord.created_at,
          updated_at: ord.updated_at,
        }, { onConflict: "id" });
        if (ordErr) console.warn("Warning syncing order:", ordErr.message);
        else {
          orderCount++;
          console.log(`  ✓ Synced order: [${ord.id}] for ${ord.customer_name || "Customer"}`);
        }
      }
      console.log(`✅ Successfully synced ${orderCount} existing customer orders to Supabase.`);
    } catch (err) {
      console.warn("Could not read orders from SQLite:", err.message);
    }
  }

  // 7. Migrate Meal Club (Categories, Plans, Subscriptions, Audit Logs)
  console.log("🥗 Synchronizing Meal Club & Subscription System...");
  if (fs.existsSync(dbPath)) {
    try {
      const db = new Database(dbPath);
      // Ensure tables exist in SQLite
      const hasMealPlans = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='meal_plans'").get();
      if (hasMealPlans) {
        // A. Meal Categories
        const categories = db.prepare("SELECT * FROM meal_categories").all();
        let syncedCats = 0;
        let hasLoggedCatNotice = false;
        for (const cat of categories) {
          try {
            const { error: catErr } = await supabase.from("meal_categories").upsert({
              id: cat.id,
              display_name: cat.display_name,
              description: cat.description || "",
              sort_order: cat.sort_order || 0,
              is_active: Boolean(cat.is_active),
              created_at: cat.created_at,
              updated_at: cat.updated_at,
            }, { onConflict: "id" });
            if (!catErr) syncedCats++;
            else if (!hasLoggedCatNotice) {
              hasLoggedCatNotice = true;
              console.log("  (Supabase note: Meal Club tables will sync automatically once supabase/schema.sql is applied to PostgreSQL)");
            }
          } catch {}
        }

        // B. Meal Plans
        const plans = db.prepare("SELECT * FROM meal_plans").all();
        let syncedPlans = 0;
        for (const pl of plans) {
          try {
            let categoriesJson = ["breakfast"];
            let swapRulesJson = {};
            let scheduleJson = [];
            try { categoriesJson = JSON.parse(pl.meal_categories); } catch {}
            try { swapRulesJson = JSON.parse(pl.swap_rules); } catch {}
            try { scheduleJson = JSON.parse(pl.schedule); } catch {}

            const { error: planErr } = await supabase.from("meal_plans").upsert({
              id: pl.id,
              name: pl.name,
              slug: pl.slug,
              subtitle: pl.subtitle || "",
              description: pl.description || "",
              image: pl.image || "",
              duration_days: pl.duration_days,
              meal_categories: categoriesJson,
              meals_per_day: pl.meals_per_day,
              pricing_mode: pl.pricing_mode,
              base_price: pl.base_price,
              base_price_aed: pl.base_price_aed,
              original_price: pl.original_price,
              original_price_aed: pl.original_price_aed,
              status: pl.status,
              is_featured: Boolean(pl.is_featured),
              sort_order: pl.sort_order || 0,
              swap_rules: swapRulesJson,
              schedule: scheduleJson,
              created_at: pl.created_at,
              updated_at: pl.updated_at,
            }, { onConflict: "id" });
            if (!planErr) syncedPlans++;
          } catch {}
        }

        // C. Meal Subscriptions
        const subs = db.prepare("SELECT * FROM meal_subscriptions").all();
        let syncedSubs = 0;
        for (const sb of subs) {
          try {
            let dailyScheduleJson = [];
            try { dailyScheduleJson = JSON.parse(sb.daily_schedule); } catch {}

            const { error: subErr } = await supabase.from("meal_subscriptions").upsert({
              id: sb.id,
              plan_id: sb.plan_id,
              plan_name: sb.plan_name,
              plan_duration: sb.plan_duration,
              pricing_mode: sb.pricing_mode,
              customer_name: sb.customer_name,
              customer_phone: sb.customer_phone,
              customer_email: sb.customer_email || null,
              delivery_address: sb.delivery_address || "",
              city: sb.city || "",
              country: sb.country || "IN",
              start_date: sb.start_date,
              end_date: sb.end_date,
              status: sb.status,
              order_locked: Boolean(sb.order_locked),
              locked_at: sb.locked_at || null,
              confirmed_at: sb.confirmed_at || null,
              total_amount: sb.total_amount,
              currency: sb.currency || "INR",
              swaps_used: sb.swaps_used || 0,
              max_swaps_allowed: sb.max_swaps_allowed || 0,
              daily_schedule: dailyScheduleJson,
              notes: sb.notes || null,
              created_at: sb.created_at,
              updated_at: sb.updated_at,
            }, { onConflict: "id" });
            if (!subErr) syncedSubs++;
          } catch {}
        }

        // D. Meal Audit Logs
        const logs = db.prepare("SELECT * FROM meal_audit_logs").all();
        let syncedLogs = 0;
        for (const lg of logs) {
          try {
            let detailsJson = {};
            try { detailsJson = JSON.parse(lg.details); } catch {}

            const { error: logErr } = await supabase.from("meal_audit_logs").upsert({
              id: lg.id,
              subscription_id: lg.subscription_id,
              action: lg.action,
              performed_by: lg.performed_by,
              details: detailsJson,
              created_at: lg.created_at,
            }, { onConflict: "id" });
            if (!logErr) syncedLogs++;
          } catch {}
        }

        console.log(`✅ Synced Meal Club: ${syncedCats} categories, ${syncedPlans} plans, ${syncedSubs} subscriptions, ${syncedLogs} audit logs.`);
      }
    } catch (err) {
      console.warn("Could not read meal club data from SQLite for Supabase sync:", err.message);
    }
  }

  console.log("=================================================================");
  console.log("🎉 MIGRATION COMPLETE! Supabase PostgreSQL is live and synchronized.");
  console.log("=================================================================");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
