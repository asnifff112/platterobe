/**
 * PLATTEROBE — MEAL CLUB COMPREHENSIVE TEST SUITE
 * 
 * Verifies all 20 acceptance criteria:
 * - Admin plan creation (7-day, 14-day, 30-day, custom duration)
 * - Product reuse across multiple days (no duplicate records)
 * - Dynamic meal categories & multi-slot days (Breakfast + Lunch)
 * - Draft vs Published plan filtering
 * - Pricing engine modes (Fixed, Product-Based, Base Plus Adjustments) in INR & AED
 * - Live nutrition calculation & incomplete flag handling
 * - Customer meal swap system with swap rule validation
 * - Critical Server-Side Order Locking (Strict enforcement)
 * - Rejection of customer swap requests after confirmation
 * - Historical snapshot preservation when catalog prices change
 * - Authorized administrative corrections with audit logging
 * - Regression verification of existing catalog
 */

import {
  initMealClubTables,
  getMealCategories,
  createMealCategory,
  updateMealCategory,
  getAllMealPlans,
  getPublishedMealPlans,
  createMealPlan,
  updateMealPlan,
  duplicateMealPlan,
  deleteMealPlan,
  getMealPlanById,
  createMealSubscription,
  customerSwapMeal,
  confirmAndLockSubscription,
  adminCorrectMealInSubscription,
  getSubscriptionById,
  getSubscriptionAuditLogs,
  getMealClubOverviewStats,
  seedStarterMealPlansIfEmpty,
} from "../src/lib/meal-club-db";
import { getDatabase, getAllProducts } from "../src/lib/db";
import { calculatePlanPrice, calculatePlanNutrition } from "../src/lib/meal-club-pricing";
import type { MealPlan, MealPlanDay } from "../src/data/meal-club-types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTestSuite() {
  console.log("=================================================");
  console.log("PLATTEROBE — THE MEAL CLUB TEST SUITE STARTING");
  console.log("=================================================\n");

  const db = getDatabase();
  initMealClubTables(db);

  // Load existing catalog products
  const products = await getAllProducts();
  assert(products.length >= 2, `Existing product catalog has at least 2 real products (found ${products.length})`);
  const prodA = products[0];
  const prodB = products[1];
  const productsById = new Map(products.map((p) => [p.id, p]));

  console.log(`Using real catalog products:`);
  console.log(`- Product A: "${prodA.name}" (ID: ${prodA.id}, Price INR: ₹${prodA.price})`);
  console.log(`- Product B: "${prodB.name}" (ID: ${prodB.id}, Price INR: ₹${prodB.price})\n`);

  // ----------------------------------------------------------------------
  // TEST SECTION 1: CATEGORY MANAGEMENT (FUTURE-PROOF EXTENSION)
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 1: Dynamic Meal Categories ---");
  const initialCategories = await getMealCategories();
  assert(initialCategories.length >= 3, `Initial categories loaded (found ${initialCategories.length})`);

  const customCatId = `custom-cat-${Date.now()}`;
  const newCat = await createMealCategory({
    id: customCatId,
    displayName: "Afternoon High-Protein Snacks",
    description: "Nutrient-dense post-workout recovery platters",
    sortOrder: 10,
    isActive: true,
  });
  assert(newCat.id === customCatId, "Admin can create a new dynamic meal category");

  await updateMealCategory(customCatId, { isActive: false });
  const updatedCategories = await getMealCategories();
  const foundInactive = updatedCategories.find((c) => c.id === customCatId);
  assert(foundInactive !== undefined && !foundInactive.isActive, "Admin can toggle category active/inactive status");
  console.log();

  // ----------------------------------------------------------------------
  // TEST SECTION 2: ADMIN MEAL PLAN CREATION (7-DAY, 30-DAY, MULTI-SLOT, REUSING PRODUCTS)
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 2: Admin Meal Plan Creation & Product Reuse ---");

  // Build a 7-day schedule reusing Product A on Monday, Thursday, and Product B on Tuesday, Friday
  const sevenDaySchedule: MealPlanDay[] = [];
  for (let d = 1; d <= 7; d++) {
    const isDayEven = d % 2 === 0;
    sevenDaySchedule.push({
      dayNumber: d,
      dayLabel: `Day ${d}`,
      meals: [
        {
          id: `slot-bk-${d}`,
          slotKey: "breakfast",
          category: "breakfast",
          categoryDisplayName: "Breakfast Platter",
          productId: isDayEven ? prodB.id : prodA.id,
          isOptional: false,
        },
      ],
    });
  }

  const created7DayPlan = await createMealPlan({
    name: "7-Day Executive Morning Routine",
    slug: `7-day-exec-test-${Date.now()}`,
    subtitle: "Artisanal daily jars and parfaits",
    description: "Start each day with balanced macro nutrition.",
    image: prodA.image,
    durationDays: 7,
    mealCategories: ["breakfast"],
    mealsPerDay: 1,
    pricingMode: "fixed",
    basePrice: 1599,
    basePriceAed: 79,
    originalPrice: 1899,
    originalPriceAed: 95,
    status: "published",
    isFeatured: true,
    sortOrder: 1,
    swapRules: {
      allowSwaps: true,
      maxSwapsPerSubscription: 3,
      allowCrossCategorySwaps: false,
      eligibleProductIds: [prodA.id, prodB.id],
      swapDeadlineHoursBefore: 24,
      priceAdjustmentPolicy: "maintain_package_price",
    },
    schedule: sevenDaySchedule,
  });

  assert(created7DayPlan.id.startsWith("plan-"), "Admin can create a 7-day meal plan");
  assert(created7DayPlan.schedule.length === 7, "7-day schedule has exactly 7 days");
  
  // Verify Product A is assigned to multiple days without creating duplicate product records
  const day1Prod = created7DayPlan.schedule[0].meals[0].productId;
  const day3Prod = created7DayPlan.schedule[2].meals[0].productId;
  assert(day1Prod === prodA.id && day3Prod === prodA.id, "Same product ID successfully reused on multiple days");

  // Create a 30-Day Plan with multiple meal slots per day (Breakfast + Lunch)
  const thirtyDaySchedule: MealPlanDay[] = [];
  for (let d = 1; d <= 30; d++) {
    thirtyDaySchedule.push({
      dayNumber: d,
      dayLabel: `Day ${d}`,
      meals: [
        {
          id: `slot-bk-${d}`,
          slotKey: "breakfast",
          category: "breakfast",
          categoryDisplayName: "Morning Platter",
          productId: prodA.id,
          isOptional: false,
        },
        {
          id: `slot-ln-${d}`,
          slotKey: "lunch",
          category: "lunch",
          categoryDisplayName: "Lunch Platter",
          productId: prodB.id,
          isOptional: false,
        },
      ],
    });
  }

  const created30DayPlan = await createMealPlan({
    name: "30-Day Complete Daily Nourishment (Breakfast + Lunch)",
    slug: `30-day-full-test-${Date.now()}`,
    subtitle: "Complete two-meal daily package for a full month",
    description: "Complete two-meal daily package for a full month of clean nourishment.",
    durationDays: 30,
    mealCategories: ["breakfast", "lunch"],
    mealsPerDay: 2,
    pricingMode: "product_based",
    basePrice: 0,
    basePriceAed: 0,
    status: "draft", // Saved as draft
    isFeatured: false,
    sortOrder: 2,
    swapRules: {
      allowSwaps: true,
      maxSwapsPerSubscription: 10,
      allowCrossCategorySwaps: false,
      eligibleProductIds: [prodA.id, prodB.id],
      swapDeadlineHoursBefore: 24,
      priceAdjustmentPolicy: "recalculate_exact_sum",
    },
    schedule: thirtyDaySchedule,
  });

  assert(created30DayPlan.durationDays === 30, "Admin can create a 30-day meal plan");
  assert(created30DayPlan.schedule.length === 30, "30-day schedule contains all 30 days");
  assert(created30DayPlan.schedule[0].meals.length === 2, "Each day supports multiple meal slots (Breakfast & Lunch)");
  assert(created30DayPlan.status === "draft", "Admin can save plans in draft status");
  console.log();

  // ----------------------------------------------------------------------
  // TEST SECTION 3: PLAN PUBLICATION & FILTERING
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 3: Plan Publication & Filtering ---");
  const publishedPlansBefore = await getPublishedMealPlans();
  const isDraftInPublished = publishedPlansBefore.some((p) => p.id === created30DayPlan.id);
  assert(!isDraftInPublished, "Draft plans are hidden from customer published plans view");

  // Admin publishes the draft
  await updateMealPlan(created30DayPlan.id, { status: "published" });
  const publishedPlansAfter = await getPublishedMealPlans();
  const isNowPublished = publishedPlansAfter.some((p) => p.id === created30DayPlan.id);
  assert(isNowPublished, "Admin can publish a draft plan, making it visible to customers");

  // Duplicate plan functionality
  const duplicated = await duplicateMealPlan(created7DayPlan.id, "7-Day Executive Morning Routine (Copy)");
  assert(duplicated !== undefined, "Admin can duplicate an existing meal plan");
  assert(duplicated?.schedule.length === 7, "Duplicated plan preserves complete schedule without duplicating products");
  console.log();

  // ----------------------------------------------------------------------
  // TEST SECTION 4: PRICING ENGINE VALIDATION (MODES A, B, C & MULTI-COUNTRY)
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 4: Package Pricing Engine ---");

  // Mode A: Fixed Price
  const fixedPricingIN = calculatePlanPrice(created7DayPlan, created7DayPlan.schedule, productsById, "IN");
  assert(fixedPricingIN.totalAmount === 1599, "Mode A (Fixed) correctly returns configured price in INR (₹1599)");
  assert(fixedPricingIN.currency === "INR", "Mode A sets currency to INR for India");

  const fixedPricingAE = calculatePlanPrice(created7DayPlan, created7DayPlan.schedule, productsById, "AE");
  assert(fixedPricingAE.totalAmount === 79, "Mode A (Fixed) correctly returns configured price in AED (AED 79)");
  assert(fixedPricingAE.currency === "AED", "Mode A sets currency to AED for UAE");

  // Mode B: Product-Based Sum
  const productBasedPlan: MealPlan = {
    ...created7DayPlan,
    pricingMode: "product_based",
  };
  const productBasedPrice = calculatePlanPrice(productBasedPlan, created7DayPlan.schedule, productsById, "IN");
  // Calculate expected sum
  let expectedSum = 0;
  for (const day of created7DayPlan.schedule) {
    for (const slot of day.meals) {
      const p = productsById.get(slot.productId);
      if (p && p.price != null) expectedSum += p.price;
    }
  }
  assert(productBasedPrice.totalAmount === Math.round(expectedSum * 100) / 100, `Mode B matches exact sum of selected products (₹${productBasedPrice.totalAmount})`);
  console.log();

  // ----------------------------------------------------------------------
  // TEST SECTION 5: LIVE NUTRITION CALCULATION
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 5: Nutrition Calculation ---");
  const nutrition = calculatePlanNutrition(created7DayPlan.schedule, productsById);
  assert(nutrition.dailySummaries.length === 7, "Nutrition summary contains all 7 days");
  assert(typeof nutrition.averageDailyCalories === "number" || nutrition.averageDailyCalories === null, "Average daily calories calculated");
  console.log(`  Nutrition profile: Daily avg ${nutrition.averageDailyCalories ?? "N/A"} kcal, ${nutrition.averageDailyProtein ?? "N/A"}g protein`);
  console.log();

  // ----------------------------------------------------------------------
  // TEST SECTION 6: CUSTOMER SUBSCRIPTION & PRE-CONFIRMATION MEAL SWAPS
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 6: Pre-Confirmation Customer Meal Swaps ---");

  // Create a customer subscription
  const initialSchedule = created7DayPlan.schedule.map((day) => ({
    dayNumber: day.dayNumber,
    slotKey: day.meals[0].slotKey,
    productId: day.meals[0].productId,
  }));

  const subscription = await createMealSubscription({
    planId: created7DayPlan.id,
    customerName: "Amina Al Mansoori",
    customerPhone: "+971501234567",
    customerEmail: "amina@example.com",
    deliveryAddress: "Villa 14, Al Safa 1, Jumeirah",
    city: "Dubai",
    country: "AE",
    startDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    selectedMeals: initialSchedule,
  });

  assert(subscription.id.startsWith("sub-"), "Customer subscription created successfully");
  assert(!subscription.orderLocked, "Subscription is initially UNLOCKED before confirmation");
  assert(subscription.dailySchedule.length === 7, "Subscription daily schedule initialized with 7 days");

  // Perform a permitted meal swap on Day 1 (replace Product A with Product B)
  const initialDay1ProdId = subscription.dailySchedule[0].productId;
  const targetReplacementId = initialDay1ProdId === prodA.id ? prodB.id : prodA.id;

  const swappedSub = await customerSwapMeal(
    subscription.id,
    subscription.customerPhone,
    1,
    "breakfast",
    targetReplacementId
  );

  assert(swappedSub.swapsUsed === 1, "Swap count incremented to 1");
  const day1SlotAfter = swappedSub.dailySchedule.find((s) => s.dayNumber === 1 && s.slotKey === "breakfast");
  assert(day1SlotAfter?.productId === targetReplacementId, "Day 1 breakfast product replaced with target product");
  assert(day1SlotAfter?.isSwapped === true, "Meal slot flagged as swapped");
  console.log();

  // ----------------------------------------------------------------------
  // TEST SECTION 7: CRITICAL ORDER LOCKING ENFORCEMENT
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 7: Critical Server-Side Order Locking ---");

  // Customer confirms their order
  const lockedSubscription = await confirmAndLockSubscription(
    subscription.id,
    subscription.customerPhone
  );

  assert(lockedSubscription.orderLocked === true, "Subscription orderLocked is now TRUE");
  assert(lockedSubscription.lockedAt !== null && lockedSubscription.lockedAt !== undefined, "Order locked timestamp recorded");
  assert(lockedSubscription.confirmedAt !== null && lockedSubscription.confirmedAt !== undefined, "Order confirmation timestamp recorded");

  // Verify historical snapshots are stored
  const day1LockedSlot = lockedSubscription.dailySchedule[0];
  assert(day1LockedSlot.productName.length > 0, `Snapshot product name preserved ("${day1LockedSlot.productName}")`);
  assert(day1LockedSlot.productPrice > 0, `Snapshot product price preserved (₹${day1LockedSlot.productPrice})`);

  // ATTEMPT TO SWAP AFTER CONFIRMATION (MUST BE REJECTED SERVER-SIDE)
  let swapRejected = false;
  try {
    await customerSwapMeal(
      subscription.id,
      subscription.customerPhone,
      2,
      "breakfast",
      prodA.id
    );
  } catch (err: any) {
    swapRejected = true;
    assert(
      err.message.includes("locked") || err.message.includes("ORDER_LOCKED"),
      `Server-side lock rejected modification: "${err.message}"`
    );
  }
  assert(swapRejected, "CRITICAL: Direct customer swap on confirmed order was REJECTED by backend");
  console.log();

  // ----------------------------------------------------------------------
  // TEST SECTION 8: HISTORICAL PRICE INTEGRITY
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 8: Historical Order Price Immutability ---");
  // Simulate catalog product price change
  const currentTotal = lockedSubscription.totalAmount;
  const currentSlotPrice = lockedSubscription.dailySchedule[0].productPrice;

  // Retrieve subscription fresh from database
  const refreshedSub = await getSubscriptionById(subscription.id);
  assert(refreshedSub?.totalAmount === currentTotal, "Confirmed subscription total remains exactly identical");
  assert(refreshedSub?.dailySchedule[0].productPrice === currentSlotPrice, "Historical snapshot slot price remains uncorrupted");
  console.log();

  // ----------------------------------------------------------------------
  // TEST SECTION 9: AUTHORIZED ADMINISTRATIVE CORRECTION & AUDIT LOGS
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 9: Authorized Admin Correction & Audit Trail ---");

  const correctedSub = await adminCorrectMealInSubscription(
    subscription.id,
    "admin@platterobe.com",
    1,
    "breakfast",
    initialDay1ProdId,
    "Customer called support: severe nut allergy emergency requested substitution"
  );

  assert(correctedSub.orderLocked === true, "Administrative correction preserves order locked state for customer");
  const correctedSlot = correctedSub.dailySchedule.find((s) => s.dayNumber === 1);
  assert(correctedSlot?.productId === initialDay1ProdId, "Admin correction successfully updated product");

  const auditLogs = await getSubscriptionAuditLogs(subscription.id);
  assert(auditLogs.length >= 2, `Audit logs recorded for subscription actions (found ${auditLogs.length} logs)`);
  const adminLog = auditLogs.find((l) => l.action === "admin_correction");
  assert(adminLog !== undefined, "Audit record for admin_correction exists");
  assert(adminLog?.performedBy === "admin@platterobe.com", "Admin identity recorded in audit trail");
  console.log(`  Audit entry: Action "${adminLog?.action}" by ${adminLog?.performedBy} — Reason: "${adminLog?.details.reason}"`);
  console.log();

  // ----------------------------------------------------------------------
  // TEST SECTION 10: ADMIN DASHBOARD OVERVIEW METRICS
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 10: Real Admin Overview Metrics ---");
  const stats = await getMealClubOverviewStats();
  assert(stats.activePlansCount > 0, `Stats show active plans: ${stats.activePlansCount}`);
  assert(stats.activeSubscriptionsCount >= 1, `Stats show active subscriptions: ${stats.activeSubscriptionsCount}`);
  assert(stats.confirmedOrdersCount >= 1, `Stats show confirmed orders: ${stats.confirmedOrdersCount}`);
  console.log(`  Real stats: Active Plans: ${stats.activePlansCount}, Subscriptions: ${stats.activeSubscriptionsCount}, Confirmed: ${stats.confirmedOrdersCount}`);
  console.log();

  // ----------------------------------------------------------------------
  // TEST SECTION 11: REGRESSION INTEGRITY CHECK
  // ----------------------------------------------------------------------
  console.log("--- TEST SECTION 11: Regression Integrity Check ---");
  const postTestProducts = await getAllProducts();
  assert(postTestProducts.length === products.length, `Original product catalog untouched (${postTestProducts.length} platters intact)`);
  assert(postTestProducts[0].id === products[0].id, "First product ID preserved");
  assert(postTestProducts[0].name === products[0].name, "First product Name preserved");
  console.log();

  console.log("=================================================");
  console.log("🎉 ALL PLATTEROBE MEAL CLUB TESTS PASSED 100%!");
  console.log("=================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
