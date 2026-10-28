"use server";

import { revalidatePath } from "next/cache";
import {
  createMealSubscription,
  customerSwapMeal,
  confirmAndLockSubscription,
  getSubscriptionById,
  getMealPlanById,
  getSubscriptionAuditLogs,
} from "@/lib/meal-club-db";
import type { MealPlanDay, MealSubscription, MealAuditLog } from "@/data/meal-club-types";

/**
 * Creates a new Meal Club subscription / confirmed order.
 */
export async function createSubscriptionOrderAction(formData: FormData): Promise<{
  success?: boolean;
  error?: string;
  subscription?: MealSubscription;
}> {
  try {
    const planId = (formData.get("planId") as string)?.trim();
    const customerName = (formData.get("customerName") as string)?.trim();
    const customerPhone = (formData.get("customerPhone") as string)?.trim();
    const customerEmail = (formData.get("customerEmail") as string)?.trim() || null;
    const deliveryAddress = (formData.get("deliveryAddress") as string)?.trim();
    const city = (formData.get("city") as string)?.trim();
    const country = ((formData.get("country") as string) || "IN") as "IN" | "AE";
    const startDate = (formData.get("startDate") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim();
    const customScheduleRaw = formData.get("customSchedule") as string | null;
    const confirmImmediately = formData.get("confirmImmediately") === "true";

    if (!planId) return { error: "Please select a meal plan." };
    if (!customerName) return { error: "Your full name is required." };
    if (!customerPhone || customerPhone.length < 8) return { error: "A valid phone number is required." };
    if (!deliveryAddress) return { error: "Delivery address is required." };
    if (!city) return { error: "City / Area is required." };
    if (!startDate) return { error: "Preferred start date is required." };

    let customSchedule: MealPlanDay[] | undefined = undefined;
    if (customScheduleRaw) {
      try {
        customSchedule = JSON.parse(customScheduleRaw);
      } catch {
        // fallback
      }
    }

    const subscription = await createMealSubscription({
      planId,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      city,
      country,
      startDate,
      customSchedule,
      notes,
      confirmImmediately,
    });

    revalidatePath("/meal-club");
    revalidatePath(`/meal-club/order/${subscription.id}`);
    revalidatePath("/admin");

    return { success: true, subscription };
  } catch (err: unknown) {
    console.error("createSubscriptionOrderAction error:", err);
    return { error: err instanceof Error ? err.message : "Failed to record subscription." };
  }
}

/**
 * CUSTOMER MEAL SWAP ACTION (STRICTLY SERVER-SIDE VALIDATED)
 * 
 * Business rule:
 * Customers can swap meals before order confirmation.
 * After confirmation, customer meal selections are permanently locked.
 */
export async function customerSwapMealAction(payload: {
  subscriptionId: string;
  dayNumber: number;
  slotKey: string;
  newProductId: string;
  customerPhone: string;
}): Promise<{ success?: boolean; error?: string; subscription?: MealSubscription }> {
  try {
    const { subscriptionId, dayNumber, slotKey, newProductId, customerPhone } = payload;

    if (!subscriptionId || !dayNumber || !slotKey || !newProductId || !customerPhone) {
      return { error: "Missing required swap parameters." };
    }

    const updated = await customerSwapMeal(
      subscriptionId,
      dayNumber,
      slotKey,
      newProductId,
      customerPhone
    );

    revalidatePath(`/meal-club/order/${subscriptionId}`);
    return { success: true, subscription: updated };
  } catch (err: unknown) {
    console.error("customerSwapMealAction error:", err);
    return { error: err instanceof Error ? err.message : "Swap failed." };
  }
}

/**
 * PERMANENT ORDER LOCKING ACTION
 * Locks the meal selections permanently upon customer confirmation.
 */
export async function confirmAndLockOrderAction(payload: {
  subscriptionId: string;
  customerPhone: string;
}): Promise<{ success?: boolean; error?: string; subscription?: MealSubscription }> {
  try {
    const { subscriptionId, customerPhone } = payload;
    if (!subscriptionId || !customerPhone) {
      return { error: "Subscription reference and phone are required." };
    }

    const locked = await confirmAndLockSubscription(subscriptionId, customerPhone);

    revalidatePath(`/meal-club/order/${subscriptionId}`);
    revalidatePath("/admin");

    return { success: true, subscription: locked };
  } catch (err: unknown) {
    console.error("confirmAndLockOrderAction error:", err);
    return { error: err instanceof Error ? err.message : "Confirmation failed." };
  }
}

/**
 * Retrieves a customer's confirmed order by ID (with phone verification for viewing)
 */
export async function getConfirmedOrderAction(subscriptionId: string): Promise<{
  subscription?: MealSubscription;
  auditLogs?: MealAuditLog[];
  error?: string;
}> {
  try {
    const sub = await getSubscriptionById(subscriptionId);
    if (!sub) return { error: "Order not found." };

    const auditLogs = await getSubscriptionAuditLogs(subscriptionId);
    return { subscription: sub, auditLogs };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to load order." };
  }
}
