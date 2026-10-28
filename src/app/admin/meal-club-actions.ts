"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import {
  createMealPlan,
  updateMealPlan,
  duplicateMealPlan,
  deleteMealPlan,
  createMealCategory,
  updateMealCategory,
  adminCorrectMealInSubscription,
  updateSubscriptionStatus,
  getMealPlanById,
  getAllMealPlans,
  getAllSubscriptions,
  getMealClubOverviewStats,
} from "@/lib/meal-club-db";
import type { MealPlan, PricingMode, SwapRules, MealPlanDay } from "@/data/meal-club-types";

// Helper: Require Admin
async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.isAuthenticated || session.role !== "admin") {
    throw new Error("Unauthorized: Administrator permissions required.");
  }
  return session;
}

/**
 * Creates or updates a meal plan from admin form submission.
 */
export async function saveMealPlanAction(formData: FormData): Promise<{ success?: boolean; error?: string; plan?: MealPlan }> {
  try {
    await requireAdmin();

    const id = (formData.get("id") as string)?.trim() || undefined;
    const name = (formData.get("name") as string)?.trim();
    let slug = (formData.get("slug") as string)?.trim();
    const subtitle = (formData.get("subtitle") as string)?.trim() || "";
    const description = (formData.get("description") as string)?.trim() || "";
    const image = (formData.get("image") as string)?.trim() || "";
    const durationDays = parseInt((formData.get("durationDays") as string) || "7", 10);
    const pricingMode = ((formData.get("pricingMode") as string) || "fixed") as PricingMode;
    const basePrice = parseFloat((formData.get("basePrice") as string) || "0");
    const basePriceAedRaw = formData.get("basePriceAed") as string | null;
    const basePriceAed = basePriceAedRaw && basePriceAedRaw.trim() ? parseFloat(basePriceAedRaw.trim()) : null;

    const originalPriceRaw = formData.get("originalPrice") as string | null;
    const originalPrice = originalPriceRaw && originalPriceRaw.trim() ? parseFloat(originalPriceRaw.trim()) : null;

    const originalPriceAedRaw = formData.get("originalPriceAed") as string | null;
    const originalPriceAed = originalPriceAedRaw && originalPriceAedRaw.trim() ? parseFloat(originalPriceAedRaw.trim()) : null;

    const status = ((formData.get("status") as string) || "draft") as MealPlan["status"];
    const isFeatured = formData.get("isFeatured") === "true" || formData.get("isFeatured") === "on";
    const sortOrder = parseInt((formData.get("sortOrder") as string) || "0", 10);

    const categoriesRaw = formData.get("mealCategories") as string | null;
    let mealCategories: string[] = ["breakfast"];
    if (categoriesRaw) {
      try {
        mealCategories = JSON.parse(categoriesRaw);
      } catch {
        mealCategories = categoriesRaw.split(",").map((c) => c.trim()).filter(Boolean);
      }
    }

    const swapRulesRaw = formData.get("swapRules") as string | null;
    let swapRules: SwapRules = {
      enabled: true,
      maxSwapsPerPlan: 5,
      deadlineHours: 0,
      allowCrossCategory: false,
      priceDifferenceMode: "none",
    };
    if (swapRulesRaw) {
      try {
        swapRules = { ...swapRules, ...JSON.parse(swapRulesRaw) };
      } catch {
        // fallback
      }
    }

    const scheduleRaw = formData.get("schedule") as string | null;
    let schedule: MealPlanDay[] = [];
    if (scheduleRaw) {
      try {
        schedule = JSON.parse(scheduleRaw);
      } catch {
        // fallback
      }
    }

    if (!name) {
      return { error: "Plan name is required." };
    }

    if (!slug) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }

    if (isNaN(durationDays) || durationDays <= 0) {
      return { error: "Duration must be at least 1 day." };
    }

    // Validation for publishing
    if (status === "published") {
      if (schedule.length !== durationDays) {
        return {
          error: `Cannot publish: Plan schedule has ${schedule.length} days configured, but duration is ${durationDays} days.`,
        };
      }
      for (const day of schedule) {
        if (!day.meals || day.meals.length === 0) {
          return { error: `Cannot publish: Day ${day.dayNumber} has no meal slot configured.` };
        }
        for (const m of day.meals) {
          if (!m.productId) {
            return { error: `Cannot publish: Day ${day.dayNumber} (${m.slotName}) has no product assigned.` };
          }
        }
      }
    }

    let savedPlan: MealPlan;
    if (id) {
      const updated = await updateMealPlan(id, {
        name,
        slug,
        subtitle,
        description,
        image,
        durationDays,
        mealCategories,
        mealsPerDay: Math.max(1, schedule[0]?.meals?.length || 1),
        pricingMode,
        basePrice,
        basePriceAed,
        originalPrice,
        originalPriceAed,
        status,
        isFeatured,
        sortOrder,
        swapRules,
        schedule,
      });
      if (!updated) return { error: "Plan not found for update." };
      savedPlan = updated;
    } else {
      savedPlan = await createMealPlan({
        name,
        slug,
        subtitle,
        description,
        image,
        durationDays,
        mealCategories,
        mealsPerDay: Math.max(1, schedule[0]?.meals?.length || 1),
        pricingMode,
        basePrice,
        basePriceAed,
        originalPrice,
        originalPriceAed,
        status,
        isFeatured,
        sortOrder,
        swapRules,
        schedule,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/meal-club");
    revalidatePath("/", "layout");

    return { success: true, plan: savedPlan };
  } catch (err: unknown) {
    console.error("saveMealPlanAction error:", err);
    return { error: err instanceof Error ? err.message : "Failed to save meal plan." };
  }
}

export async function duplicateMealPlanAction(planId: string) {
  try {
    await requireAdmin();
    const duplicated = await duplicateMealPlan(planId);
    if (!duplicated) return { error: "Failed to duplicate meal plan." };

    revalidatePath("/admin");
    revalidatePath("/meal-club");
    return { success: true, plan: duplicated };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to duplicate plan." };
  }
}

export async function deleteMealPlanAction(planId: string) {
  try {
    await requireAdmin();
    const ok = await deleteMealPlan(planId);
    if (!ok) return { error: "Failed to delete meal plan." };

    revalidatePath("/admin");
    revalidatePath("/meal-club");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to delete plan." };
  }
}

export async function saveMealCategoryAction(formData: FormData) {
  try {
    await requireAdmin();
    const id = (formData.get("id") as string)?.trim();
    const displayName = (formData.get("displayName") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const sortOrder = parseInt((formData.get("sortOrder") as string) || "10", 10);
    const isEditing = formData.get("isEditing") === "true";

    if (!displayName) return { error: "Category display name is required." };

    if (isEditing) {
      if (!id) return { error: "Category ID required for edit." };
      const updated = await updateMealCategory(id, { displayName, description, sortOrder });
      revalidatePath("/admin");
      return { success: true, category: updated };
    } else {
      const generatedId = id || displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const created = await createMealCategory({ id: generatedId, displayName, description, sortOrder });
      revalidatePath("/admin");
      return { success: true, category: created };
    }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to save category." };
  }
}

export async function toggleCategoryActiveAction(categoryId: string, isActive: boolean) {
  try {
    await requireAdmin();
    const updated = await updateMealCategory(categoryId, { isActive });
    revalidatePath("/admin");
    return { success: true, category: updated };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to toggle category." };
  }
}

export async function adminCorrectMealAction(
  subscriptionId: string,
  dayNumber: number,
  slotKey: string,
  replacementProductId: string,
  reason: string
) {
  try {
    const session = await requireAdmin();
    if (!reason || !reason.trim()) {
      return { error: "An administrative reason is required for order corrections." };
    }

    const updated = await adminCorrectMealInSubscription(
      subscriptionId,
      dayNumber,
      slotKey,
      replacementProductId,
      session.username || "admin",
      reason.trim()
    );

    revalidatePath("/admin");
    revalidatePath("/meal-club");
    return { success: true, subscription: updated };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Correction failed." };
  }
}

export async function updateSubscriptionStatusAction(
  subscriptionId: string,
  status: "pending" | "active" | "paused" | "completed" | "cancelled"
) {
  try {
    const session = await requireAdmin();
    const updated = await updateSubscriptionStatus(subscriptionId, status, session.username || "admin");
    revalidatePath("/admin");
    return { success: true, subscription: updated };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Status update failed." };
  }
}
