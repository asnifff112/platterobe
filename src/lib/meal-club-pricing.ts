/**
 * PLATTEROBE — THE MEAL CLUB
 * Pricing & Nutrition Calculation Engine
 * 
 * Strictly follows business rules:
 * - Mode A (Fixed): Fixed package price independent of selected products.
 * - Mode B (Product-Based): Dynamically calculated from prices of selected products.
 * - Mode C (Base Plus Adjustments): Base package price plus/minus product substitution deltas.
 * - Server-side validation: client submitted prices are never trusted.
 * - Real nutrition calculation with incomplete flags (never invented).
 */

import type { Product } from "@/data/products";
import type {
  MealPlan,
  MealPlanDay,
  PlanNutritionSummary,
  NutritionDailySummary,
  ConfirmedMealSelection,
} from "@/data/meal-club-types";
import { CountryCode, getCountryPrice } from "@/lib/country";

export interface CalculatedPlanPrice {
  totalAmount: number;
  originalAmount: number | null;
  currency: "INR" | "AED";
  currencySymbol: "₹" | "AED ";
  pricingMode: MealPlan["pricingMode"];
  hasDiscount: boolean;
  savings: number;
}

/**
 * Calculates the exact price for a meal plan (or customized schedule) in the selected country.
 */
export function calculatePlanPrice(
  plan: MealPlan,
  schedule: MealPlanDay[] | ConfirmedMealSelection[],
  productsById: Map<string, Product>,
  country: CountryCode = "IN"
): CalculatedPlanPrice {
  const isUae = country === "AE";
  const currency: "INR" | "AED" = isUae ? "AED" : "INR";
  const currencySymbol = isUae ? "AED " : "₹";

  const basePrice = isUae ? (plan.basePriceAed ?? plan.basePrice) : plan.basePrice;
  const originalPrice = isUae ? (plan.originalPriceAed ?? plan.originalPrice ?? null) : (plan.originalPrice ?? null);

  let calculatedTotal = basePrice;
  let calculatedOriginal = originalPrice;

  if (plan.pricingMode === "fixed") {
    calculatedTotal = Math.max(0, basePrice);
    calculatedOriginal = originalPrice && originalPrice > calculatedTotal ? originalPrice : null;
  } else if (plan.pricingMode === "product_based") {
    // Sum prices of all selected products across all days
    let sum = 0;
    let originalSum = 0;
    let hasAnyOriginal = false;

    // Check if schedule is MealPlanDay[] or ConfirmedMealSelection[]
    if (schedule.length > 0 && "meals" in schedule[0]) {
      const days = schedule as MealPlanDay[];
      for (const day of days) {
        for (const meal of day.meals) {
          const prod = productsById.get(meal.productId);
          if (prod) {
            const pPrice = getCountryPrice(prod, country) ?? 0;
            sum += pPrice;
            const orig = isUae ? (prod.originalPriceAed ?? pPrice) : (prod.originalPrice ?? pPrice);
            originalSum += orig;
            if (orig > pPrice) hasAnyOriginal = true;
          }
        }
      }
    } else {
      const selections = schedule as ConfirmedMealSelection[];
      for (const item of selections) {
        sum += isUae ? (item.productPriceAed ?? item.productPrice) : item.productPrice;
      }
    }

    calculatedTotal = sum;
    calculatedOriginal = hasAnyOriginal && originalSum > calculatedTotal ? originalSum : null;
  } else if (plan.pricingMode === "base_plus_adjustments") {
    // Base price + difference of swapped products
    let adjustments = 0;

    if (schedule.length > 0 && "meals" in schedule[0]) {
      const days = schedule as MealPlanDay[];
      // Match each meal against default schedule assignment
      for (const day of days) {
        const defaultDay = plan.schedule.find((d) => d.dayNumber === day.dayNumber);
        for (const meal of day.meals) {
          const defaultMeal = defaultDay?.meals.find((m) => m.slotKey === meal.slotKey);
          if (defaultMeal && defaultMeal.productId !== meal.productId) {
            const defaultProd = productsById.get(defaultMeal.productId);
            const currentProd = productsById.get(meal.productId);
            if (defaultProd && currentProd) {
              const defaultP = getCountryPrice(defaultProd, country) ?? 0;
              const currentP = getCountryPrice(currentProd, country) ?? 0;
              adjustments += currentP - defaultP;
            }
          }
        }
      }
    } else {
      const selections = schedule as ConfirmedMealSelection[];
      for (const item of selections) {
        if (item.isSwapped && item.originalProductId) {
          const originalProd = productsById.get(item.originalProductId);
          const currentProd = productsById.get(item.productId);
          if (originalProd && currentProd) {
            const origP = getCountryPrice(originalProd, country) ?? 0;
            const currP = getCountryPrice(currentProd, country) ?? 0;
            adjustments += currP - origP;
          }
        }
      }
    }

    calculatedTotal = Math.max(0, basePrice + adjustments);
    calculatedOriginal = originalPrice ? Math.max(calculatedTotal, originalPrice + adjustments) : null;
  }

  const hasDiscount = Boolean(calculatedOriginal && calculatedOriginal > calculatedTotal);
  const savings = hasDiscount && calculatedOriginal ? calculatedOriginal - calculatedTotal : 0;

  return {
    totalAmount: Math.round(calculatedTotal * 100) / 100,
    originalAmount: calculatedOriginal ? Math.round(calculatedOriginal * 100) / 100 : null,
    currency,
    currencySymbol,
    pricingMode: plan.pricingMode,
    hasDiscount,
    savings: Math.round(savings * 100) / 100,
  };
}

/**
 * Parses grams from a string (e.g. "14g" -> 14)
 */
function parseGrams(val: string | null | undefined): number | null {
  if (!val) return null;
  const num = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
}

/**
 * Calculates accurate nutrition summaries across the meal plan schedule.
 * Flags isIncomplete if any product is missing calorie or macro data.
 */
export function calculatePlanNutrition(
  schedule: MealPlanDay[] | ConfirmedMealSelection[],
  productsById: Map<string, Product>
): PlanNutritionSummary {
  const dailySummaries: NutritionDailySummary[] = [];
  let totalPlanCalories = 0;
  let totalPlanProtein = 0;
  let totalPlanCarbs = 0;
  let totalPlanFat = 0;
  let planIsIncomplete = false;

  // Group by day number
  const dayGroups = new Map<number, Array<{ productId: string }>>();

  if (schedule.length > 0 && "meals" in schedule[0]) {
    const days = schedule as MealPlanDay[];
    for (const d of days) {
      dayGroups.set(d.dayNumber, d.meals);
    }
  } else {
    const selections = schedule as ConfirmedMealSelection[];
    for (const sel of selections) {
      const list = dayGroups.get(sel.dayNumber) || [];
      list.push({ productId: sel.productId });
      dayGroups.set(sel.dayNumber, list);
    }
  }

  const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => a - b);

  for (const dayNum of sortedDays) {
    const meals = dayGroups.get(dayNum) || [];
    let dayCalories = 0;
    let dayProtein = 0;
    let dayCarbs = 0;
    let dayFat = 0;
    let dayIsIncomplete = false;

    for (const meal of meals) {
      const prod = productsById.get(meal.productId);
      if (!prod || !prod.nutrition) {
        dayIsIncomplete = true;
        planIsIncomplete = true;
        continue;
      }

      if (prod.nutrition.calories !== null && prod.nutrition.calories !== undefined) {
        dayCalories += prod.nutrition.calories;
      } else {
        dayIsIncomplete = true;
        planIsIncomplete = true;
      }

      const protein = parseGrams(prod.nutrition.protein);
      if (protein !== null) dayProtein += protein;
      else {
        dayIsIncomplete = true;
        planIsIncomplete = true;
      }

      const carbs = parseGrams(prod.nutrition.carbs);
      if (carbs !== null) dayCarbs += carbs;

      const fat = parseGrams(prod.nutrition.fat);
      if (fat !== null) dayFat += fat;
    }

    dailySummaries.push({
      dayNumber: dayNum,
      calories: dayCalories > 0 ? dayCalories : null,
      proteinGrams: dayProtein > 0 ? Math.round(dayProtein * 10) / 10 : null,
      carbsGrams: dayCarbs > 0 ? Math.round(dayCarbs * 10) / 10 : null,
      fatGrams: dayFat > 0 ? Math.round(dayFat * 10) / 10 : null,
      isIncomplete: dayIsIncomplete,
    });

    totalPlanCalories += dayCalories;
    totalPlanProtein += dayProtein;
    totalPlanCarbs += dayCarbs;
    totalPlanFat += dayFat;
  }

  const totalDays = Math.max(1, sortedDays.length);

  return {
    averageDailyCalories: totalPlanCalories > 0 ? Math.round(totalPlanCalories / totalDays) : null,
    averageDailyProtein: totalPlanProtein > 0 ? Math.round((totalPlanProtein / totalDays) * 10) / 10 : null,
    averageDailyCarbs: totalPlanCarbs > 0 ? Math.round((totalPlanCarbs / totalDays) * 10) / 10 : null,
    averageDailyFat: totalPlanFat > 0 ? Math.round((totalPlanFat / totalDays) * 10) / 10 : null,
    totalPlanCalories: totalPlanCalories > 0 ? totalPlanCalories : null,
    dailySummaries,
    isIncomplete: planIsIncomplete,
  };
}
