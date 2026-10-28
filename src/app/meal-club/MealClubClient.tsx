"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/data/products";
import type { MealPlan, MealPlanDay, MealSubscription, MealPlanItemAssignment } from "@/data/meal-club-types";
import { useCountry } from "@/components/CountryProvider";
import { formatPrice, getCountryPrice, getCountryName } from "@/lib/country";
import { calculatePlanPrice, calculatePlanNutrition } from "@/lib/meal-club-pricing";
import { createSubscriptionOrderAction } from "./actions";
import SwapModal from "@/components/meal-club/SwapModal";
import NutritionSummaryCard from "@/components/meal-club/NutritionSummaryCard";
import {
  Calendar,
  CheckCircle2,
  Lock,
  ArrowRightLeft,
  Sparkles,
  ShieldCheck,
  Clock,
  Send,
  AlertCircle,
  ChevronRight,
  Info,
} from "lucide-react";

interface MealClubClientProps {
  initialPlans: MealPlan[];
  allProducts: Product[];
}

export default function MealClubClient({ initialPlans, allProducts }: MealClubClientProps) {
  const router = useRouter();
  const { country } = useCountry();
  const [isPending, startTransition] = useTransition();

  const [selectedDuration, setSelectedDuration] = useState<number | "all">("all");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlans[0]?.id || "");

  const activePlan = initialPlans.find((p) => p.id === selectedPlanId) || initialPlans[0];

  // Customized schedule state for the currently viewed plan (allows customer swaps prior to locking)
  const [customSchedule, setCustomSchedule] = useState<MealPlanDay[]>(() => {
    return activePlan ? JSON.parse(JSON.stringify(activePlan.schedule)) : [];
  });

  // Track if plan changed to reset customized schedule
  const [lastPlanId, setLastPlanId] = useState<string>(activePlan?.id || "");
  if (activePlan && activePlan.id !== lastPlanId) {
    setLastPlanId(activePlan.id);
    setCustomSchedule(JSON.parse(JSON.stringify(activePlan.schedule)));
  }

  // Swap modal state
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{
    dayNumber: number;
    dayLabel: string;
    meal: MealPlanItemAssignment;
  } | null>(null);

  // Order submission state
  const [orderSuccess, setOrderSuccess] = useState<MealSubscription | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Products Map
  const productsById = useMemo(() => {
    return new Map<string, Product>(allProducts.map((p) => [p.id, p]));
  }, [allProducts]);

  // Pricing & Nutrition calculations
  const calculatedPricing = useMemo(() => {
    if (!activePlan) return null;
    return calculatePlanPrice(activePlan, customSchedule, productsById, country);
  }, [activePlan, customSchedule, productsById, country]);

  const nutritionSummary = useMemo(() => {
    if (!activePlan) return null;
    return calculatePlanNutrition(customSchedule, productsById);
  }, [activePlan, customSchedule, productsById]);

  // Calculate swaps used
  const swapsUsed = useMemo(() => {
    if (!activePlan) return 0;
    let count = 0;
    for (const day of customSchedule) {
      const origDay = activePlan.schedule.find((d) => d.dayNumber === day.dayNumber);
      for (const meal of day.meals) {
        const origMeal = origDay?.meals.find((m) => m.slotKey === meal.slotKey);
        if (origMeal && origMeal.productId !== meal.productId) {
          count++;
        }
      }
    }
    return count;
  }, [activePlan, customSchedule]);

  const maxSwaps = activePlan?.swapRules?.maxSwapsPerPlan || 0;
  const canSwapMore = maxSwaps === 0 || swapsUsed < maxSwaps;

  // Filter plans by duration
  const filteredPlans = initialPlans.filter((p) => {
    if (selectedDuration === "all") return true;
    return p.durationDays === selectedDuration;
  });

  // Handle Swap Confirm from modal
  function handleConfirmSwap(newProductId: string) {
    if (!swapTarget || !activePlan) return;
    const { dayNumber, meal } = swapTarget;

    setCustomSchedule((prev) =>
      prev.map((day) => {
        if (day.dayNumber === dayNumber) {
          const mealsCopy = day.meals.map((m) => {
            if (m.slotKey === meal.slotKey) {
              const newProd = productsById.get(newProductId);
              return {
                ...m,
                productId: newProductId,
                category: newProd?.category || m.category,
              };
            }
            return m;
          });
          return { ...day, meals: mealsCopy };
        }
        return day;
      })
    );
  }

  // Handle Order Form Submit
  async function handleOrderSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const fd = new FormData(e.currentTarget);
    fd.append("planId", activePlan.id);
    fd.append("country", country);
    fd.append("customSchedule", JSON.stringify(customSchedule));
    fd.append("confirmImmediately", "true"); // Strict server lock upon submission

    startTransition(async () => {
      const res = await createSubscriptionOrderAction(fd);
      if (res.error) {
        setFormError(res.error);
      } else if (res.subscription) {
        setOrderSuccess(res.subscription);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  // If order was just confirmed, render Locked Confirmation View
  if (orderSuccess) {
    const orderUrl = `/meal-club/order/${orderSuccess.id}`;
    const waText = encodeURIComponent(
      `Hello PLATTEROBE! I have confirmed my Meal Club membership.\n\n` +
      `Order Reference: ${orderSuccess.id}\n` +
      `Plan: ${orderSuccess.planName} (${orderSuccess.planDuration} Days)\n` +
      `Customer: ${orderSuccess.customerName} (${orderSuccess.customerPhone})\n` +
      `Start Date: ${orderSuccess.startDate}\n` +
      `Total: ${orderSuccess.currency === "AED" ? `AED ${orderSuccess.totalAmount.toFixed(2)}` : `₹${orderSuccess.totalAmount}`}\n` +
      `Status: Selections Permanently Locked`
    );
    const waLink = `https://wa.me/919497716349?text=${waText}`;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center space-y-8 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
          <CheckCircle2 size={32} />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-heading font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
            <Lock size={12} />
            <span>Order Confirmed & Selections Locked</span>
          </span>

          <h1 className="text-[32px] sm:text-[40px] font-heading font-800 text-[#1E3A2E] uppercase tracking-[-0.02em]">
            ORDER CONFIRMED
          </h1>

          <p className="text-[15px] sm:text-[16px] text-[#1A1A1A]/70 font-body max-w-lg mx-auto leading-relaxed">
            Your meal selections are now permanently locked in our kitchen system.
            Every platter will be prepared fresh each morning according to your confirmed schedule.
          </p>
        </div>

        <div className="p-6 bg-white rounded-[12px] border border-stone-200 shadow-sm text-left max-w-md mx-auto space-y-3">
          <div className="flex justify-between text-[13px] border-b border-stone-100 pb-2">
            <span className="text-stone-500">Order Reference:</span>
            <span className="font-mono font-bold text-[#1E3A2E]">{orderSuccess.id}</span>
          </div>

          <div className="flex justify-between text-[13px] border-b border-stone-100 pb-2">
            <span className="text-stone-500">Package:</span>
            <span className="font-heading font-bold text-[#1E3A2E]">{orderSuccess.planName}</span>
          </div>

          <div className="flex justify-between text-[13px] border-b border-stone-100 pb-2">
            <span className="text-stone-500">Duration:</span>
            <span className="font-semibold">{orderSuccess.planDuration} Days</span>
          </div>

          <div className="flex justify-between text-[13px] border-b border-stone-100 pb-2">
            <span className="text-stone-500">Start Date:</span>
            <span className="font-semibold">{orderSuccess.startDate}</span>
          </div>

          <div className="flex justify-between text-[14px] pt-1">
            <span className="font-heading font-bold text-[#1E3A2E]">Total Confirmed:</span>
            <span className="font-heading font-800 text-[#1E3A2E] text-[18px]">
              {orderSuccess.currency === "AED" ? `AED ${orderSuccess.totalAmount.toFixed(2)}` : `₹${orderSuccess.totalAmount}`}
            </span>
          </div>
        </div>

        <div className="p-4 bg-[#F8F5E9] border border-stone-200 rounded-[10px] text-[13px] text-stone-600 max-w-md mx-auto">
          <strong>Need exceptional changes?</strong> Because daily kitchen prep is scheduled in advance, selections cannot be modified online. For urgent assistance, please contact PLATTEROBE customer care.
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3 bg-[#1E3A2E] hover:bg-[#162d22] text-white font-heading font-semibold text-[13px] uppercase tracking-wider rounded-[8px] transition-colors flex items-center justify-center gap-2"
          >
            <Send size={15} />
            <span>Notify Kitchen on WhatsApp</span>
          </a>

          <Link
            href={orderUrl}
            className="w-full sm:w-auto px-6 py-3 border border-stone-300 hover:border-[#1E3A2E] text-[#1E3A2E] font-heading font-semibold text-[13px] uppercase tracking-wider rounded-[8px] transition-colors"
          >
            View Locked Schedule
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-10 sm:space-y-14">
      {/* ── Page Hero Header ── */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8F5E9] border border-stone-200 text-[#6B8F56] text-[11px] font-heading font-bold uppercase tracking-[0.12em]">
          <Sparkles size={13} className="text-[#6B8F56]" />
          <span>Membership & Meal Plans</span>
        </div>

        <h1 className="text-[36px] sm:text-[48px] md:text-[54px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-[1.05] uppercase">
          THE MEAL CLUB
        </h1>

        <p className="text-[15px] sm:text-[17px] text-[#1A1A1A]/70 font-body leading-relaxed max-w-2xl mx-auto">
          Thoughtfully planned meals for your everyday. Wholesome breakfast platters and daily fuel delivered fresh with complete flexibility to customize your weekly menu.
        </p>

        {/* Duration Tabs */}
        <div className="pt-4 flex items-center justify-center gap-2 flex-wrap">
          {[
            { label: "All Plans", val: "all" },
            { label: "7 Days", val: 7 },
            { label: "14 Days", val: 14 },
            { label: "30 Days", val: 30 },
          ].map((tab) => {
            const isActive = selectedDuration === tab.val;
            return (
              <button
                key={String(tab.val)}
                type="button"
                onClick={() => setSelectedDuration(tab.val as number | "all")}
                className={`px-4 py-2 rounded-full text-[12px] font-heading font-semibold uppercase tracking-[0.06em] transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1E3A2E] text-[#F8F5E9] shadow-sm"
                    : "bg-white text-stone-600 border border-stone-200 hover:border-[#1E3A2E]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Plan Selection Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => {
          const isSelected = activePlan?.id === plan.id;
          const planPricing = calculatePlanPrice(plan, plan.schedule, productsById, country);

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`p-6 rounded-[14px] bg-white transition-all cursor-pointer flex flex-col justify-between relative ${
                isSelected
                  ? "border-2 border-[#1E3A2E] shadow-md ring-4 ring-[#1E3A2E]/5"
                  : "border border-stone-200 hover:border-stone-400 shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F8F5E9] text-[#1E3A2E] font-heading font-bold text-[10px] uppercase tracking-wider">
                    {plan.durationDays} Days Package
                  </span>

                  {planPricing.hasDiscount && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-heading font-bold uppercase tracking-wider">
                      Save {Math.round((planPricing.savings / (planPricing.originalAmount || 1)) * 100)}%
                    </span>
                  )}
                </div>

                <h3 className="text-[20px] font-heading font-800 text-[#1E3A2E] uppercase tracking-[-0.01em] mb-1.5">
                  {plan.name}
                </h3>

                {plan.subtitle && (
                  <p className="text-[13px] text-stone-600 font-body mb-3">
                    {plan.subtitle}
                  </p>
                )}

                {/* Price Display */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-[28px] font-heading font-800 text-[#1E3A2E] tabular-nums">
                    {formatPrice(planPricing.totalAmount, country)}
                  </span>
                  {planPricing.hasDiscount && planPricing.originalAmount && (
                    <span className="text-[15px] text-stone-400 line-through tabular-nums">
                      {formatPrice(planPricing.originalAmount, country)}
                    </span>
                  )}
                </div>

                <p className="text-[12px] text-stone-500 font-body leading-relaxed mb-4">
                  {plan.description}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] font-heading font-semibold uppercase text-stone-500">
                  {plan.swapRules.enabled
                    ? `${plan.swapRules.maxSwapsPerPlan === 0 ? "Unlimited" : plan.swapRules.maxSwapsPerPlan} swaps allowed`
                    : "Fixed curated menu"}
                </span>

                <span
                  className={`text-[12px] font-heading font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isSelected ? "text-[#1E3A2E]" : "text-stone-400"
                  }`}
                >
                  <span>{isSelected ? "Selected" : "Select"}</span>
                  <ChevronRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Active Plan Explorer & Customizer ── */}
      {activePlan && (
        <div className="space-y-8 pt-6 border-t border-stone-200">
          {/* Active Plan Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F8F5E9]/60 p-5 rounded-[12px] border border-stone-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#6B8F56]">
                  Customizing Your Membership
                </span>
                <span className="text-stone-300">·</span>
                <span className="text-[11px] font-mono text-stone-500">
                  {activePlan.durationDays} Days Schedule
                </span>
              </div>

              <h2 className="text-[24px] sm:text-[28px] font-heading font-800 text-[#1E3A2E] uppercase">
                {activePlan.name}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {activePlan.swapRules.enabled && (
                <div className="text-right">
                  <span className="text-[11px] font-heading font-semibold uppercase text-stone-500 block">
                    Swaps Used:
                  </span>
                  <span className="text-[14px] font-heading font-bold text-[#1E3A2E]">
                    {swapsUsed} of {maxSwaps === 0 ? "∞" : maxSwaps} Allowed
                  </span>
                </div>
              )}

              {calculatedPricing && (
                <div className="text-right pl-4 border-l border-stone-300">
                  <span className="text-[11px] font-heading font-semibold uppercase text-stone-500 block">
                    Live Total:
                  </span>
                  <span className="text-[24px] font-heading font-800 text-[#1E3A2E]">
                    {formatPrice(calculatedPricing.totalAmount, country)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Days Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-heading font-bold text-[#1E3A2E] uppercase tracking-wide flex items-center gap-2">
                <Calendar size={16} className="text-[#6B8F56]" />
                <span>Daily Meal Schedule</span>
              </h3>
              <span className="text-[12px] text-stone-500 font-body">
                Click <strong>"Swap Meal"</strong> on any day to choose an alternative platter before locking.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {customSchedule.map((day) => (
                <div
                  key={day.dayNumber}
                  className="bg-white rounded-[10px] border border-stone-200 shadow-sm p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
                      <span className="font-heading font-bold text-[13px] text-[#1E3A2E] uppercase">
                        {day.dayLabel || `Day ${day.dayNumber}`}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        Day {day.dayNumber}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {day.meals.map((meal) => {
                        const prod = productsById.get(meal.productId);
                        const defaultDay = activePlan.schedule.find((d) => d.dayNumber === day.dayNumber);
                        const defaultMeal = defaultDay?.meals.find((m) => m.slotKey === meal.slotKey);
                        const isSwapped = defaultMeal && defaultMeal.productId !== meal.productId;

                        return (
                          <div key={meal.slotKey} className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-heading font-semibold uppercase text-stone-500">
                              <span>{meal.slotName}</span>
                              {isSwapped && (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                                  Custom Swapped
                                </span>
                              )}
                            </div>

                            <div className="flex items-start gap-2.5">
                              {prod?.image && (
                                <div className="relative w-12 h-12 rounded-[6px] bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                                  <Image
                                    src={prod.image}
                                    alt={prod.name}
                                    fill
                                    unoptimized={Boolean(prod.image.startsWith("http") || prod.image.startsWith("/uploads/"))}
                                    className="object-cover"
                                  />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <strong className="text-[13px] font-heading font-bold text-[#1E3A2E] block truncate">
                                  {prod?.name || "Platter"}
                                </strong>
                                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-body">
                                  {prod?.nutrition?.calories && (
                                    <span>{prod.nutrition.calories} cal</span>
                                  )}
                                  {prod?.nutrition?.protein && (
                                    <span>· {prod.nutrition.protein}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {activePlan.swapRules.enabled && meal.isSwappable && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSwapTarget({
                                    dayNumber: day.dayNumber,
                                    dayLabel: day.dayLabel || `Day ${day.dayNumber}`,
                                    meal,
                                  });
                                  setSwapModalOpen(true);
                                }}
                                disabled={!canSwapMore && !isSwapped}
                                className="w-full mt-1.5 py-1.5 px-2 bg-stone-100 hover:bg-[#F8F5E9] disabled:opacity-40 text-[#1E3A2E] text-[11px] font-heading font-semibold uppercase tracking-wider rounded-[6px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <ArrowRightLeft size={12} />
                                <span>Swap Meal</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nutrition Summary Card */}
          {nutritionSummary && (
            <NutritionSummaryCard
              summary={nutritionSummary}
              mealsPerDay={activePlan.mealsPerDay}
            />
          )}

          {/* ── Order Confirmation Section ── */}
          <div className="bg-white rounded-[14px] border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-stone-200 pb-4">
              <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#6B8F56] block mb-1">
                Step 2: Confirm & Lock Membership
              </span>
              <h3 className="text-[22px] sm:text-[26px] font-heading font-800 text-[#1E3A2E] uppercase">
                Confirm {activePlan.name}
              </h3>
              <p className="text-[13px] text-stone-500 font-body mt-1">
                Review your selections and enter delivery coordinates. Upon confirmation, your meal selections will be permanently locked for fresh daily kitchen prep.
              </p>
            </div>

            {formError && (
              <div className="p-3.5 rounded-[8px] bg-red-50 border border-red-200 text-red-800 text-[13px] flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleOrderSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 rounded-[8px] border border-stone-300 text-[13px] focus:outline-none focus:border-[#1E3A2E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1.5">
                    WhatsApp Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="customerPhone"
                    required
                    placeholder="e.g. +91 94977 16349"
                    className="w-full px-3.5 py-2.5 rounded-[8px] border border-stone-300 text-[13px] font-mono focus:outline-none focus:border-[#1E3A2E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1.5">
                    Delivery Address *
                  </label>
                  <input
                    type="text"
                    name="deliveryAddress"
                    required
                    placeholder="Building / Villa, Street, Landmark"
                    className="w-full px-3.5 py-2.5 rounded-[8px] border border-stone-300 text-[13px] focus:outline-none focus:border-[#1E3A2E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1.5">
                    City / Area *
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    defaultValue={country === "AE" ? "Dubai" : "Parappanangadi, Malappuram"}
                    className="w-full px-3.5 py-2.5 rounded-[8px] border border-stone-300 text-[13px] focus:outline-none focus:border-[#1E3A2E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1.5">
                    Preferred Membership Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    defaultValue={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3.5 py-2.5 rounded-[8px] border border-stone-300 text-[13px] font-heading font-bold text-[#1E3A2E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1.5">
                    Dietary Notes / Delivery Instructions
                  </label>
                  <input
                    type="text"
                    name="notes"
                    placeholder="e.g. Ring bell, leave at door, no honey on Day 3"
                    className="w-full px-3.5 py-2.5 rounded-[8px] border border-stone-300 text-[13px]"
                  />
                </div>
              </div>

              {/* Price Breakdown & Critical Locking Warning */}
              <div className="p-5 rounded-[10px] bg-[#F8F5E9] border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-stone-600 text-[12px] mb-1">
                    <Lock size={13} className="text-[#1E3A2E]" />
                    <span className="font-heading font-bold uppercase tracking-wider text-[#1E3A2E]">
                      Server-Enforced Order Locking
                    </span>
                  </div>
                  <p className="text-[12px] text-stone-600 max-w-md leading-relaxed">
                    Once you confirm, your daily platter selections will be permanently locked.
                    Any subsequent modifications must be made via support.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-heading font-semibold uppercase text-stone-500 block">
                    Total Payable ({getCountryName(country)}):
                  </span>
                  <span className="text-[32px] font-heading font-800 text-[#1E3A2E] tabular-nums leading-tight">
                    {calculatedPricing ? formatPrice(calculatedPricing.totalAmount, country) : "—"}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#1E3A2E] hover:bg-[#152a21] disabled:opacity-50 text-white font-heading font-bold text-[13px] uppercase tracking-[0.08em] rounded-[8px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Lock size={14} />
                  <span>{isPending ? "Confirming & Locking..." : "Confirm & Lock Meal Plan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Swap Modal Component ── */}
      {swapModalOpen && swapTarget && activePlan && (
        <SwapModal
          isOpen={swapModalOpen}
          onClose={() => {
            setSwapModalOpen(false);
            setSwapTarget(null);
          }}
          dayNumber={swapTarget.dayNumber}
          dayLabel={swapTarget.dayLabel}
          currentMeal={swapTarget.meal}
          allProducts={allProducts}
          plan={activePlan}
          onConfirmSwap={handleConfirmSwap}
        />
      )}
    </div>
  );
}
