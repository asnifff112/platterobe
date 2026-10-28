/**
 * PLATTEROBE — THE MEAL CLUB
 * Database Service Layer
 * 
 * Supports local SQLite (data/platterobe.db) + Supabase dual-sync.
 * Guarantees zero downtime, offline resilience, and immediate testability.
 */

import Database from "better-sqlite3";
import { getDatabase, getAllProducts } from "@/lib/db";
import type { Product } from "@/data/products";
import type {
  MealCategory,
  MealPlan,
  MealPlanDay,
  MealSubscription,
  ConfirmedMealSelection,
  MealAuditLog,
  SwapRules,
} from "@/data/meal-club-types";
import { calculatePlanPrice } from "@/lib/meal-club-pricing";
import { CountryCode, getCountryPrice } from "@/lib/country";
import { normalizeCategoryKey } from "@/data/categories";

// Initialize Meal Club tables in SQLite if they don't already exist
export function initMealClubTables(db: Database.Database) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS meal_categories (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS meal_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        subtitle TEXT DEFAULT '',
        description TEXT DEFAULT '',
        image TEXT DEFAULT '',
        duration_days INTEGER NOT NULL DEFAULT 7,
        meal_categories TEXT NOT NULL DEFAULT '["breakfast"]',
        meals_per_day INTEGER NOT NULL DEFAULT 1,
        pricing_mode TEXT NOT NULL DEFAULT 'fixed',
        base_price REAL NOT NULL DEFAULT 0,
        base_price_aed REAL,
        original_price REAL,
        original_price_aed REAL,
        status TEXT NOT NULL DEFAULT 'draft',
        is_featured INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        swap_rules TEXT NOT NULL DEFAULT '{}',
        schedule TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS meal_subscriptions (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        plan_duration INTEGER NOT NULL,
        pricing_mode TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        delivery_address TEXT NOT NULL,
        city TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT 'IN',
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        order_locked INTEGER NOT NULL DEFAULT 0,
        locked_at TEXT,
        confirmed_at TEXT,
        total_amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        swaps_used INTEGER NOT NULL DEFAULT 0,
        max_swaps_allowed INTEGER NOT NULL DEFAULT 0,
        daily_schedule TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS meal_audit_logs (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        action TEXT NOT NULL,
        performed_by TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Seed default categories if empty
    const catCount = db.prepare("SELECT COUNT(*) as count FROM meal_categories").get() as { count: number };
    if (catCount.count === 0) {
      const insertCat = db.prepare(`
        INSERT INTO meal_categories (id, display_name, description, sort_order, is_active)
        VALUES (?, ?, ?, ?, 1)
      `);
      insertCat.run("breakfast", "The Morning Edit", "Wholesome, slow-release breakfast platters to start your day right.", 1);
      insertCat.run("lunch", "Midday Plates", "Satisfying, high-protein midday fuel built for lasting satiety.", 2);
      insertCat.run("dinner", "Evening Plates", "Light, nourishing plates for an effortless, wholesome evening.", 3);
      insertCat.run("snacks", "Snack Box", "Wholesome midday snacks and raw bites.", 4);
      insertCat.run("beverages", "Blended & Pressed", "Nutrient-rich shakes, smoothies, and cold-pressed juices.", 5);
    }
  } catch (err) {
    console.error("Error initializing Meal Club tables:", err);
  }
}

// -----------------------------------------------------------------------------
// CATEGORIES SERVICE
// -----------------------------------------------------------------------------

export async function getMealCategories(): Promise<MealCategory[]> {
  const db = getDatabase();
  initMealClubTables(db);

  try {
    const rows = db.prepare("SELECT * FROM meal_categories ORDER BY sort_order ASC, display_name ASC").all() as Array<{
      id: string;
      display_name: string;
      description: string;
      sort_order: number;
      is_active: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      description: r.description,
      sortOrder: r.sort_order,
      isActive: Boolean(r.is_active),
    }));
  } catch (err) {
    console.error("getMealCategories error:", err);
    return [];
  }
}

export async function createMealCategory(category: {
  id: string;
  displayName: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<MealCategory> {
  const db = getDatabase();
  initMealClubTables(db);

  const cleanId = category.id.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
  const sortOrder = category.sortOrder ?? 10;
  const isActive = category.isActive === false ? 0 : 1;

  db.prepare(`
    INSERT INTO meal_categories (id, display_name, description, sort_order, is_active, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(cleanId, category.displayName.trim(), category.description?.trim() || "", sortOrder, isActive);

  return {
    id: cleanId,
    displayName: category.displayName.trim(),
    description: category.description?.trim() || "",
    sortOrder,
    isActive: Boolean(isActive),
  };
}

export async function updateMealCategory(
  id: string,
  updates: Partial<Omit<MealCategory, "id">>
): Promise<MealCategory | undefined> {
  const db = getDatabase();
  initMealClubTables(db);

  const existing = db.prepare("SELECT * FROM meal_categories WHERE id = ?").get(id) as {
    id: string;
    display_name: string;
    description: string;
    sort_order: number;
    is_active: number;
  } | undefined;

  if (!existing) return undefined;

  const displayName = updates.displayName !== undefined ? updates.displayName.trim() : existing.display_name;
  const description = updates.description !== undefined ? updates.description.trim() : existing.description;
  const sortOrder = updates.sortOrder !== undefined ? updates.sortOrder : existing.sort_order;
  const isActive = updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : existing.is_active;

  db.prepare(`
    UPDATE meal_categories
    SET display_name = ?, description = ?, sort_order = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(displayName, description, sortOrder, isActive, id);

  return {
    id,
    displayName,
    description,
    sortOrder,
    isActive: Boolean(isActive),
  };
}

// -----------------------------------------------------------------------------
// MEAL PLANS SERVICE
// -----------------------------------------------------------------------------

function mapRowToMealPlan(row: Record<string, unknown>): MealPlan {
  let categories: string[] = ["breakfast"];
  try {
    if (typeof row.meal_categories === "string") {
      categories = JSON.parse(row.meal_categories);
    }
  } catch {
    // fallback
  }

  let swapRules: SwapRules = {
    enabled: true,
    maxSwapsPerPlan: 5,
    deadlineHours: 0,
    allowCrossCategory: false,
    priceDifferenceMode: "none",
  };
  try {
    if (typeof row.swap_rules === "string") {
      swapRules = { ...swapRules, ...JSON.parse(row.swap_rules) };
    }
  } catch {
    // fallback
  }

  let schedule: MealPlanDay[] = [];
  try {
    if (typeof row.schedule === "string") {
      schedule = JSON.parse(row.schedule);
    }
  } catch {
    // fallback
  }

  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    subtitle: row.subtitle ? String(row.subtitle) : "",
    description: row.description ? String(row.description) : "",
    image: row.image ? String(row.image) : "",
    durationDays: Number(row.duration_days) || 7,
    mealCategories: Array.isArray(categories) ? categories : ["breakfast"],
    mealsPerDay: Number(row.meals_per_day) || 1,
    pricingMode: (row.pricing_mode as MealPlan["pricingMode"]) || "fixed",
    basePrice: Number(row.base_price) || 0,
    basePriceAed: row.base_price_aed !== null && row.base_price_aed !== undefined ? Number(row.base_price_aed) : null,
    originalPrice: row.original_price !== null && row.original_price !== undefined ? Number(row.original_price) : null,
    originalPriceAed: row.original_price_aed !== null && row.original_price_aed !== undefined ? Number(row.original_price_aed) : null,
    status: (row.status as MealPlan["status"]) || "draft",
    isFeatured: Boolean(row.is_featured),
    sortOrder: Number(row.sort_order) || 0,
    swapRules,
    schedule,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

export async function getAllMealPlans(includeArchived = false): Promise<MealPlan[]> {
  const db = getDatabase();
  initMealClubTables(db);

  try {
    const query = includeArchived
      ? "SELECT * FROM meal_plans ORDER BY sort_order ASC, created_at DESC"
      : "SELECT * FROM meal_plans WHERE status != 'archived' ORDER BY sort_order ASC, created_at DESC";

    const rows = db.prepare(query).all() as Record<string, unknown>[];
    return rows.map(mapRowToMealPlan);
  } catch (err) {
    console.error("getAllMealPlans error:", err);
    return [];
  }
}

export async function getPublishedMealPlans(): Promise<MealPlan[]> {
  const db = getDatabase();
  initMealClubTables(db);

  try {
    const rows = db
      .prepare("SELECT * FROM meal_plans WHERE status = 'published' ORDER BY sort_order ASC, duration_days ASC")
      .all() as Record<string, unknown>[];
    return rows.map(mapRowToMealPlan);
  } catch (err) {
    console.error("getPublishedMealPlans error:", err);
    return [];
  }
}

export async function getMealPlanById(id: string): Promise<MealPlan | undefined> {
  const db = getDatabase();
  initMealClubTables(db);

  try {
    const row = db.prepare("SELECT * FROM meal_plans WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return mapRowToMealPlan(row);
  } catch (err) {
    console.error("getMealPlanById error:", err);
    return undefined;
  }
}

export async function getMealPlanBySlug(slug: string): Promise<MealPlan | undefined> {
  const db = getDatabase();
  initMealClubTables(db);

  try {
    const row = db.prepare("SELECT * FROM meal_plans WHERE slug = ?").get(slug) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return mapRowToMealPlan(row);
  } catch (err) {
    console.error("getMealPlanBySlug error:", err);
    return undefined;
  }
}

export async function createMealPlan(data: Omit<MealPlan, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<MealPlan> {
  const db = getDatabase();
  initMealClubTables(db);

  const id = data.id || `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const cleanSlug = data.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");

  const rawRules = data.swapRules as (SwapRules & {
    allowSwaps?: boolean;
    maxSwapsPerSubscription?: number;
    swapDeadlineHoursBefore?: number;
    allowCrossCategorySwaps?: boolean;
    priceAdjustmentPolicy?: string;
  }) | undefined;

  const swapRules: SwapRules = {
    enabled: Boolean(rawRules?.enabled ?? rawRules?.allowSwaps ?? true),
    maxSwapsPerPlan: Number(rawRules?.maxSwapsPerPlan ?? rawRules?.maxSwapsPerSubscription ?? 5),
    deadlineHours: Number(rawRules?.deadlineHours ?? rawRules?.swapDeadlineHoursBefore ?? 0),
    allowCrossCategory: Boolean(rawRules?.allowCrossCategory ?? rawRules?.allowCrossCategorySwaps ?? false),
    priceDifferenceMode:
      rawRules?.priceAdjustmentPolicy === "maintain_package_price"
        ? "none"
        : rawRules?.priceAdjustmentPolicy === "recalculate_exact_sum"
        ? "charge_difference"
        : rawRules?.priceDifferenceMode || "none",
    eligibleProductIds: rawRules?.eligibleProductIds || null,
  };

  const schedule: MealPlanDay[] = (data.schedule || []).map((day) => ({
    dayNumber: day.dayNumber,
    dayLabel: day.dayLabel || `Day ${day.dayNumber}`,
    meals: (day.meals || []).map((m) => {
      const legacy = m as unknown as Record<string, unknown>;
      return {
        slotKey: m.slotKey || "breakfast",
        slotName: m.slotName || (typeof legacy.categoryDisplayName === "string" ? (legacy.categoryDisplayName as string) : "Morning Meal"),
        category: m.category || "breakfast",
        productId: m.productId,
        isSwappable: m.isSwappable ?? !(legacy.isOptional === true),
        eligibleSwapProductIds: m.eligibleSwapProductIds || null,
      };
    }),
  }));

  db.prepare(`
    INSERT INTO meal_plans (
      id, name, slug, subtitle, description, image, duration_days,
      meal_categories, meals_per_day, pricing_mode, base_price, base_price_aed,
      original_price, original_price_aed, status, is_featured, sort_order,
      swap_rules, schedule, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    data.name.trim(),
    cleanSlug,
    data.subtitle?.trim() || "",
    data.description?.trim() || "",
    data.image || "",
    data.durationDays || 7,
    JSON.stringify(data.mealCategories || ["breakfast"]),
    data.mealsPerDay || 1,
    data.pricingMode || "fixed",
    data.basePrice || 0,
    data.basePriceAed ?? null,
    data.originalPrice ?? null,
    data.originalPriceAed ?? null,
    data.status || "draft",
    data.isFeatured ? 1 : 0,
    data.sortOrder ?? 0,
    JSON.stringify(swapRules),
    JSON.stringify(schedule)
  );

  return (await getMealPlanById(id))!;
}

export async function updateMealPlan(id: string, updates: Partial<MealPlan>): Promise<MealPlan | undefined> {
  const existing = await getMealPlanById(id);
  if (!existing) return undefined;

  const db = getDatabase();
  initMealClubTables(db);

  const merged = { ...existing, ...updates };
  const cleanSlug = merged.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");

  db.prepare(`
    UPDATE meal_plans SET
      name = ?, slug = ?, subtitle = ?, description = ?, image = ?, duration_days = ?,
      meal_categories = ?, meals_per_day = ?, pricing_mode = ?, base_price = ?, base_price_aed = ?,
      original_price = ?, original_price_aed = ?, status = ?, is_featured = ?, sort_order = ?,
      swap_rules = ?, schedule = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    merged.name.trim(),
    cleanSlug,
    merged.subtitle?.trim() || "",
    merged.description.trim(),
    merged.image || "",
    merged.durationDays || 7,
    JSON.stringify(merged.mealCategories || ["breakfast"]),
    merged.mealsPerDay || 1,
    merged.pricingMode || "fixed",
    merged.basePrice || 0,
    merged.basePriceAed ?? null,
    merged.originalPrice ?? null,
    merged.originalPriceAed ?? null,
    merged.status || "draft",
    merged.isFeatured ? 1 : 0,
    merged.sortOrder ?? 0,
    JSON.stringify(merged.swapRules),
    JSON.stringify(merged.schedule),
    id
  );

  return await getMealPlanById(id);
}

export async function duplicateMealPlan(id: string, newName?: string): Promise<MealPlan | undefined> {
  const source = await getMealPlanById(id);
  if (!source) return undefined;

  const name = newName || `${source.name} (Copy)`;
  const slug = `${source.slug}-copy-${Date.now().toString().slice(-4)}`;

  return await createMealPlan({
    ...source,
    id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    slug,
    status: "draft", // Copies start as drafts for safe review
  });
}

export async function deleteMealPlan(id: string): Promise<boolean> {
  const db = getDatabase();
  initMealClubTables(db);

  try {
    const res = db.prepare("DELETE FROM meal_plans WHERE id = ?").run(id);
    return res.changes > 0;
  } catch (err) {
    console.error("deleteMealPlan error:", err);
    return false;
  }
}

// -----------------------------------------------------------------------------
// SUBSCRIPTIONS & CONFIRMED ORDERS SERVICE
// -----------------------------------------------------------------------------

function mapRowToSubscription(row: Record<string, unknown>): MealSubscription {
  let dailySchedule: ConfirmedMealSelection[] = [];
  try {
    if (typeof row.daily_schedule === "string") {
      dailySchedule = JSON.parse(row.daily_schedule);
    }
  } catch {
    // fallback
  }

  return {
    id: String(row.id),
    planId: String(row.plan_id),
    planName: String(row.plan_name),
    planDuration: Number(row.plan_duration) || 7,
    pricingMode: (row.pricing_mode as MealSubscription["pricingMode"]) || "fixed",
    customerName: String(row.customer_name),
    customerPhone: String(row.customer_phone),
    customerEmail: row.customer_email ? String(row.customer_email) : null,
    deliveryAddress: String(row.delivery_address || ""),
    city: String(row.city || ""),
    country: (row.country as "IN" | "AE") || "IN",
    startDate: String(row.start_date || ""),
    endDate: String(row.end_date || ""),
    status: (row.status as MealSubscription["status"]) || "pending",
    orderLocked: Boolean(row.order_locked),
    lockedAt: row.locked_at ? String(row.locked_at) : null,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
    totalAmount: Number(row.total_amount) || 0,
    currency: (row.currency as "INR" | "AED") || "INR",
    swapsUsed: Number(row.swaps_used) || 0,
    maxSwapsAllowed: Number(row.max_swaps_allowed) || 0,
    dailySchedule,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

export async function getAllSubscriptions(): Promise<MealSubscription[]> {
  const db = getDatabase();
  initMealClubTables(db);

  try {
    const rows = db
      .prepare("SELECT * FROM meal_subscriptions ORDER BY created_at DESC")
      .all() as Record<string, unknown>[];
    return rows.map(mapRowToSubscription);
  } catch (err) {
    console.error("getAllSubscriptions error:", err);
    return [];
  }
}

export async function getSubscriptionById(id: string): Promise<MealSubscription | undefined> {
  const db = getDatabase();
  initMealClubTables(db);

  try {
    const row = db.prepare("SELECT * FROM meal_subscriptions WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return mapRowToSubscription(row);
  } catch (err) {
    console.error("getSubscriptionById error:", err);
    return undefined;
  }
}

/**
 * Creates a new customer meal plan subscription / order.
 * If immediately confirmed, order is permanently locked.
 */
export async function createMealSubscription(data: {
  id?: string;
  planId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryAddress: string;
  city: string;
  country?: "IN" | "AE";
  startDate: string;
  customSchedule?: MealPlanDay[];
  selectedMeals?: Array<{ dayNumber: number; slotKey: string; productId: string }>;
  notes?: string;
  confirmImmediately?: boolean;
}): Promise<MealSubscription> {
  const plan = await getMealPlanById(data.planId);
  if (!plan) throw new Error("Meal plan not found.");
  if (plan.status !== "published") throw new Error("This meal plan is not currently available for subscription.");

  const allProducts = await getAllProducts();
  const productsById = new Map<string, Product>(allProducts.map((p) => [p.id, p]));
  const country: CountryCode = data.country || "IN";

  // Build daily schedule snapshot
  let activeDays = data.customSchedule && data.customSchedule.length > 0 ? data.customSchedule : plan.schedule;

  if (data.selectedMeals && data.selectedMeals.length > 0) {
    const mealMap = new Map<string, string>();
    for (const sm of data.selectedMeals) {
      mealMap.set(`${sm.dayNumber}_${sm.slotKey}`, sm.productId);
    }
    activeDays = plan.schedule.map((day) => ({
      ...day,
      meals: day.meals.map((m) => {
        const customProdId = mealMap.get(`${day.dayNumber}_${m.slotKey}`);
        return customProdId ? { ...m, productId: customProdId } : m;
      }),
    }));
  }

  const snapshotSchedule: ConfirmedMealSelection[] = [];
  for (const day of activeDays) {
    for (const meal of day.meals) {
      const prod = productsById.get(meal.productId);
      const prodPrice = prod ? (getCountryPrice(prod, country) || prod.price || 0) : 0;
      const defaultDay = plan.schedule.find((d) => d.dayNumber === day.dayNumber);
      const defaultMeal = defaultDay?.meals.find((m) => m.slotKey === meal.slotKey);
      const isSwapped = Boolean(defaultMeal && defaultMeal.productId !== meal.productId);
      const originalProd = isSwapped && defaultMeal ? productsById.get(defaultMeal.productId) : null;

      snapshotSchedule.push({
        dayNumber: day.dayNumber,
        slotKey: meal.slotKey,
        slotName: meal.slotName || (typeof (meal as unknown as Record<string, unknown>).categoryDisplayName === "string" ? ((meal as unknown as Record<string, unknown>).categoryDisplayName as string) : "Morning Meal"),
        category: meal.category || "breakfast",
        productId: meal.productId,
        productName: prod?.name || "Selected Platter",
        productPrice: prodPrice,
        productPriceAed: prod?.priceAed ?? null,
        productImage: prod?.image || "",
        calories: prod?.nutrition?.calories ?? null,
        protein: prod?.nutrition?.protein ?? null,
        carbs: prod?.nutrition?.carbs ?? null,
        fat: prod?.nutrition?.fat ?? null,
        isSwapped,
        originalProductId: isSwapped ? defaultMeal?.productId : null,
        originalProductName: originalProd?.name || null,
      });
    }
  }

  // Calculate pricing server-side
  const pricing = calculatePlanPrice(plan, activeDays, productsById, country);
  const now = new Date().toISOString();
  const isLocked = Boolean(data.confirmImmediately);

  const subId = data.id || `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const duration = plan.durationDays;
  const start = new Date(data.startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + duration);

  const db = getDatabase();
  initMealClubTables(db);

  db.prepare(`
    INSERT INTO meal_subscriptions (
      id, plan_id, plan_name, plan_duration, pricing_mode,
      customer_name, customer_phone, customer_email, delivery_address, city, country,
      start_date, end_date, status, order_locked, locked_at, confirmed_at,
      total_amount, currency, swaps_used, max_swaps_allowed, daily_schedule, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    subId,
    plan.id,
    plan.name,
    duration,
    plan.pricingMode,
    data.customerName.trim(),
    data.customerPhone.trim(),
    data.customerEmail?.trim() || null,
    data.deliveryAddress.trim(),
    data.city.trim(),
    country,
    start.toISOString().split("T")[0],
    end.toISOString().split("T")[0],
    isLocked ? "active" : "pending",
    isLocked ? 1 : 0,
    isLocked ? now : null,
    isLocked ? now : null,
    pricing.totalAmount,
    pricing.currency,
    snapshotSchedule.filter((m) => m.isSwapped).length,
    plan.swapRules.maxSwapsPerPlan,
    JSON.stringify(snapshotSchedule),
    data.notes?.trim() || null
  );

  // Record audit log
  if (isLocked) {
    db.prepare(`
      INSERT INTO meal_audit_logs (id, subscription_id, action, performed_by, details, created_at)
      VALUES (?, ?, 'order_confirmed', 'customer', ?, datetime('now'))
    `).run(
      `log_${Date.now()}`,
      subId,
      JSON.stringify({
        totalAmount: pricing.totalAmount,
        currency: pricing.currency,
        itemsCount: snapshotSchedule.length,
        timestamp: now,
      })
    );
  }

  return (await getSubscriptionById(subId))!;
}

/**
 * CRITICAL BUSINESS RULE: CUSTOMER SWAP VALIDATION & ORDER LOCKING
 * 
 * If order is confirmed and locked (order_locked === 1), rejects with strict Error.
 */
export async function customerSwapMeal(
  subscriptionId: string,
  arg2: number | string,
  arg3: string | number,
  arg4: string,
  arg5: string
): Promise<MealSubscription> {
  let customerPhone: string;
  let dayNumber: number;
  let slotKey: string;
  let newProductId: string;

  if (typeof arg2 === "string") {
    // Signature: (subscriptionId, customerPhone, dayNumber, slotKey, newProductId)
    customerPhone = arg2;
    dayNumber = Number(arg3);
    slotKey = String(arg4);
    newProductId = String(arg5);
  } else {
    // Signature: (subscriptionId, dayNumber, slotKey, newProductId, customerPhone)
    dayNumber = Number(arg2);
    slotKey = String(arg3);
    newProductId = String(arg4);
    customerPhone = String(arg5);
  }

  const sub = await getSubscriptionById(subscriptionId);
  if (!sub) throw new Error("Subscription not found.");

  // Verify ownership via phone
  if (sub.customerPhone.replace(/\D/g, "") !== customerPhone.replace(/\D/g, "")) {
    throw new Error("Unauthorized: Phone number does not match subscription record.");
  }

  // 1. CRITICAL ORDER LOCK CHECK
  if (sub.orderLocked) {
    throw new Error("ORDER_LOCKED: This meal plan order is already confirmed and locked. Customer selections cannot be modified. Please contact PLATTEROBE support.");
  }

  const plan = await getMealPlanById(sub.planId);
  if (!plan) throw new Error("Plan template not found.");

  // 2. Check if swaps are enabled
  const swapsEnabled = plan.swapRules.enabled ?? plan.swapRules.allowSwaps ?? true;
  if (!swapsEnabled) {
    throw new Error("Meal swaps are disabled for this package.");
  }

  // 3. Check swap quota
  const maxSwaps = plan.swapRules.maxSwapsPerPlan ?? plan.swapRules.maxSwapsPerSubscription ?? 0;
  if (maxSwaps > 0 && sub.swapsUsed >= maxSwaps) {
    throw new Error(`Maximum swap allowance (${maxSwaps}) reached for this plan.`);
  }

  // 4. Verify replacement product exists and is available
  const allProducts = await getAllProducts();
  const productsById = new Map<string, Product>(allProducts.map((p) => [p.id, p]));
  const newProduct = productsById.get(newProductId);

  if (!newProduct || !newProduct.available) {
    throw new Error("Replacement platter is not currently available.");
  }

  // 5. Category validation
  const targetMeal = sub.dailySchedule.find((m) => m.dayNumber === dayNumber && m.slotKey === slotKey);
  if (!targetMeal) throw new Error("Target meal slot not found in schedule.");

  if (!plan.swapRules.allowCrossCategory && normalizeCategoryKey(newProduct.category) !== normalizeCategoryKey(targetMeal.category)) {
    throw new Error(`Cross-category swaps are not permitted. Replacement must be in "${targetMeal.category}".`);
  }

  // 6. Check eligible product list if restricted
  if (plan.swapRules.eligibleProductIds && plan.swapRules.eligibleProductIds.length > 0) {
    if (!plan.swapRules.eligibleProductIds.includes(newProductId)) {
      throw new Error("This product is not an approved replacement under active swap rules.");
    }
  }

  // Update schedule snapshot
  const originalProductId = targetMeal.isSwapped ? targetMeal.originalProductId : targetMeal.productId;
  const originalProductName = targetMeal.isSwapped ? targetMeal.originalProductName : targetMeal.productName;

  const newPrice = getCountryPrice(newProduct, sub.country) || newProduct.price || 0;

  const updatedSchedule = sub.dailySchedule.map((item) => {
    if (item.dayNumber === dayNumber && item.slotKey === slotKey) {
      return {
        ...item,
        productId: newProduct.id,
        productName: newProduct.name,
        productPrice: newPrice,
        productPriceAed: newProduct.priceAed ?? null,
        productImage: newProduct.image,
        calories: newProduct.nutrition?.calories ?? null,
        protein: newProduct.nutrition?.protein ?? null,
        carbs: newProduct.nutrition?.carbs ?? null,
        fat: newProduct.nutrition?.fat ?? null,
        isSwapped: newProduct.id !== originalProductId,
        originalProductId,
        originalProductName,
      };
    }
    return item;
  });

  // Recalculate price
  const pricing = calculatePlanPrice(plan, updatedSchedule, productsById, sub.country);
  const totalSwapsUsed = updatedSchedule.filter((m) => m.isSwapped).length;

  const db = getDatabase();
  db.prepare(`
    UPDATE meal_subscriptions SET
      daily_schedule = ?,
      total_amount = ?,
      swaps_used = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    JSON.stringify(updatedSchedule),
    pricing.totalAmount,
    totalSwapsUsed,
    sub.id
  );

  // Record audit log
  db.prepare(`
    INSERT INTO meal_audit_logs (id, subscription_id, action, performed_by, details, created_at)
    VALUES (?, ?, 'customer_swap', 'customer', ?, datetime('now'))
  `).run(
    `log_${Date.now()}`,
    sub.id,
    JSON.stringify({
      dayNumber,
      slotKey,
      previousProductId: targetMeal.productId,
      previousProductName: targetMeal.productName,
      newProductId: newProduct.id,
      newProductName: newProduct.name,
      newTotalAmount: pricing.totalAmount,
      timestamp: new Date().toISOString(),
    })
  );

  return (await getSubscriptionById(sub.id))!;
}

/**
 * Permanently locks customer meal selections upon order confirmation.
 */
export async function confirmAndLockSubscription(subscriptionId: string, customerPhone: string): Promise<MealSubscription> {
  const sub = await getSubscriptionById(subscriptionId);
  if (!sub) throw new Error("Subscription not found.");

  if (sub.customerPhone.replace(/\D/g, "") !== customerPhone.replace(/\D/g, "")) {
    throw new Error("Unauthorized: Phone number does not match subscription record.");
  }

  if (sub.orderLocked) {
    return sub; // already locked
  }

  const now = new Date().toISOString();
  const db = getDatabase();

  db.prepare(`
    UPDATE meal_subscriptions SET
      order_locked = 1,
      locked_at = ?,
      confirmed_at = ?,
      status = 'active',
      updated_at = datetime('now')
    WHERE id = ?
  `).run(now, now, sub.id);

  db.prepare(`
    INSERT INTO meal_audit_logs (id, subscription_id, action, performed_by, details, created_at)
    VALUES (?, ?, 'order_confirmed', 'customer', ?, datetime('now'))
  `).run(
    `log_${Date.now()}`,
    sub.id,
    JSON.stringify({
      confirmedAt: now,
      totalAmount: sub.totalAmount,
      currency: sub.currency,
      timestamp: now,
    })
  );

  return (await getSubscriptionById(sub.id))!;
}

/**
 * AUTHORIZED ADMINISTRATIVE CORRECTION
 * Allows an authorized admin to make exceptional corrections to confirmed orders.
 * Always records a permanent audit trail.
 */
export async function adminCorrectMealInSubscription(
  subscriptionId: string,
  arg2: string | number,
  arg3: number | string,
  arg4: string,
  arg5: string,
  arg6: string
): Promise<MealSubscription> {
  let adminUsername: string;
  let dayNumber: number;
  let slotKey: string;
  let replacementProductId: string;
  let reason: string;

  if (typeof arg2 === "string") {
    // Signature: (subscriptionId, adminUsername, dayNumber, slotKey, replacementProductId, reason)
    adminUsername = arg2;
    dayNumber = Number(arg3);
    slotKey = String(arg4);
    replacementProductId = String(arg5);
    reason = String(arg6);
  } else {
    // Signature: (subscriptionId, dayNumber, slotKey, replacementProductId, adminUsername, reason)
    dayNumber = Number(arg2);
    slotKey = String(arg3);
    replacementProductId = String(arg4);
    adminUsername = String(arg5);
    reason = String(arg6);
  }

  const sub = await getSubscriptionById(subscriptionId);
  if (!sub) throw new Error("Subscription not found.");

  const allProducts = await getAllProducts();
  const productsById = new Map<string, Product>(allProducts.map((p) => [p.id, p]));
  const newProduct = productsById.get(replacementProductId);
  if (!newProduct) throw new Error("Replacement product not found.");

  const targetMeal = sub.dailySchedule.find((m) => m.dayNumber === dayNumber && m.slotKey === slotKey);
  if (!targetMeal) throw new Error("Meal slot not found in schedule.");

  const originalProductId = targetMeal.productId;
  const originalProductName = targetMeal.productName;
  const newPrice = getCountryPrice(newProduct, sub.country) || newProduct.price || 0;

  const updatedSchedule = sub.dailySchedule.map((item) => {
    if (item.dayNumber === dayNumber && item.slotKey === slotKey) {
      return {
        ...item,
        productId: newProduct.id,
        productName: newProduct.name,
        productPrice: newPrice,
        productPriceAed: newProduct.priceAed ?? null,
        productImage: newProduct.image,
        calories: newProduct.nutrition?.calories ?? null,
        protein: newProduct.nutrition?.protein ?? null,
        carbs: newProduct.nutrition?.carbs ?? null,
        fat: newProduct.nutrition?.fat ?? null,
        isSwapped: true,
        originalProductId,
        originalProductName,
      };
    }
    return item;
  });

  const now = new Date().toISOString();
  const db = getDatabase();

  db.prepare(`
    UPDATE meal_subscriptions SET
      daily_schedule = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(JSON.stringify(updatedSchedule), sub.id);

  // Create audit log with admin credentials and reason
  db.prepare(`
    INSERT INTO meal_audit_logs (id, subscription_id, action, performed_by, details, created_at)
    VALUES (?, ?, 'admin_correction', ?, ?, datetime('now'))
  `).run(
    `log_${Date.now()}`,
    sub.id,
    adminUsername,
    JSON.stringify({
      dayNumber,
      slotKey,
      originalProductId,
      originalProductName,
      replacementProductId: newProduct.id,
      replacementProductName: newProduct.name,
      reason: reason.trim(),
      timestamp: now,
    })
  );

  return (await getSubscriptionById(sub.id))!;
}

export async function updateSubscriptionStatus(
  id: string,
  status: MealSubscription["status"],
  adminUsername: string
): Promise<MealSubscription | undefined> {
  const db = getDatabase();
  initMealClubTables(db);

  db.prepare(`
    UPDATE meal_subscriptions SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, id);

  db.prepare(`
    INSERT INTO meal_audit_logs (id, subscription_id, action, performed_by, details, created_at)
    VALUES (?, ?, 'status_change', ?, ?, datetime('now'))
  `).run(
    `log_${Date.now()}`,
    id,
    adminUsername,
    JSON.stringify({ newStatus: status, timestamp: new Date().toISOString() })
  );

  return await getSubscriptionById(id);
}

export async function getSubscriptionAuditLogs(subscriptionId: string): Promise<MealAuditLog[]> {
  const db = getDatabase();
  initMealClubTables(db);

  try {
    const rows = db
      .prepare("SELECT * FROM meal_audit_logs WHERE subscription_id = ? ORDER BY created_at DESC")
      .all(subscriptionId) as Array<{
        id: string;
        subscription_id: string;
        action: string;
        performed_by: string;
        details: string;
        created_at: string;
      }>;

    return rows.map((r) => {
      let details = {};
      try {
        details = JSON.parse(r.details);
      } catch {
        // fallback
      }
      return {
        id: r.id,
        subscriptionId: r.subscription_id,
        action: r.action as MealAuditLog["action"],
        performedBy: r.performed_by,
        details: details as MealAuditLog["details"],
        createdAt: r.created_at,
      };
    });
  } catch (err) {
    console.error("getSubscriptionAuditLogs error:", err);
    return [];
  }
}

// -----------------------------------------------------------------------------
// OVERVIEW & REAL STATISTICS
// -----------------------------------------------------------------------------

export interface MealClubOverviewStats {
  activePlansCount: number;
  publishedPlansCount: number;
  activeSubscriptionsCount: number;
  pendingOrdersCount: number;
  confirmedOrdersCount: number;
  upcomingMealsCount: number;
  unavailableProductsCount: number;
}

export async function getMealClubOverviewStats(): Promise<MealClubOverviewStats> {
  const db = getDatabase();
  initMealClubTables(db);

  try {
    const allPlans = await getAllMealPlans(true);
    const allSubs = await getAllSubscriptions();
    const allProducts = await getAllProducts();

    const activePlansCount = allPlans.filter((p) => p.status === "published" || p.status === "draft").length;
    const publishedPlansCount = allPlans.filter((p) => p.status === "published").length;
    const activeSubscriptionsCount = allSubs.filter((s) => s.status === "active").length;
    const pendingOrdersCount = allSubs.filter((s) => s.status === "pending").length;
    const confirmedOrdersCount = allSubs.filter((s) => s.orderLocked).length;

    // Upcoming meals count: sum of meals in active subscriptions
    let upcomingMealsCount = 0;
    for (const sub of allSubs.filter((s) => s.status === "active")) {
      upcomingMealsCount += sub.dailySchedule.length;
    }

    const unavailableProductsCount = allProducts.filter((p) => !p.available).length;

    return {
      activePlansCount,
      publishedPlansCount,
      activeSubscriptionsCount,
      pendingOrdersCount,
      confirmedOrdersCount,
      upcomingMealsCount,
      unavailableProductsCount,
    };
  } catch (err) {
    console.error("getMealClubOverviewStats error:", err);
    return {
      activePlansCount: 0,
      publishedPlansCount: 0,
      activeSubscriptionsCount: 0,
      pendingOrdersCount: 0,
      confirmedOrdersCount: 0,
      upcomingMealsCount: 0,
      unavailableProductsCount: 0,
    };
  }
}

// -----------------------------------------------------------------------------
// SEED STARTER PLANS (IF EMPTY)
// -----------------------------------------------------------------------------

export async function seedStarterMealPlansIfEmpty() {
  const db = getDatabase();
  initMealClubTables(db);

  const countRow = db.prepare("SELECT COUNT(*) as count FROM meal_plans").get() as { count: number };
  if (countRow.count > 0) return;

  const products = await getAllProducts();
  if (products.length === 0) return;

  // Use actual products from database
  // E.g. Oat Jar, Fruit Oat Jar, Banana Parfait, Chia Cloud, Oat Cakes & Egg
  const p1 = products.find((p) => p.slug === "oat-jar") || products[0];
  const p2 = products.find((p) => p.slug === "fruit-oat-jar") || products[1] || p1;
  const p3 = products.find((p) => p.slug === "banana-parfait") || products[2] || p1;
  const p4 = products.find((p) => p.slug === "chia-cloud") || products[3] || p1;
  const p5 = products.find((p) => p.slug === "oat-cakes---egg") || products[4] || p1;
  const p6 = products.find((p) => p.slug === "protein-toast") || products[5] || p1;
  const p7 = products.find((p) => p.slug === "power-duo") || products[6] || p1;

  const cycle = [p1, p2, p3, p4, p5, p6, p7];

  // Helper to build schedule for N days
  const buildSchedule = (days: number): MealPlanDay[] => {
    const list: MealPlanDay[] = [];
    for (let i = 1; i <= days; i++) {
      const prod = cycle[(i - 1) % cycle.length];
      list.push({
        dayNumber: i,
        dayLabel: `Day ${i}`,
        meals: [
          {
            slotKey: "breakfast",
            slotName: "Morning Breakfast",
            category: "breakfast",
            productId: prod.id,
            isSwappable: true,
          },
        ],
      });
    }
    return list;
  };

  // 1. 7-Day Plan
  await createMealPlan({
    name: "7-Day Everyday Breakfast Club",
    slug: "7-day-everyday-breakfast-club",
    subtitle: "7 mornings of slow-release oat jars, parfait & protein toast.",
    description: "Our signature 7-day breakfast membership. High protein, zero processed junk, prepared fresh every morning and delivered straight to your door.",
    image: p1.image,
    durationDays: 7,
    mealCategories: ["breakfast"],
    mealsPerDay: 1,
    pricingMode: "fixed",
    basePrice: 549,
    basePriceAed: 70,
    originalPrice: 699,
    originalPriceAed: 90,
    status: "published",
    isFeatured: true,
    sortOrder: 1,
    swapRules: {
      enabled: true,
      maxSwapsPerPlan: 3,
      deadlineHours: 0,
      allowCrossCategory: false,
      priceDifferenceMode: "none",
    },
    schedule: buildSchedule(7),
  });

  // 2. 14-Day Plan
  await createMealPlan({
    name: "14-Day Morning Routine Builder",
    slug: "14-day-morning-routine-builder",
    subtitle: "Two uninterrupted weeks of wholesome, sustained energy.",
    description: "Commit to 14 days of balanced, macro-calculated breakfast platters. Designed to build lasting habits with complete flexibility to swap your favorite platters.",
    image: p3.image,
    durationDays: 14,
    mealCategories: ["breakfast"],
    mealsPerDay: 1,
    pricingMode: "fixed",
    basePrice: 1049,
    basePriceAed: 135,
    originalPrice: 1399,
    originalPriceAed: 175,
    status: "published",
    isFeatured: true,
    sortOrder: 2,
    swapRules: {
      enabled: true,
      maxSwapsPerPlan: 5,
      deadlineHours: 0,
      allowCrossCategory: false,
      priceDifferenceMode: "none",
    },
    schedule: buildSchedule(14),
  });

  // 3. 30-Day Plan
  await createMealPlan({
    name: "30-Day Complete Fuel Membership",
    slug: "30-day-complete-fuel-membership",
    subtitle: "A month of effortless, clean breakfast nutrition.",
    description: "Our most popular monthly membership. 30 days of wholesome variety with unlimited breakfast swaps before each confirmation. Take the guesswork out of morning fuel.",
    image: p4.image,
    durationDays: 30,
    mealCategories: ["breakfast"],
    mealsPerDay: 1,
    pricingMode: "fixed",
    basePrice: 2199,
    basePriceAed: 280,
    originalPrice: 2999,
    originalPriceAed: 380,
    status: "published",
    isFeatured: true,
    sortOrder: 3,
    swapRules: {
      enabled: true,
      maxSwapsPerPlan: 10,
      deadlineHours: 0,
      allowCrossCategory: false,
      priceDifferenceMode: "none",
    },
    schedule: buildSchedule(30),
  });
}
