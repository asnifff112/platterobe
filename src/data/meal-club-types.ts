/**
 * PLATTEROBE — THE MEAL CLUB & SUBSCRIPTION SYSTEM
 * Core Types & Data Contracts
 */

export interface MealCategory {
  id: string;
  displayName: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export type PricingMode = "fixed" | "product_based" | "base_plus_adjustments";

export interface SwapRules {
  enabled?: boolean;
  maxSwapsPerPlan?: number; // 0 means unlimited
  deadlineHours?: number; // e.g. 24 hours before delivery or 0 for anytime before confirmation
  allowCrossCategory?: boolean;
  priceDifferenceMode?: "none" | "charge_difference" | "strict_equal_or_less";
  eligibleProductIds?: string[] | null; // null/empty = all active products in category
  // Optional aliases for compatibility
  allowSwaps?: boolean;
  maxSwapsPerSubscription?: number;
  swapDeadlineHoursBefore?: number;
  allowCrossCategorySwaps?: boolean;
  priceAdjustmentPolicy?: string;
}

export interface MealPlanItemAssignment {
  id?: string;
  slotKey: string; // e.g. "breakfast", "lunch", "dinner", "snack_1"
  slotName?: string; // e.g. "Morning Breakfast", "Midday Fuel"
  category: string; // category key (e.g. "breakfast", "lunch")
  productId: string; // References existing PLATTEROBE product
  isSwappable?: boolean;
  isOptional?: boolean;
  categoryDisplayName?: string;
  eligibleSwapProductIds?: string[] | null;
}

export interface MealPlanDay {
  dayNumber: number; // 1 to N
  dayLabel: string; // e.g. "Day 1 (Monday)"
  meals: MealPlanItemAssignment[];
}

export type MealPlanStatus = "draft" | "published" | "archived";

export interface MealPlan {
  id: string;
  name: string;
  slug: string;
  subtitle?: string;
  description: string;
  image?: string;
  durationDays: number; // 7, 14, 15, 20, 30, or custom
  mealCategories: string[]; // e.g. ["breakfast"], ["breakfast", "lunch"]
  mealsPerDay: number;
  pricingMode: PricingMode;
  basePrice: number; // INR
  basePriceAed?: number | null; // AED
  originalPrice?: number | null;
  originalPriceAed?: number | null;
  status: MealPlanStatus;
  isFeatured: boolean;
  sortOrder: number;
  swapRules: SwapRules;
  schedule: MealPlanDay[];
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus = "pending" | "active" | "paused" | "completed" | "cancelled";

export interface ConfirmedMealSelection {
  dayNumber: number;
  date?: string;
  slotKey: string;
  slotName: string;
  category: string;
  productId: string;
  productName: string; // Historical snapshot
  productPrice: number; // Historical snapshot
  productPriceAed?: number | null;
  productImage: string; // Historical snapshot
  calories: number | null; // Historical snapshot
  protein: string | null; // Historical snapshot
  carbs?: string | null;
  fat?: string | null;
  isSwapped: boolean;
  originalProductId?: string | null;
  originalProductName?: string | null;
}

export interface MealSubscription {
  id: string;
  planId: string;
  planName: string;
  planDuration: number;
  pricingMode: PricingMode;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryAddress: string;
  city: string;
  country: "IN" | "AE";
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  orderLocked: boolean; // TRUE once order is confirmed; locks customer modifications
  lockedAt?: string | null;
  confirmedAt?: string | null;
  totalAmount: number;
  currency: "INR" | "AED";
  swapsUsed: number;
  maxSwapsAllowed: number;
  dailySchedule: ConfirmedMealSelection[];
  snapshotSchedule?: ConfirmedMealSelection[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealAuditLog {
  id: string;
  subscriptionId: string;
  action: "order_confirmed" | "customer_swap" | "admin_correction" | "status_change";
  performedBy: string; // "customer" or admin username / email
  details: {
    dayNumber?: number;
    slotKey?: string;
    originalProductId?: string;
    originalProductName?: string;
    newProductId?: string;
    newProductName?: string;
    reason?: string;
    timestamp: string;
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface NutritionDailySummary {
  dayNumber: number;
  calories: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  isIncomplete: boolean;
}

export interface PlanNutritionSummary {
  averageDailyCalories: number | null;
  averageDailyProtein: number | null;
  averageDailyCarbs: number | null;
  averageDailyFat: number | null;
  totalPlanCalories: number | null;
  dailySummaries: NutritionDailySummary[];
  isIncomplete: boolean;
}
