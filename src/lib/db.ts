import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { Product, products as initialProducts } from "@/data/products";
import { normalizeCategoryKey, isValidCategoryKey } from "@/data/categories";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "platterobe.db");

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Ensure public uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Global cached database connection in development to prevent multiple connections
declare global {
  // eslint-disable-next-line no-var
  var __platterobeDb: Database.Database | undefined;
}

function getDatabase(): Database.Database {
  if (!global.__platterobeDb) {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Initialize Schema
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
        image TEXT NOT NULL,
        ingredients TEXT NOT NULL, -- JSON string
        nutrition TEXT NOT NULL,   -- JSON string
        available INTEGER NOT NULL DEFAULT 1,
        category TEXT NOT NULL DEFAULT 'breakfast',
        sort_order INTEGER NOT NULL DEFAULT 0,
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

    // Seed if empty
    const countRow = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
    if (countRow.count === 0) {
      const insert = db.prepare(`
        INSERT INTO products (
          id, slug, name, subtitle, shortDescription, description, whyYoullLikeIt,
          price, image, ingredients, nutrition, available, category, sort_order
        ) VALUES (
          @id, @slug, @name, @subtitle, @shortDescription, @description, @whyYoullLikeIt,
          @price, @image, @ingredients, @nutrition, @available, @category, @sort_order
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
            image: item.image || "/images/classic-overnight-oats.jpg",
            ingredients: JSON.stringify(item.ingredients || []),
            nutrition: JSON.stringify(item.nutrition || {}),
            available: item.available ? 1 : 0,
            category: normalizeCategoryKey(item.category || "breakfast"),
            sort_order: order++,
          });
        }
      });

      insertMany(initialProducts);
    }

    global.__platterobeDb = db;
  }

  return global.__platterobeDb;
}

// Database helper mapping row to Product
interface ProductRow {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  whyYoullLikeIt: string;
  price: number | null;
  image: string;
  ingredients: string;
  nutrition: string;
  available: number;
  category: string;
  sort_order: number;
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
    image: row.image,
    ingredients,
    nutrition,
    available: Boolean(row.available),
    category: normalizeCategoryKey(row.category),
  };
}

// Public API
export function getAllProducts(): Product[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM products ORDER BY sort_order ASC, created_at ASC").all() as ProductRow[];
  return rows.map(mapRowToProduct);
}

export function getAvailableProducts(): Product[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM products WHERE available = 1 ORDER BY sort_order ASC, created_at ASC").all() as ProductRow[];
  return rows.map(mapRowToProduct);
}

export function getProductBySlug(slug: string): Product | undefined {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM products WHERE slug = ?").get(slug) as ProductRow | undefined;
  if (!row) return undefined;
  return mapRowToProduct(row);
}

export function getProductById(id: string): Product | undefined {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as ProductRow | undefined;
  if (!row) return undefined;
  return mapRowToProduct(row);
}

export function createProduct(product: Omit<Product, "id"> & { id?: string }): Product {
  const db = getDatabase();
  const id = product.id || String(Date.now());
  const maxOrder = db.prepare("SELECT MAX(sort_order) as maxOrder FROM products").get() as { maxOrder: number | null };
  const sortOrder = (maxOrder?.maxOrder ?? -1) + 1;

  const validCategory = normalizeCategoryKey(product.category || "breakfast");

  const stmt = db.prepare(`
    INSERT INTO products (
      id, slug, name, subtitle, shortDescription, description, whyYoullLikeIt,
      price, image, ingredients, nutrition, available, category, sort_order, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
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
    product.image || "/images/classic-overnight-oats.jpg",
    JSON.stringify(product.ingredients || []),
    JSON.stringify(product.nutrition || {}),
    product.available ? 1 : 0,
    validCategory,
    sortOrder
  );

  return getProductById(id)!;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | undefined {
  const db = getDatabase();
  const existing = getProductById(id);
  if (!existing) return undefined;

  const merged = { ...existing, ...updates };
  const validCategory = normalizeCategoryKey(merged.category || "breakfast");

  const stmt = db.prepare(`
    UPDATE products SET
      slug = ?,
      name = ?,
      subtitle = ?,
      shortDescription = ?,
      description = ?,
      whyYoullLikeIt = ?,
      price = ?,
      image = ?,
      ingredients = ?,
      nutrition = ?,
      available = ?,
      category = ?,
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
    merged.image || "/images/classic-overnight-oats.jpg",
    JSON.stringify(merged.ingredients || []),
    JSON.stringify(merged.nutrition || {}),
    merged.available ? 1 : 0,
    validCategory,
    id
  );

  return getProductById(id);
}

export function toggleProductAvailability(id: string, available: boolean): boolean {
  const db = getDatabase();
  const res = db.prepare("UPDATE products SET available = ?, updated_at = datetime('now') WHERE id = ?").run(available ? 1 : 0, id);
  return res.changes > 0;
}

export function deleteProduct(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM products WHERE id = ?").run(id);
  return res.changes > 0;
}
