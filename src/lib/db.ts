import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { Product, products as initialProducts, Ingredient } from "@/data/products";
import { normalizeCategoryKey } from "@/data/categories";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeSeriesNo } from "@/lib/series";

const DB_DIR = path.join(process.cwd(), "data");
const SOURCE_DB_PATH = path.join(DB_DIR, "platterobe.db");

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
let activeDbPath = SOURCE_DB_PATH;

if (isServerless) {
  try {
    const tmpDbPath = path.join("/tmp", "platterobe.db");
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(SOURCE_DB_PATH)) {
      fs.copyFileSync(SOURCE_DB_PATH, tmpDbPath);
    }
    if (fs.existsSync(tmpDbPath)) {
      activeDbPath = tmpDbPath;
    }
  } catch (err) {
    console.warn("Could not copy database to /tmp, falling back to source path:", err);
  }
}

// Safely ensure directories exist without throwing on read-only filesystems
try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
} catch {
  // Ignored on read-only filesystem
}

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch {
  // Ignored on read-only filesystem
}

declare global {
  // eslint-disable-next-line no-var
  var __platterobeDb: Database.Database | undefined;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  customerName?: string;
  customerPhone?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice?: number | null;
  totalAmount?: number | null;
  notes?: string;
  source: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: string;
}

export function getDatabase(): Database.Database {
  if (!global.__platterobeDb) {
    const db = new Database(activeDbPath);
    try {
      db.pragma("journal_mode = WAL");
    } catch {
      // WAL mode may not be supported on read-only sources
    }
    try {
      db.pragma("foreign_keys = ON");
    } catch {
      // Ignore
    }

    try {
      // Initialize Schema for Products
      db.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          subtitle TEXT NOT NULL DEFAULT '',
          shortDescription TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          whyYoullLikeIt TEXT NOT NULL DEFAULT '',
          price REAL,
          original_price REAL,
          is_featured INTEGER NOT NULL DEFAULT 0,
          image TEXT NOT NULL,
          ingredients TEXT NOT NULL, -- JSON string
          nutrition TEXT NOT NULL,   -- JSON string
          available INTEGER NOT NULL DEFAULT 1,
          category TEXT NOT NULL DEFAULT 'breakfast',
          sort_order INTEGER NOT NULL DEFAULT 0,
          weight TEXT DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // Dynamic backward-compatible column migrations for existing databases
      const tableInfo = db.prepare("PRAGMA table_info(products)").all() as Array<{ name: string }>;
      const colNames = tableInfo.map((c) => c.name);

      if (!colNames.includes("original_price")) {
        db.exec("ALTER TABLE products ADD COLUMN original_price REAL;");
      }
      if (!colNames.includes("weight")) {
        db.exec("ALTER TABLE products ADD COLUMN weight TEXT DEFAULT '';");
      }
      if (!colNames.includes("is_featured")) {
        db.exec("ALTER TABLE products ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;");
      }
      if (!colNames.includes("series_no")) {
        db.exec("ALTER TABLE products ADD COLUMN series_no TEXT;");
      }
      try {
        db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_series_no ON products (UPPER(TRIM(series_no))) WHERE series_no IS NOT NULL AND TRIM(series_no) <> '';");
      } catch {
        // ignore if index already exists
      }
      if (!colNames.includes("updated_at")) {
        db.exec("ALTER TABLE products ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));");
      }
      if (!colNames.includes("created_at")) {
        db.exec("ALTER TABLE products ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));");
      }

      // Initialize Schema for Users / Administrators
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // Initialize Schema for Orders
      db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          customer_name TEXT,
          customer_phone TEXT,
          product_id TEXT,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price REAL,
          total_amount REAL,
          notes TEXT,
          source TEXT NOT NULL DEFAULT 'whatsapp',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // Seed products if empty
      const countRow = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
      if (countRow.count === 0) {
        const insert = db.prepare(`
          INSERT INTO products (
            id, slug, name, subtitle, shortDescription, description, whyYoullLikeIt,
            price, original_price, is_featured, image, ingredients, nutrition, available, category, sort_order, weight
          ) VALUES (
            @id, @slug, @name, @subtitle, @shortDescription, @description, @whyYoullLikeIt,
            @price, @original_price, @is_featured, @image, @ingredients, @nutrition, @available, @category, @sort_order, @weight
          )
        `);

        const insertMany = db.transaction((items: Product[]) => {
          let order = 0;
          for (const item of items) {
            insert.run({
              id: item.id,
              slug: item.slug,
              name: item.name,
              subtitle: item.subtitle || "",
              shortDescription: item.shortDescription || "",
              description: item.description || "",
              whyYoullLikeIt: item.whyYoullLikeIt || "",
              price: item.price ?? null,
              original_price: item.originalPrice ?? null,
              is_featured: item.isFeatured ? 1 : 0,
              image: item.image || "/images/classic-overnight-oats.jpg",
              ingredients: JSON.stringify(item.ingredients || []),
              nutrition: JSON.stringify(item.nutrition || {}),
              available: item.available ? 1 : 0,
              category: normalizeCategoryKey(item.category || "breakfast"),
              sort_order: order++,
              weight: item.weight || "",
            });
          }
        });

        insertMany(initialProducts);
      }

      // Provision primary admin account idempotently if not present
      const adminEmail = (process.env.ADMIN_EMAIL || "platterobe@gmail.com").trim().toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD || "";
      const existingAdmin = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(adminEmail) as User | undefined;
      if (!existingAdmin && adminPassword) {
        const hash = bcrypt.hashSync(adminPassword, 10);
        db.prepare(`
          INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
          VALUES ('admin-primary', ?, ?, 'admin', datetime('now'), datetime('now'))
        `).run(adminEmail, hash);
      }
    } catch (schemaErr) {
      console.warn("Database schema initialization skipped (possibly read-only):", schemaErr);
    }

    global.__platterobeDb = db;
  }

  return global.__platterobeDb;
}

// ----------------------------------------------------------
// Row Mappers
// ----------------------------------------------------------

interface ProductRow {
  id: string;
  slug: string;
  series_no?: string | null;
  seriesNo?: string | null;
  name: string;
  subtitle: string;
  shortDescription?: string;
  short_description?: string;
  description: string;
  whyYoullLikeIt?: string;
  why_youll_like_it?: string;
  price: number | null;
  original_price: number | null;
  is_featured: number | boolean;
  image: string;
  ingredients: string | Ingredient[];
  nutrition: string | Record<string, unknown>;
  available: number | boolean;
  category: string;
  sort_order: number;
  weight?: string;
  created_at: string;
  updated_at: string;
}

function mapRowToProduct(row: ProductRow): Product {
  let ingredients: Ingredient[] = [];
  if (Array.isArray(row.ingredients)) {
    ingredients = row.ingredients;
  } else if (typeof row.ingredients === "string") {
    try {
      ingredients = JSON.parse(row.ingredients);
    } catch {
      ingredients = [];
    }
  }

  let nutrition = {
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
  };
  if (row.nutrition && typeof row.nutrition === "object") {
    nutrition = { ...nutrition, ...(row.nutrition as typeof nutrition) };
  } else if (typeof row.nutrition === "string") {
    try {
      nutrition = { ...nutrition, ...JSON.parse(row.nutrition) };
    } catch {
      // default
    }
  }

  const rawSeries = row.series_no || row.seriesNo;
  const seriesNo = rawSeries && rawSeries.trim().length > 0 ? normalizeSeriesNo(rawSeries) : null;

  return {
    id: String(row.id),
    slug: String(row.slug),
    seriesNo: seriesNo || null,
    name: String(row.name),
    subtitle: row.subtitle || "",
    shortDescription: row.short_description || row.shortDescription || "",
    description: row.description || "",
    whyYoullLikeIt: row.why_youll_like_it || row.whyYoullLikeIt || "",
    price: row.price !== null && row.price !== undefined ? Number(row.price) : null,
    originalPrice: row.original_price !== null && row.original_price !== undefined ? Number(row.original_price) : null,
    isFeatured: Boolean(row.is_featured),
    image: row.image || "",
    ingredients,
    nutrition,
    available: Boolean(row.available),
    category: normalizeCategoryKey(row.category),
    weight: row.weight || null,
    sortOrder: row.sort_order ?? 0,
    updatedAt: row.updated_at,
  };
}

// ----------------------------------------------------------
// Products Database API (Dual Engine: Supabase PostgreSQL + SQLite)
// ----------------------------------------------------------

export async function getAllProducts(): Promise<Product[]> {
  // 1. Supabase PostgreSQL is the authoritative source when configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (!error && data) {
          // Supabase is authoritative — return its result even if empty
          return data.map(mapRowToProduct);
        }
        if (error) {
          console.warn("Supabase query error in getAllProducts; using fallback:", error.message);
        }
      }
    } catch (supabaseErr) {
      console.warn("Supabase exception in getAllProducts:", supabaseErr);
    }
  }

  // 2. Fallback to Local SQLite (only when Supabase is unavailable or errored)
  try {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM products ORDER BY sort_order ASC, created_at ASC").all() as ProductRow[];
    return rows.map(mapRowToProduct);
  } catch (err) {
    console.error("Error fetching all products from SQLite database:", err);
    return initialProducts;
  }
}

export async function getAvailableProducts(): Promise<Product[]> {
  // 1. Supabase PostgreSQL is the authoritative source when configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("available", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (!error && data) {
          // Supabase is authoritative — return its result even if empty
          return data.map(mapRowToProduct);
        }
        if (error) {
          console.warn("Supabase query error in getAvailableProducts; using fallback:", error.message);
        }
      }
    } catch (supabaseErr) {
      console.warn("Supabase exception in getAvailableProducts:", supabaseErr);
    }
  }

  // 2. Fallback to Local SQLite (only when Supabase is unavailable or errored)
  try {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM products WHERE available = 1 ORDER BY sort_order ASC, created_at ASC").all() as ProductRow[];
    return rows.map(mapRowToProduct);
  } catch (err) {
    console.error("Error fetching available products from SQLite database:", err);
    return initialProducts.filter((p) => p.available);
  }
}

export async function getFeaturedProducts(): Promise<Product[]> {
  // 1. Supabase PostgreSQL is the authoritative source when configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_featured", true)
          .eq("available", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (!error && data) {
          // Supabase is authoritative — return its result even if empty
          return data.map(mapRowToProduct);
        }
        if (error) {
          console.warn("Supabase query error in getFeaturedProducts; using fallback:", error.message);
        }
      }
    } catch (supabaseErr) {
      console.warn("Supabase exception in getFeaturedProducts:", supabaseErr);
    }
  }

  // 2. Fallback to Local SQLite (only when Supabase is unavailable or errored)
  try {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM products WHERE is_featured = 1 AND available = 1 ORDER BY sort_order ASC, created_at ASC")
      .all() as ProductRow[];
    return rows.map(mapRowToProduct);
  } catch (err) {
    console.error("Error fetching featured products from SQLite database:", err);
    return initialProducts.filter((p) => p.isFeatured && p.available);
  }
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  // 1. Supabase PostgreSQL is the authoritative source when configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (!error) {
          // Supabase is authoritative — if data is null, the product does not exist
          return data ? mapRowToProduct(data) : undefined;
        }
        console.warn("Supabase query error in getProductBySlug; using fallback:", error.message);
      }
    } catch (supabaseErr) {
      console.warn("Supabase exception in getProductBySlug:", supabaseErr);
    }
  }

  // 2. Fallback to Local SQLite (only when Supabase is unavailable or errored)
  try {
    const db = getDatabase();
    const row = db.prepare("SELECT * FROM products WHERE slug = ?").get(slug) as ProductRow | undefined;
    if (!row) return undefined;
    return mapRowToProduct(row);
  } catch (err) {
    console.error("Error fetching product by slug from SQLite database:", err);
    return initialProducts.find((p) => p.slug === slug);
  }
}

export async function getProductById(id: string): Promise<Product | undefined> {
  // 1. Supabase PostgreSQL is the authoritative source when configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (!error) {
          // Supabase is authoritative — if data is null, the product does not exist
          return data ? mapRowToProduct(data) : undefined;
        }
        console.warn("Supabase query error in getProductById; using fallback:", error.message);
      }
    } catch (supabaseErr) {
      console.warn("Supabase exception in getProductById:", supabaseErr);
    }
  }

  // 2. Fallback to Local SQLite (only when Supabase is unavailable or errored)
  try {
    const db = getDatabase();
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as ProductRow | undefined;
    if (!row) return undefined;
    return mapRowToProduct(row);
  } catch (err) {
    console.error("Error fetching product by id from SQLite database:", err);
    return initialProducts.find((p) => p.id === id);
  }
}

export async function getProductBySeriesNo(seriesNo: string): Promise<Product | undefined> {
  const query = seriesNo ? seriesNo.trim() : "";
  if (!query) return undefined;

  // 1. Supabase PostgreSQL is the authoritative source when configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .ilike("series_no", query)
          .maybeSingle();

        if (!error && data) {
          return mapRowToProduct(data);
        }
        if (error && error.code !== "42703") {
          console.warn("Supabase query error in getProductBySeriesNo; using fallback:", error.message);
        }
      }
    } catch (supabaseErr) {
      console.warn("Supabase exception in getProductBySeriesNo:", supabaseErr);
    }
  }

  // 2. Fallback to Local SQLite
  try {
    const db = getDatabase();
    const row = db
      .prepare("SELECT * FROM products WHERE UPPER(TRIM(series_no)) = UPPER(?)")
      .get(query) as ProductRow | undefined;
    if (row) {
      return mapRowToProduct(row);
    }
  } catch (err) {
    console.error("Error fetching product by seriesNo from SQLite database:", err);
  }

  // 3. Fallback to initial products catalog
  const staticMatch = initialProducts.find(
    (p) => p.seriesNo && p.seriesNo.trim().toUpperCase() === query.toUpperCase()
  );
  return staticMatch;
}

export async function createProduct(product: Omit<Product, "id"> & { id?: string }): Promise<Product> {
  const id = product.id || String(Date.now());
  const validCategory = normalizeCategoryKey(product.category || "breakfast");
  const sortOrder = product.sortOrder ?? 0;
  const cleanSeriesNo = product.seriesNo && product.seriesNo.trim().length > 0 ? product.seriesNo.trim() : null;

  // 1. Create in Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const dbRow: Record<string, unknown> = {
          id,
          slug: product.slug,
          series_no: cleanSeriesNo,
          name: product.name,
          subtitle: product.subtitle ?? "",
          short_description: product.shortDescription ?? "",
          description: product.description ?? "",
          why_youll_like_it: product.whyYoullLikeIt ?? "",
          price: product.price ?? null,
          original_price: product.originalPrice ?? null,
          is_featured: Boolean(product.isFeatured),
          image: product.image || "",
          ingredients: product.ingredients || [],
          nutrition: product.nutrition || {},
          available: product.available !== undefined ? Boolean(product.available) : true,
          category: validCategory,
          sort_order: sortOrder,
          weight: product.weight ?? "",
          updated_at: new Date().toISOString(),
        };

        let { data, error } = await supabase
          .from("products")
          .insert(dbRow)
          .select("*")
          .single();

        // Gracefully retry without series_no if column does not exist yet on Supabase
        if (error && (error.code === "42703" || error.message?.includes("series_no"))) {
          console.warn("Supabase products table does not have series_no column yet. Inserting without series_no in Supabase.");
          delete dbRow.series_no;
          const retry = await supabase.from("products").insert(dbRow).select("*").single();
          data = retry.data;
          error = retry.error;
        }

        if (error && (error.code === "23505" || error.message?.includes("idx_products_series_no") || error.message?.includes("series_no"))) {
          throw new Error(`A product with Series No. "${cleanSeriesNo}" already exists. Each product must have a unique Series No.`);
        }

        if (!error && data) {
          // Also sync to local SQLite if writable
          try {
            const db = getDatabase();
            db.prepare(`
              INSERT OR REPLACE INTO products (
                id, slug, series_no, name, subtitle, shortDescription, description, whyYoullLikeIt,
                price, original_price, is_featured, image, ingredients, nutrition, available, category, sort_order, weight, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).run(
              id, product.slug, cleanSeriesNo, product.name, product.subtitle ?? "", product.shortDescription ?? "",
              product.description ?? "", product.whyYoullLikeIt ?? "", product.price ?? null,
              product.originalPrice ?? null, product.isFeatured ? 1 : 0, product.image || "",
              JSON.stringify(product.ingredients || []), JSON.stringify(product.nutrition || {}),
              product.available ? 1 : 0, validCategory, sortOrder, product.weight ?? ""
            );
          } catch (dbErr: unknown) {
            const err = dbErr as { message?: string };
            if (err?.message?.includes("UNIQUE") && err?.message?.includes("series_no")) {
              throw new Error(`A product with Series No. "${cleanSeriesNo}" already exists. Each product must have a unique Series No.`);
            }
          }

          const mapped = mapRowToProduct(data);
          if (cleanSeriesNo && !mapped.seriesNo) {
            mapped.seriesNo = cleanSeriesNo;
          }
          return mapped;
        }
        if (error) {
          console.warn("Supabase insert error; saving to local database:", error.message);
        }
      }
    } catch (supabaseErr: unknown) {
      const err = supabaseErr as { message?: string };
      if (err?.message?.includes("already exists")) {
        throw err;
      }
      console.warn("Supabase insert exception:", supabaseErr);
    }
  }

  // 2. Fallback to Local SQLite
  const db = getDatabase();
  let computedOrder = sortOrder;
  if (computedOrder === undefined || computedOrder === null || computedOrder === 0) {
    const maxOrder = db.prepare("SELECT MAX(sort_order) as maxOrder FROM products").get() as { maxOrder: number | null };
    computedOrder = (maxOrder?.maxOrder ?? -1) + 1;
  }

  const stmt = db.prepare(`
    INSERT INTO products (
      id, slug, series_no, name, subtitle, shortDescription, description, whyYoullLikeIt,
      price, original_price, is_featured, image, ingredients, nutrition, available, category, sort_order, weight, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  try {
    stmt.run(
      id, product.slug, cleanSeriesNo, product.name, product.subtitle ?? "", product.shortDescription ?? "",
      product.description ?? "", product.whyYoullLikeIt ?? "", product.price ?? null,
      product.originalPrice ?? null, product.isFeatured ? 1 : 0, product.image || "",
      JSON.stringify(product.ingredients || []), JSON.stringify(product.nutrition || {}),
      product.available ? 1 : 0, validCategory, computedOrder, product.weight ?? ""
    );
  } catch (err: unknown) {
    const dbErr = err as { message?: string };
    if (dbErr?.message?.includes("UNIQUE") && dbErr?.message?.includes("series_no")) {
      throw new Error(`A product with Series No. "${cleanSeriesNo}" already exists. Each product must have a unique Series No.`);
    }
    throw err;
  }
  const created = (await getProductById(id))!;
  return created;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
  const existing = await getProductById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...updates };
  const validCategory = normalizeCategoryKey(merged.category || "breakfast");
  const sortOrder = merged.sortOrder !== undefined ? merged.sortOrder : (existing.sortOrder ?? 0);
  const finalImage = merged.image || existing.image || "";
  const cleanSeriesNo = merged.seriesNo !== undefined
    ? (merged.seriesNo && merged.seriesNo.trim().length > 0 ? merged.seriesNo.trim() : null)
    : (existing.seriesNo && existing.seriesNo.trim().length > 0 ? existing.seriesNo.trim() : null);

  // 1. Update in Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const dbRow: Record<string, unknown> = {
          slug: merged.slug,
          series_no: cleanSeriesNo,
          name: merged.name,
          subtitle: merged.subtitle ?? "",
          short_description: merged.shortDescription ?? "",
          description: merged.description ?? "",
          why_youll_like_it: merged.whyYoullLikeIt ?? "",
          price: merged.price ?? null,
          original_price: merged.originalPrice ?? null,
          is_featured: Boolean(merged.isFeatured),
          image: finalImage,
          ingredients: merged.ingredients || [],
          nutrition: merged.nutrition || {},
          available: merged.available !== undefined ? Boolean(merged.available) : true,
          category: validCategory,
          sort_order: sortOrder,
          weight: merged.weight ?? "",
          updated_at: new Date().toISOString(),
        };

        let { data, error } = await supabase
          .from("products")
          .update(dbRow)
          .eq("id", id)
          .select("*")
          .single();

        // Gracefully retry without series_no if column does not exist yet on Supabase
        if (error && (error.code === "42703" || error.message?.includes("series_no"))) {
          console.warn("Supabase products table does not have series_no column yet. Updating without series_no in Supabase.");
          delete dbRow.series_no;
          const retry = await supabase
            .from("products")
            .update(dbRow)
            .eq("id", id)
            .select("*")
            .single();
          data = retry.data;
          error = retry.error;
        }

        if (error && (error.code === "23505" || error.message?.includes("idx_products_series_no") || error.message?.includes("series_no"))) {
          throw new Error(`A product with Series No. "${cleanSeriesNo}" already exists. Each product must have a unique Series No.`);
        }

        if (!error && data) {
          // Sync to SQLite
          try {
            const db = getDatabase();
            db.prepare(`
              UPDATE products SET
                slug = ?, series_no = ?, name = ?, subtitle = ?, shortDescription = ?, description = ?, whyYoullLikeIt = ?,
                price = ?, original_price = ?, is_featured = ?, image = ?, ingredients = ?, nutrition = ?,
                available = ?, category = ?, weight = ?, sort_order = ?, updated_at = datetime('now')
              WHERE id = ?
            `).run(
              merged.slug, cleanSeriesNo, merged.name, merged.subtitle ?? "", merged.shortDescription ?? "",
              merged.description ?? "", merged.whyYoullLikeIt ?? "", merged.price ?? null,
              merged.originalPrice ?? null, merged.isFeatured ? 1 : 0,
              finalImage, JSON.stringify(merged.ingredients || []),
              JSON.stringify(merged.nutrition || {}), merged.available ? 1 : 0, validCategory, merged.weight ?? "", sortOrder, id
            );
          } catch (dbErr: unknown) {
            const err = dbErr as { message?: string };
            if (err?.message?.includes("UNIQUE") && err?.message?.includes("series_no")) {
              throw new Error(`A product with Series No. "${cleanSeriesNo}" already exists. Each product must have a unique Series No.`);
            }
          }

          const mapped = mapRowToProduct(data);
          if (cleanSeriesNo && !mapped.seriesNo) {
            mapped.seriesNo = cleanSeriesNo;
          }
          return mapped;
        }
        if (error) {
          console.warn("Supabase update error; saving to local database:", error.message);
        }
      }
    } catch (supabaseErr: unknown) {
      const err = supabaseErr as { message?: string };
      if (err?.message?.includes("already exists")) {
        throw err;
      }
      console.warn("Supabase update exception:", supabaseErr);
    }
  }

  // 2. Fallback to Local SQLite
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE products SET
      slug = ?,
      series_no = ?,
      name = ?,
      subtitle = ?,
      shortDescription = ?,
      description = ?,
      whyYoullLikeIt = ?,
      price = ?,
      original_price = ?,
      is_featured = ?,
      image = ?,
      ingredients = ?,
      nutrition = ?,
      available = ?,
      category = ?,
      weight = ?,
      sort_order = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `);

  try {
    stmt.run(
      merged.slug,
      cleanSeriesNo,
      merged.name,
      merged.subtitle ?? "",
      merged.shortDescription ?? "",
      merged.description ?? "",
      merged.whyYoullLikeIt ?? "",
      merged.price ?? null,
      merged.originalPrice ?? null,
      merged.isFeatured ? 1 : 0,
      finalImage,
      JSON.stringify(merged.ingredients || []),
      JSON.stringify(merged.nutrition || {}),
      merged.available ? 1 : 0,
      validCategory,
      merged.weight ?? "",
      sortOrder,
      id
    );
  } catch (err: unknown) {
    const dbErr = err as { message?: string };
    if (dbErr?.message?.includes("UNIQUE") && dbErr?.message?.includes("series_no")) {
      throw new Error(`A product with Series No. "${cleanSeriesNo}" already exists. Each product must have a unique Series No.`);
    }
    throw err;
  }

  const updatedProduct = await getProductById(id);
  return updatedProduct;
}

export async function toggleProductAvailability(id: string, available: boolean): Promise<boolean> {
  // 1. Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { error } = await supabase
          .from("products")
          .update({ available, updated_at: new Date().toISOString() })
          .eq("id", id);

        if (!error) {
          try {
            getDatabase().prepare("UPDATE products SET available = ?, updated_at = datetime('now') WHERE id = ?").run(available ? 1 : 0, id);
          } catch {
            // ignore
          }
          return true;
        }
      }
    } catch (err) {
      console.warn("Supabase toggle availability error:", err);
    }
  }

  // 2. SQLite
  try {
    const db = getDatabase();
    const res = db.prepare("UPDATE products SET available = ?, updated_at = datetime('now') WHERE id = ?").run(available ? 1 : 0, id);
    return res.changes > 0;
  } catch (err) {
    console.error("Error toggling product availability:", err);
    return false;
  }
}

export async function toggleProductFeatured(id: string, isFeatured: boolean): Promise<boolean> {
  // 1. Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { error } = await supabase
          .from("products")
          .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
          .eq("id", id);

        if (!error) {
          try {
            getDatabase().prepare("UPDATE products SET is_featured = ?, updated_at = datetime('now') WHERE id = ?").run(isFeatured ? 1 : 0, id);
          } catch {
            // ignore
          }
          return true;
        }
      }
    } catch (err) {
      console.warn("Supabase toggle featured error:", err);
    }
  }

  // 2. SQLite
  try {
    const db = getDatabase();
    const res = db.prepare("UPDATE products SET is_featured = ?, updated_at = datetime('now') WHERE id = ?").run(isFeatured ? 1 : 0, id);
    return res.changes > 0;
  } catch (err) {
    console.error("Error toggling product featured status:", err);
    return false;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  // 1. Supabase PostgreSQL is the authoritative source when configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        // Verify the product exists before attempting deletion
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("id", id)
          .maybeSingle();

        if (!existing) {
          // If not found in Supabase, also check if it exists in SQLite and clean it up
          try {
            const db = getDatabase();
            const res = db.prepare("DELETE FROM products WHERE id = ?").run(id);
            if (res.changes > 0) {
              return true;
            }
          } catch {
            // ignore
          }
          console.warn(`deleteProduct: Product '${id}' not found in Supabase or SQLite.`);
          return false;
        }

        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Supabase delete product error:", error.message);
          return false;
        }

        // Confirm the product no longer exists in Supabase
        const { data: verify } = await supabase
          .from("products")
          .select("id")
          .eq("id", id)
          .maybeSingle();

        if (verify) {
          console.error(`deleteProduct: Product '${id}' still exists in Supabase after DELETE.`);
          return false;
        }

        // Also remove from SQLite to keep it in sync
        try {
          getDatabase().prepare("DELETE FROM products WHERE id = ?").run(id);
        } catch (sqliteErr) {
          console.warn("SQLite mirror deletion failed (non-critical):", sqliteErr);
        }

        return true;
      }
    } catch (err) {
      console.error("Supabase delete product exception:", err);
      return false;
    }
  }

  // 2. SQLite fallback (only when Supabase is unavailable)
  try {
    const db = getDatabase();
    const res = db.prepare("DELETE FROM products WHERE id = ?").run(id);
    return res.changes > 0;
  } catch (err) {
    console.error("Error deleting product:", err);
    return false;
  }
}

// ----------------------------------------------------------
// User Database API
// ----------------------------------------------------------

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) return undefined;

  // 1. Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            email: data.email,
            password_hash: data.password_hash,
            role: data.role,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      }
    } catch (err) {
      console.warn("Supabase getUserByEmail error:", err);
    }
  }

  // 2. SQLite
  try {
    const db = getDatabase();
    const row = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(cleanEmail) as User | undefined;
    return row;
  } catch (err) {
    console.error("Error fetching user by email from SQLite:", err);
    return undefined;
  }
}

export async function getUserById(id: string): Promise<User | undefined> {
  // 1. Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            email: data.email,
            password_hash: data.password_hash,
            role: data.role,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      }
    } catch (err) {
      console.warn("Supabase getUserById error:", err);
    }
  }

  // 2. SQLite
  try {
    const db = getDatabase();
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
    return row;
  } catch (err) {
    console.error("Error fetching user by id from SQLite:", err);
    return undefined;
  }
}

export async function updateUserPassword(id: string, newPasswordHash: string): Promise<boolean> {
  // 1. Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { error } = await supabase
          .from("users")
          .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
          .eq("id", id);

        if (!error) {
          try {
            getDatabase().prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newPasswordHash, id);
          } catch {
            // ignore
          }
          return true;
        }
      }
    } catch (err) {
      console.warn("Supabase updateUserPassword error:", err);
    }
  }

  // 2. SQLite
  try {
    const db = getDatabase();
    const res = db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newPasswordHash, id);
    return res.changes > 0;
  } catch (err) {
    console.error("Error updating user password:", err);
    return false;
  }
}

export async function upsertAdminUser(email: string, passwordHash: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data: existing } = await supabase
          .from("users")
          .select("*")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (existing) {
          const { data, error } = await supabase
            .from("users")
            .update({ password_hash: passwordHash, role: "admin", updated_at: new Date().toISOString() })
            .eq("id", existing.id)
            .select("*")
            .single();

          if (!error && data) return data;
        } else {
          const id = "admin-" + Date.now();
          const { data, error } = await supabase
            .from("users")
            .insert({
              id,
              email: cleanEmail,
              password_hash: passwordHash,
              role: "admin",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select("*")
            .single();

          if (!error && data) return data;
        }
      }
    } catch (err) {
      console.warn("Supabase upsertAdminUser error:", err);
    }
  }

  // 2. SQLite
  const db = getDatabase();
  const existing = await getUserByEmail(cleanEmail);
  if (existing) {
    db.prepare("UPDATE users SET password_hash = ?, role = 'admin', updated_at = datetime('now') WHERE id = ?").run(passwordHash, existing.id);
    return (await getUserById(existing.id))!;
  } else {
    const id = "admin-" + Date.now();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', datetime('now'), datetime('now'))
    `).run(id, cleanEmail, passwordHash);
    return (await getUserById(id))!;
  }
}

// ----------------------------------------------------------
// Orders Database API
// ----------------------------------------------------------

export async function createOrder(order: {
  customerName?: string;
  customerPhone?: string;
  productId?: string;
  productName: string;
  quantity?: number;
  unitPrice?: number | null;
  totalAmount?: number | null;
  notes?: string;
  source?: string;
}): Promise<Order> {
  const id = "order-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const quantity = order.quantity || 1;
  const unitPrice = order.unitPrice ?? null;
  const totalAmount = order.totalAmount ?? (unitPrice !== null ? unitPrice * quantity : null);

  // 1. Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("orders")
          .insert({
            id,
            customer_name: order.customerName || null,
            customer_phone: order.customerPhone || null,
            product_id: order.productId || null,
            product_name: order.productName,
            quantity,
            unit_price: unitPrice,
            total_amount: totalAmount,
            notes: order.notes || null,
            source: order.source || "whatsapp",
            status: "pending",
            created_at: now,
            updated_at: now,
          })
          .select("*")
          .single();

        if (!error && data) {
          return {
            id: data.id,
            customerName: data.customer_name,
            customerPhone: data.customer_phone,
            productId: data.product_id,
            productName: data.product_name,
            quantity: data.quantity,
            unitPrice: data.unit_price,
            totalAmount: data.total_amount,
            notes: data.notes,
            source: data.source,
            status: data.status,
            createdAt: data.created_at,
          };
        }
      }
    } catch (err) {
      console.warn("Supabase createOrder error:", err);
    }
  }

  // 2. SQLite
  const db = getDatabase();
  db.prepare(`
    INSERT INTO orders (
      id, customer_name, customer_phone, product_id, product_name,
      quantity, unit_price, total_amount, notes, source, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
  `).run(
    id,
    order.customerName || null,
    order.customerPhone || null,
    order.productId || null,
    order.productName,
    quantity,
    unitPrice,
    totalAmount,
    order.notes || null,
    order.source || "whatsapp"
  );

  return {
    id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    productId: order.productId,
    productName: order.productName,
    quantity,
    unitPrice,
    totalAmount,
    notes: order.notes,
    source: order.source || "whatsapp",
    status: "pending",
    createdAt: now,
  };
}

export async function getAllOrders(): Promise<Order[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          return data.map((d) => ({
            id: d.id,
            customerName: d.customer_name,
            customerPhone: d.customer_phone,
            productId: d.product_id,
            productName: d.product_name,
            quantity: d.quantity,
            unitPrice: d.unit_price,
            totalAmount: d.total_amount,
            notes: d.notes,
            source: d.source,
            status: d.status,
            createdAt: d.created_at,
          }));
        }
      }
    } catch (err) {
      console.warn("Supabase getAllOrders error:", err);
    }
  }

  try {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all() as Array<{
      id: string;
      customer_name?: string;
      customer_phone?: string;
      product_id?: string;
      product_name: string;
      quantity: number;
      unit_price?: number;
      total_amount?: number;
      notes?: string;
      source: string;
      status: "pending" | "confirmed" | "completed" | "cancelled";
      created_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      productId: r.product_id,
      productName: r.product_name,
      quantity: r.quantity,
      unitPrice: r.unit_price,
      totalAmount: r.total_amount,
      notes: r.notes,
      source: r.source,
      status: r.status,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error("Error fetching orders:", err);
    return [];
  }
}
