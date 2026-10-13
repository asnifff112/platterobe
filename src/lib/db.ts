import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { Product, products as initialProducts } from "@/data/products";
import { normalizeCategoryKey, isValidCategoryKey } from "@/data/categories";

const DB_DIR = path.join(process.cwd(), "data");
const SOURCE_DB_PATH = path.join(DB_DIR, "platterobe.db");

// In serverless environments (like Vercel / AWS Lambda), the deployment directory is read-only.
// We use /tmp which is the designated writable directory in serverless invocations.
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

// Global cached database connection in development to prevent multiple connections
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

function getDatabase(): Database.Database {
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

      // Safe backward-compatible migration for legacy categories
      db.exec(`
        UPDATE products SET category = 'breakfast' WHERE category IN ('oats', 'eggs', 'pancake', 'fruit');
        UPDATE products SET category = 'lunch' WHERE category IN ('sandwich');
        UPDATE products SET category = 'dinner' WHERE category IN ('pudding');
        UPDATE products SET category = 'shakes-smoothies' WHERE category IN ('smoothie');
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
// User Database API
// ----------------------------------------------------------

export function getUserByEmail(email: string): User | undefined {
  try {
    const db = getDatabase();
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) return undefined;
    const row = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(cleanEmail) as User | undefined;
    return row;
  } catch (err) {
    console.error("Error fetching user by email from database:", err);
    return undefined;
  }
}

export function getUserById(id: string): User | undefined {
  try {
    const db = getDatabase();
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
    return row;
  } catch (err) {
    console.error("Error fetching user by id from database:", err);
    return undefined;
  }
}

export function updateUserPassword(id: string, newPasswordHash: string): boolean {
  try {
    const db = getDatabase();
    const res = db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newPasswordHash, id);
    return res.changes > 0;
  } catch (err) {
    console.error("Error updating user password:", err);
    return false;
  }
}

export function upsertAdminUser(email: string, passwordHash: string): User {
  const db = getDatabase();
  const cleanEmail = email.trim().toLowerCase();
  const existing = getUserByEmail(cleanEmail);
  if (existing) {
    db.prepare("UPDATE users SET password_hash = ?, role = 'admin', updated_at = datetime('now') WHERE id = ?").run(passwordHash, existing.id);
    return getUserById(existing.id)!;
  } else {
    const id = "admin-" + Date.now();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', datetime('now'), datetime('now'))
    `).run(id, cleanEmail, passwordHash);
    return getUserById(id)!;
  }
}

// ----------------------------------------------------------
// Products Database API
// ----------------------------------------------------------

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  whyYoullLikeIt: string;
  price: number | null;
  original_price: number | null;
  is_featured: number;
  image: string;
  ingredients: string;
  nutrition: string;
  available: number;
  category: string;
  sort_order: number;
  weight?: string;
  created_at: string;
  updated_at: string;
}

function mapRowToProduct(row: ProductRow): Product {
  let ingredients = [];
  try {
    ingredients = JSON.parse(row.ingredients);
  } catch {
    ingredients = [];
  }

  let nutrition = {
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
  };
  try {
    nutrition = JSON.parse(row.nutrition);
  } catch {
    // default
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    shortDescription: row.shortDescription,
    description: row.description,
    whyYoullLikeIt: row.whyYoullLikeIt,
    price: row.price,
    originalPrice: row.original_price ?? null,
    isFeatured: Boolean(row.is_featured),
    image: row.image,
    ingredients,
    nutrition,
    available: Boolean(row.available),
    category: normalizeCategoryKey(row.category),
    weight: row.weight || null,
    sortOrder: row.sort_order ?? 0,
  };
}

export function getAllProducts(): Product[] {
  try {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM products ORDER BY sort_order ASC, created_at ASC").all() as ProductRow[];
    return rows.map(mapRowToProduct);
  } catch (err) {
    console.error("Error fetching all products from database:", err);
    return initialProducts;
  }
}

export function getAvailableProducts(): Product[] {
  try {
    const db = getDatabase();
    const rows = db.prepare("SELECT * FROM products WHERE available = 1 ORDER BY sort_order ASC, created_at ASC").all() as ProductRow[];
    return rows.map(mapRowToProduct);
  } catch (err) {
    console.error("Error fetching available products from database:", err);
    return initialProducts.filter((p) => p.available);
  }
}

export function getFeaturedProducts(): Product[] {
  try {
    const db = getDatabase();
    const rows = db
      .prepare("SELECT * FROM products WHERE is_featured = 1 AND available = 1 ORDER BY sort_order ASC, created_at ASC")
      .all() as ProductRow[];
    return rows.map(mapRowToProduct);
  } catch (err) {
    console.error("Error fetching featured products from database:", err);
    return initialProducts.filter((p) => p.isFeatured && p.available);
  }
}

export function getProductBySlug(slug: string): Product | undefined {
  try {
    const db = getDatabase();
    const row = db.prepare("SELECT * FROM products WHERE slug = ?").get(slug) as ProductRow | undefined;
    if (!row) return undefined;
    return mapRowToProduct(row);
  } catch (err) {
    console.error("Error fetching product by slug from database:", err);
    return initialProducts.find((p) => p.slug === slug);
  }
}

export function getProductById(id: string): Product | undefined {
  try {
    const db = getDatabase();
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as ProductRow | undefined;
    if (!row) return undefined;
    return mapRowToProduct(row);
  } catch (err) {
    console.error("Error fetching product by id from database:", err);
    return initialProducts.find((p) => p.id === id);
  }
}

export function createProduct(product: Omit<Product, "id"> & { id?: string }): Product {
  const db = getDatabase();
  const id = product.id || String(Date.now());
  let sortOrder = product.sortOrder;
  if (sortOrder === undefined || sortOrder === null) {
    const maxOrder = db.prepare("SELECT MAX(sort_order) as maxOrder FROM products").get() as { maxOrder: number | null };
    sortOrder = (maxOrder?.maxOrder ?? -1) + 1;
  }

  const validCategory = normalizeCategoryKey(product.category || "breakfast");

  const stmt = db.prepare(`
    INSERT INTO products (
      id, slug, name, subtitle, shortDescription, description, whyYoullLikeIt,
      price, original_price, is_featured, image, ingredients, nutrition, available, category, sort_order, weight, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
    )
  `);

  stmt.run(
    id,
    product.slug,
    product.name,
    product.subtitle ?? "",
    product.shortDescription ?? "",
    product.description ?? "",
    product.whyYoullLikeIt ?? "",
    product.price ?? null,
    product.originalPrice ?? null,
    product.isFeatured ? 1 : 0,
    product.image || "/images/classic-overnight-oats.jpg",
    JSON.stringify(product.ingredients || []),
    JSON.stringify(product.nutrition || {}),
    product.available ? 1 : 0,
    validCategory,
    sortOrder,
    product.weight ?? ""
  );

  return getProductById(id)!;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | undefined {
  const db = getDatabase();
  const existing = getProductById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...updates };
  const validCategory = normalizeCategoryKey(merged.category || "breakfast");
  const sortOrder = merged.sortOrder !== undefined ? merged.sortOrder : (existing.sortOrder ?? 0);

  const stmt = db.prepare(`
    UPDATE products SET
      slug = ?,
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

  stmt.run(
    merged.slug,
    merged.name,
    merged.subtitle ?? "",
    merged.shortDescription ?? "",
    merged.description ?? "",
    merged.whyYoullLikeIt ?? "",
    merged.price ?? null,
    merged.originalPrice ?? null,
    merged.isFeatured ? 1 : 0,
    merged.image || "/images/classic-overnight-oats.jpg",
    JSON.stringify(merged.ingredients || []),
    JSON.stringify(merged.nutrition || {}),
    merged.available ? 1 : 0,
    validCategory,
    merged.weight ?? "",
    sortOrder,
    id
  );

  return getProductById(id);
}

export function toggleProductAvailability(id: string, available: boolean): boolean {
  try {
    const db = getDatabase();
    const res = db.prepare("UPDATE products SET available = ?, updated_at = datetime('now') WHERE id = ?").run(available ? 1 : 0, id);
    return res.changes > 0;
  } catch (err) {
    console.error("Error toggling product availability:", err);
    return false;
  }
}

export function toggleProductFeatured(id: string, isFeatured: boolean): boolean {
  try {
    const db = getDatabase();
    const res = db.prepare("UPDATE products SET is_featured = ?, updated_at = datetime('now') WHERE id = ?").run(isFeatured ? 1 : 0, id);
    return res.changes > 0;
  } catch (err) {
    console.error("Error toggling product featured status:", err);
    return false;
  }
}

export function deleteProduct(id: string): boolean {
  try {
    const db = getDatabase();
    const res = db.prepare("DELETE FROM products WHERE id = ?").run(id);
    return res.changes > 0;
  } catch (err) {
    console.error("Error deleting product:", err);
    return false;
  }
}
