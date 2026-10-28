"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/data/products";
import type {
  MealPlan,
  MealCategory,
  MealSubscription,
  MealPlanDay,
  MealPlanItemAssignment,
} from "@/data/meal-club-types";
import {
  saveMealPlanAction,
  duplicateMealPlanAction,
  deleteMealPlanAction,
  saveMealCategoryAction,
  toggleCategoryActiveAction,
  adminCorrectMealAction,
  updateSubscriptionStatusAction,
} from "@/app/admin/meal-club-actions";
import {
  Calendar,
  Layers,
  DollarSign,
  RefreshCw,
  Users,
  ShoppingBag,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  Sliders,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

interface MealClubAdminProps {
  initialPlans: MealPlan[];
  initialCategories: MealCategory[];
  initialSubscriptions: MealSubscription[];
  allProducts: Product[];
  stats: {
    activePlansCount: number;
    publishedPlansCount: number;
    activeSubscriptionsCount: number;
    pendingOrdersCount: number;
    confirmedOrdersCount: number;
    upcomingMealsCount: number;
    unavailableProductsCount: number;
  };
}

type MealClubTab =
  | "overview"
  | "plans"
  | "planner"
  | "categories"
  | "pricing"
  | "swap_rules"
  | "subscriptions"
  | "orders"
  | "settings";

export default function MealClubAdmin({
  initialPlans,
  initialCategories,
  initialSubscriptions,
  allProducts,
  stats,
}: MealClubAdminProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<MealClubTab>("overview");
  const [plans, setPlans] = useState<MealPlan[]>(initialPlans);
  const [categories, setCategories] = useState<MealCategory[]>(initialCategories);
  const [subscriptions, setSubscriptions] = useState<MealSubscription[]>(initialSubscriptions);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected plan for Menu Planner & Pricing/Swap tabs
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    initialPlans.find((p) => p.status === "published")?.id || initialPlans[0]?.id || ""
  );

  // Editing Plan Modal
  const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);

  // Product Selector Modal for Menu Planner
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ dayNumber: number; slotIndex: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState("all");

  // Admin Correction Modal
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<{
    subId: string;
    dayNumber: number;
    slotKey: string;
    currentProductName: string;
  } | null>(null);
  const [correctionProductId, setCorrectionProductId] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  // Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MealCategory | null>(null);

  const productsById = new Map<string, Product>(allProducts.map((p) => [p.id, p]));
  const currentSelectedPlan = plans.find((p) => p.id === selectedPlanId);

  function showSuccess(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function showError(msg: string) {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  }

  // ---------------------------------------------------------------------------
  // HANDLERS: PLANS
  // ---------------------------------------------------------------------------

  function openCreatePlanModal() {
    setEditingPlan({
      id: "",
      name: "",
      slug: "",
      subtitle: "",
      description: "",
      image: allProducts[0]?.image || "",
      durationDays: 7,
      mealCategories: ["breakfast"],
      mealsPerDay: 1,
      pricingMode: "fixed",
      basePrice: 549,
      basePriceAed: 70,
      originalPrice: 699,
      originalPriceAed: 90,
      status: "draft",
      isFeatured: false,
      sortOrder: plans.length + 1,
      swapRules: {
        enabled: true,
        maxSwapsPerPlan: 3,
        deadlineHours: 0,
        allowCrossCategory: false,
        priceDifferenceMode: "none",
      },
      schedule: Array.from({ length: 7 }, (_, i) => ({
        dayNumber: i + 1,
        dayLabel: `Day ${i + 1}`,
        meals: [
          {
            slotKey: "breakfast",
            slotName: "Morning Breakfast",
            category: "breakfast",
            productId: allProducts[i % allProducts.length]?.id || allProducts[0]?.id || "",
            isSwappable: true,
          },
        ],
      })),
      createdAt: "",
      updatedAt: "",
    });
    setPlanModalOpen(true);
  }

  function openEditPlanModal(plan: MealPlan) {
    setEditingPlan(plan);
    setPlanModalOpen(true);
  }

  async function handleDuplicatePlan(planId: string) {
    startTransition(async () => {
      const res = await duplicateMealPlanAction(planId);
      if (res.error) {
        showError(res.error);
      } else if (res.plan) {
        setPlans((prev) => [res.plan!, ...prev]);
        showSuccess(`Plan "${res.plan.name}" duplicated as draft.`);
        router.refresh();
      }
    });
  }

  async function handleDeletePlan(plan: MealPlan) {
    if (!confirm(`Are you sure you want to permanently delete "${plan.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteMealPlanAction(plan.id);
      if (res.error) {
        showError(res.error);
      } else {
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
        showSuccess(`Plan "${plan.name}" deleted.`);
        router.refresh();
      }
    });
  }

  async function handleSavePlanForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingPlan) return;

    const fd = new FormData(e.currentTarget);
    fd.append("swapRules", JSON.stringify(editingPlan.swapRules));
    fd.append("schedule", JSON.stringify(editingPlan.schedule));

    startTransition(async () => {
      const res = await saveMealPlanAction(fd);
      if (res.error) {
        showError(res.error);
      } else if (res.plan) {
        setPlans((prev) => {
          const idx = prev.findIndex((p) => p.id === res.plan!.id);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = res.plan!;
            return copy;
          }
          return [res.plan!, ...prev];
        });
        setPlanModalOpen(false);
        showSuccess(`Plan "${res.plan.name}" saved successfully.`);
        router.refresh();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // HANDLERS: MENU PLANNER
  // ---------------------------------------------------------------------------

  function handleScheduleProductSelect(productId: string) {
    if (!pickerTarget || !currentSelectedPlan) return;
    const { dayNumber, slotIndex } = pickerTarget;

    const updatedSchedule = currentSelectedPlan.schedule.map((day) => {
      if (day.dayNumber === dayNumber) {
        const mealsCopy = [...day.meals];
        if (mealsCopy[slotIndex]) {
          const selProd = productsById.get(productId);
          mealsCopy[slotIndex] = {
            ...mealsCopy[slotIndex],
            productId,
            category: selProd?.category || mealsCopy[slotIndex].category,
          };
        }
        return { ...day, meals: mealsCopy };
      }
      return day;
    });

    handleSaveScheduleDirect(currentSelectedPlan.id, updatedSchedule);
    setProductPickerOpen(false);
    setPickerTarget(null);
  }

  function handleAddSlotToDay(dayNumber: number) {
    if (!currentSelectedPlan) return;
    const defaultProd = allProducts[0]?.id || "";
    const updatedSchedule = currentSelectedPlan.schedule.map((day) => {
      if (day.dayNumber === dayNumber) {
        const slotCount = day.meals.length + 1;
        const newSlot: MealPlanItemAssignment = {
          slotKey: `slot_${slotCount}`,
          slotName: slotCount === 2 ? "Midday Fuel" : slotCount === 3 ? "Evening Fuel" : `Meal Slot ${slotCount}`,
          category: "breakfast",
          productId: defaultProd,
          isSwappable: true,
        };
        return { ...day, meals: [...day.meals, newSlot] };
      }
      return day;
    });

    handleSaveScheduleDirect(currentSelectedPlan.id, updatedSchedule);
    showSuccess(`Added meal slot to Day ${dayNumber}.`);
  }

  function handleRemoveSlot(dayNumber: number, slotIndex: number) {
    if (!currentSelectedPlan) return;
    const updatedSchedule = currentSelectedPlan.schedule.map((day) => {
      if (day.dayNumber === dayNumber) {
        if (day.meals.length <= 1) {
          alert("Each day must contain at least one meal slot.");
          return day;
        }
        const mealsCopy = day.meals.filter((_, idx) => idx !== slotIndex);
        return { ...day, meals: mealsCopy };
      }
      return day;
    });

    handleSaveScheduleDirect(currentSelectedPlan.id, updatedSchedule);
  }

  function handleCopyPreviousWeek() {
    if (!currentSelectedPlan) return;
    if (currentSelectedPlan.durationDays <= 7) {
      alert("This action is for plans longer than 7 days (e.g. 14, 20, 30 days).");
      return;
    }

    const first7 = currentSelectedPlan.schedule.slice(0, 7);
    if (first7.length < 7) {
      alert("Please configure Day 1 through Day 7 first.");
      return;
    }

    const newSchedule = currentSelectedPlan.schedule.map((day) => {
      if (day.dayNumber > 7) {
        const template = first7[(day.dayNumber - 1) % 7];
        return {
          ...day,
          meals: template.meals.map((m) => ({ ...m })),
        };
      }
      return day;
    });

    handleSaveScheduleDirect(currentSelectedPlan.id, newSchedule);
    showSuccess("Successfully copied 7-day schedule across all remaining days!");
  }

  async function handleSaveScheduleDirect(planId: string, schedule: MealPlanDay[]) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const fd = new FormData();
    fd.append("id", plan.id);
    fd.append("name", plan.name);
    fd.append("slug", plan.slug);
    fd.append("subtitle", plan.subtitle || "");
    fd.append("description", plan.description);
    fd.append("image", plan.image || "");
    fd.append("durationDays", String(plan.durationDays));
    fd.append("pricingMode", plan.pricingMode);
    fd.append("basePrice", String(plan.basePrice));
    if (plan.basePriceAed) fd.append("basePriceAed", String(plan.basePriceAed));
    if (plan.originalPrice) fd.append("originalPrice", String(plan.originalPrice));
    if (plan.originalPriceAed) fd.append("originalPriceAed", String(plan.originalPriceAed));
    fd.append("status", plan.status);
    fd.append("isFeatured", plan.isFeatured ? "true" : "false");
    fd.append("sortOrder", String(plan.sortOrder));
    fd.append("mealCategories", JSON.stringify(plan.mealCategories));
    fd.append("swapRules", JSON.stringify(plan.swapRules));
    fd.append("schedule", JSON.stringify(schedule));

    startTransition(async () => {
      const res = await saveMealPlanAction(fd);
      if (res.error) {
        showError(res.error);
      } else if (res.plan) {
        setPlans((prev) => prev.map((p) => (p.id === planId ? res.plan! : p)));
        router.refresh();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // HANDLERS: ADMIN CORRECTION
  // ---------------------------------------------------------------------------

  async function handleExecuteCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!correctionTarget || !correctionProductId || !correctionReason.trim()) {
      showError("Please select a replacement platter and enter a reason.");
      return;
    }

    startTransition(async () => {
      const res = await adminCorrectMealAction(
        correctionTarget.subId,
        correctionTarget.dayNumber,
        correctionTarget.slotKey,
        correctionProductId,
        correctionReason
      );

      if (res.error) {
        showError(res.error);
      } else if (res.subscription) {
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === res.subscription!.id ? res.subscription! : s))
        );
        setCorrectionModalOpen(false);
        setCorrectionTarget(null);
        setCorrectionProductId("");
        setCorrectionReason("");
        showSuccess("Administrative correction logged and applied.");
        router.refresh();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // RENDER TABS
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1E3A2E] text-white px-5 py-3 rounded-[8px] shadow-lg flex items-center gap-2 text-[13px] font-heading font-medium animate-fadeIn">
          <CheckCircle2 size={16} className="text-[#6B8F56]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-red-800 text-white px-5 py-3 rounded-[8px] shadow-lg flex items-center gap-2 text-[13px] font-heading font-medium animate-fadeIn">
          <AlertTriangle size={16} className="text-red-300" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Bar for MEAL CLUB Subsections */}
      <div className="bg-white rounded-[10px] border border-stone-200/90 shadow-sm p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {[
          { key: "overview", label: "Overview", icon: Layers },
          { key: "plans", label: "Meal Plans", icon: Calendar },
          { key: "planner", label: "Menu Planner", icon: Sliders },
          { key: "categories", label: "Categories", icon: Sparkles },
          { key: "pricing", label: "Package Pricing", icon: DollarSign },
          { key: "swap_rules", label: "Swap Rules", icon: RefreshCw },
          { key: "subscriptions", label: "Subscriptions", icon: Users },
          { key: "orders", label: "Meal Orders", icon: ShoppingBag },
          { key: "settings", label: "Settings", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as MealClubTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[6px] text-[12px] font-heading font-semibold uppercase tracking-[0.05em] transition-all shrink-0 ${
                isActive
                  ? "bg-[#1E3A2E] text-[#F8F5E9] shadow-sm"
                  : "text-[#1A1A1A]/70 hover:text-[#1E3A2E] hover:bg-stone-100"
              }`}
            >
              <Icon size={14} className={isActive ? "text-[#D4B789]" : "text-stone-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* SUBSECTION 1: OVERVIEW DASHBOARD */}
      {/* ===================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top Real Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-[10px] border border-stone-200/90 shadow-sm">
              <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                Active Plans
              </span>
              <span className="text-[26px] font-heading font-800 text-[#1E3A2E] tabular-nums">
                {stats.activePlansCount}
              </span>
            </div>

            <div className="bg-white p-4 rounded-[10px] border border-stone-200/90 shadow-sm">
              <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                Published Menus
              </span>
              <span className="text-[26px] font-heading font-800 text-emerald-700 tabular-nums">
                {stats.publishedPlansCount}
              </span>
            </div>

            <div className="bg-white p-4 rounded-[10px] border border-stone-200/90 shadow-sm">
              <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                Subscriptions
              </span>
              <span className="text-[26px] font-heading font-800 text-[#1E3A2E] tabular-nums">
                {stats.activeSubscriptionsCount}
              </span>
            </div>

            <div className="bg-white p-4 rounded-[10px] border border-stone-200/90 shadow-sm">
              <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                Confirmed (Locked)
              </span>
              <span className="text-[26px] font-heading font-800 text-[#6B8F56] tabular-nums">
                {stats.confirmedOrdersCount}
              </span>
            </div>

            <div className="bg-white p-4 rounded-[10px] border border-stone-200/90 shadow-sm">
              <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                Upcoming Meals
              </span>
              <span className="text-[26px] font-heading font-800 text-[#1E3A2E] tabular-nums">
                {stats.upcomingMealsCount}
              </span>
            </div>

            <div className="bg-white p-4 rounded-[10px] border border-stone-200/90 shadow-sm">
              <span className="text-[11px] font-heading font-semibold uppercase tracking-wider text-stone-500 block mb-1">
                Unavailable Items
              </span>
              <span className={`text-[26px] font-heading font-800 tabular-nums ${stats.unavailableProductsCount > 0 ? "text-amber-600" : "text-stone-400"}`}>
                {stats.unavailableProductsCount}
              </span>
            </div>
          </div>

          {/* Quick Actions & Menu Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Quick Actions */}
            <div className="lg:col-span-8 bg-white p-6 rounded-[10px] border border-stone-200/90 shadow-sm">
              <h2 className="text-[17px] font-heading font-bold text-[#1E3A2E] uppercase tracking-[-0.01em] mb-4">
                Meal Club Quick Actions
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={openCreatePlanModal}
                  className="p-4 rounded-[8px] border border-stone-200 hover:border-[#1E3A2E] bg-[#F8F5E9]/40 hover:bg-[#F8F5E9] text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-[6px] bg-[#1E3A2E] text-white flex items-center justify-center shrink-0">
                    <Plus size={16} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-heading font-bold uppercase text-[#1E3A2E] group-hover:text-[#6B8F56] transition-colors">
                      Create Meal Plan
                    </h3>
                    <p className="text-[12px] text-stone-500 mt-0.5">
                      Configure duration, base pricing, categories, and swap policies.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("planner");
                  }}
                  className="p-4 rounded-[8px] border border-stone-200 hover:border-[#1E3A2E] bg-[#F8F5E9]/40 hover:bg-[#F8F5E9] text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-[6px] bg-[#6B8F56] text-white flex items-center justify-center shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-heading font-bold uppercase text-[#1E3A2E] group-hover:text-[#6B8F56] transition-colors">
                      Interactive Menu Planner
                    </h3>
                    <p className="text-[12px] text-stone-500 mt-0.5">
                      Assign real platters day by day across 7, 14, 15, 20, or 30 days.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("categories")}
                  className="p-4 rounded-[8px] border border-stone-200 hover:border-[#1E3A2E] bg-[#F8F5E9]/40 hover:bg-[#F8F5E9] text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-[6px] bg-stone-700 text-white flex items-center justify-center shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-heading font-bold uppercase text-[#1E3A2E] group-hover:text-[#6B8F56] transition-colors">
                      Categories & Meal Slots
                    </h3>
                    <p className="text-[12px] text-stone-500 mt-0.5">
                      Add future categories like Lunch, Dinner, Snack Boxes.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("subscriptions")}
                  className="p-4 rounded-[8px] border border-stone-200 hover:border-[#1E3A2E] bg-[#F8F5E9]/40 hover:bg-[#F8F5E9] text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-[6px] bg-emerald-800 text-white flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-heading font-bold uppercase text-[#1E3A2E] group-hover:text-[#6B8F56] transition-colors">
                      View Subscriptions & Orders
                    </h3>
                    <p className="text-[12px] text-stone-500 mt-0.5">
                      Inspect locked meal selections, dates, and order status.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Right: Operational Status / Stock Watch */}
            <div className="lg:col-span-4 bg-white p-6 rounded-[10px] border border-stone-200/90 shadow-sm">
              <h2 className="text-[17px] font-heading font-bold text-[#1E3A2E] uppercase tracking-[-0.01em] mb-3 flex items-center gap-2">
                <ShieldAlert size={16} className="text-[#6B8F56]" />
                <span>Catalog Status</span>
              </h2>

              {stats.unavailableProductsCount > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-[8px] text-[12px] text-amber-800 mb-3">
                  <strong>{stats.unavailableProductsCount} catalog platters</strong> are currently set to unavailable. If assigned to active meal plans, customers will be prompted to swap or choose alternatives.
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[8px] text-[12px] text-emerald-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>All assigned catalog products are active and in stock.</span>
                </div>
              )}

              <div className="text-[12px] text-stone-600 space-y-1.5 pt-2 border-t border-stone-100">
                <div className="flex justify-between">
                  <span>Available Meal Plans:</span>
                  <strong className="text-[#1E3A2E]">{plans.filter((p) => p.status === "published").length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Draft Configurations:</span>
                  <strong className="text-[#1E3A2E]">{plans.filter((p) => p.status === "draft").length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Prepaid Customer Subscriptions:</span>
                  <strong className="text-[#1E3A2E]">{subscriptions.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBSECTION 2: MEAL PLANS LIST */}
      {/* ===================================================================== */}
      {activeTab === "plans" && (
        <div className="bg-white rounded-[10px] border border-stone-200/90 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-heading font-bold text-[#1E3A2E] uppercase tracking-[-0.01em]">
                Meal Plans & Packages
              </h2>
              <p className="text-[13px] text-stone-500 font-body">
                Manage 7-day, 14-day, 30-day, and custom-duration meal subscriptions.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreatePlanModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1E3A2E] hover:bg-[#162d22] text-white text-[12px] font-heading font-semibold uppercase tracking-[0.06em] rounded-[6px] transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Meal Plan</span>
            </button>
          </div>

          {/* Plans Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[#1E3A2E] text-[11px] font-heading font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Plan Name & Details</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Pricing Mode</th>
                  <th className="py-3 px-4">Package Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400">
                      No meal plans created yet. Click &quot;Create Meal Plan&quot; to add your first package.
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {plan.image && (
                            <div className="relative w-10 h-10 rounded-[6px] overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                              <Image
                                src={plan.image}
                                alt={plan.name}
                                fill
                                unoptimized={Boolean(plan.image.startsWith("http") || plan.image.startsWith("/uploads/"))}
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <span className="font-heading font-bold text-[#1E3A2E] block">
                              {plan.name}
                            </span>
                            <span className="text-[11px] text-stone-500 font-mono">
                              /{plan.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F8F5E9] text-[#1E3A2E] text-[11px] font-heading font-semibold uppercase tracking-wider">
                          {plan.durationDays} Days
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[12px] text-stone-600 capitalize">
                        {plan.pricingMode.replace(/_/g, " ")}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-heading font-bold text-[#1E3A2E]">
                          ₹{plan.basePrice}
                          {plan.basePriceAed && (
                            <span className="text-[11px] text-stone-500 font-normal ml-1">
                              (AED {plan.basePriceAed.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-heading font-bold uppercase tracking-wider ${
                            plan.status === "published"
                              ? "bg-emerald-100 text-emerald-800"
                              : plan.status === "draft"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {plan.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlanId(plan.id);
                              setActiveTab("planner");
                            }}
                            className="p-1.5 text-stone-600 hover:text-[#1E3A2E] hover:bg-stone-100 rounded transition-colors"
                            title="Open in Day-by-Day Menu Planner"
                          >
                            <Calendar size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditPlanModal(plan)}
                            className="p-1.5 text-stone-600 hover:text-[#1E3A2E] hover:bg-stone-100 rounded transition-colors"
                            title="Edit Plan Settings"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicatePlan(plan.id)}
                            className="p-1.5 text-stone-600 hover:text-[#1E3A2E] hover:bg-stone-100 rounded transition-colors"
                            title="Duplicate Plan"
                          >
                            <Copy size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePlan(plan)}
                            className="p-1.5 text-stone-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Delete Plan"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBSECTION 3: MENU PLANNER (DAY-BY-DAY BUILDER) */}
      {/* ===================================================================== */}
      {activeTab === "planner" && (
        <div className="space-y-6">
          {/* Plan Selector & Quick Productivity Controls */}
          <div className="bg-white p-5 rounded-[10px] border border-stone-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="planner-plan-select" className="text-[12px] font-heading font-semibold uppercase text-stone-600">
                Editing Plan:
              </label>
              <select
                id="planner-plan-select"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="px-3 py-1.5 rounded-[6px] border border-stone-300 font-heading font-bold text-[#1E3A2E] bg-white text-[13px] focus:outline-none focus:border-[#1E3A2E]"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.durationDays} Days - {p.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {currentSelectedPlan && (
              <div className="flex flex-wrap items-center gap-2">
                {currentSelectedPlan.durationDays > 7 && (
                  <button
                    type="button"
                    onClick={handleCopyPreviousWeek}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-[#1E3A2E] rounded-[6px] text-[11px] font-heading font-semibold uppercase tracking-wider transition-colors"
                    title="Repeat Day 1-7 schedule across all subsequent weeks"
                  >
                    <Copy size={13} />
                    <span>Repeat Week Across Duration</span>
                  </button>
                )}

                <Link
                  href={`/meal-club`}
                  target="_blank"
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-stone-300 hover:border-[#1E3A2E] text-[#1E3A2E] rounded-[6px] text-[11px] font-heading font-semibold uppercase tracking-wider transition-colors"
                >
                  <Eye size={13} />
                  <span>Preview Customer View</span>
                </Link>
              </div>
            )}
          </div>

          {/* Day By Day Schedule Grid */}
          {currentSelectedPlan ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[13px] text-stone-500 font-body">
                  Configuring <strong>{currentSelectedPlan.durationDays} Days</strong> for &quot;{currentSelectedPlan.name}&quot;. Click any platter to swap with existing products from the catalog.
                </span>
                <span className="text-[12px] font-mono font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded">
                  {currentSelectedPlan.schedule.length} Days Configured
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentSelectedPlan.schedule.map((day) => (
                  <div
                    key={day.dayNumber}
                    className="bg-white rounded-[10px] border border-stone-200/90 shadow-sm p-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Day Header */}
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
                        <span className="font-heading font-bold text-[13px] text-[#1E3A2E] uppercase">
                          {day.dayLabel || `Day ${day.dayNumber}`}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          Day {day.dayNumber}
                        </span>
                      </div>

                      {/* Meals Assigned to Day */}
                      <div className="space-y-2.5">
                        {day.meals.map((meal, slotIdx) => {
                          const prod = productsById.get(meal.productId);
                          return (
                            <div
                              key={meal.slotKey}
                              className="p-2.5 rounded-[6px] bg-[#F8F5E9]/50 border border-stone-200/70 hover:border-[#1E3A2E] transition-all"
                            >
                              <div className="flex items-center justify-between text-[10px] font-heading font-semibold uppercase text-stone-500 mb-1.5">
                                <span>{meal.slotName}</span>
                                {meal.isSwappable && (
                                  <span className="text-[#6B8F56] text-[9px]">Swappable</span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setPickerTarget({ dayNumber: day.dayNumber, slotIndex: slotIdx });
                                  setProductPickerOpen(true);
                                }}
                                className="w-full text-left flex items-center gap-2.5 group cursor-pointer"
                                title="Click to choose a different platter"
                              >
                                {prod?.image && (
                                  <div className="relative w-9 h-9 rounded bg-white overflow-hidden shrink-0 border border-stone-200">
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
                                  <span className="font-heading font-bold text-[12px] text-[#1E3A2E] group-hover:text-[#6B8F56] transition-colors truncate block">
                                    {prod?.name || "Select Platter..."}
                                  </span>
                                  <div className="flex items-center gap-2 text-[10px] text-stone-500">
                                    <span>₹{prod?.price || 0}</span>
                                    {prod?.nutrition?.calories && (
                                      <span>· {prod.nutrition.calories} cal</span>
                                    )}
                                    {prod?.nutrition?.protein && (
                                      <span>· {prod.nutrition.protein}</span>
                                    )}
                                  </div>
                                </div>
                                <Edit2 size={12} className="text-stone-400 group-hover:text-[#1E3A2E] shrink-0" />
                              </button>

                              {day.meals.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlot(day.dayNumber, slotIdx)}
                                  className="text-[10px] text-red-600 hover:text-red-800 mt-1.5 block"
                                >
                                  Remove slot
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Day Footer Actions */}
                    <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleAddSlotToDay(day.dayNumber)}
                        className="text-[11px] font-heading font-semibold uppercase text-[#1E3A2E] hover:text-[#6B8F56] flex items-center gap-1"
                      >
                        <Plus size={12} />
                        <span>Add Slot</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-stone-400">
              No meal plan selected. Please create or choose a plan first.
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBSECTION 4: PRODUCTS & CATEGORIES */}
      {/* ===================================================================== */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="bg-white rounded-[10px] border border-stone-200/90 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-stone-100">
              <div>
                <h2 className="text-[18px] font-heading font-bold text-[#1E3A2E] uppercase">
                  Meal Club Categories
                </h2>
                <p className="text-[13px] text-stone-500 font-body">
                  Manage categories dynamically (Breakfast, Lunch, Dinner, Snacks, Beverages) without code changes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E3A2E] hover:bg-[#162d22] text-white text-[12px] font-heading font-semibold uppercase tracking-wider rounded-[6px]"
              >
                <Plus size={13} />
                <span>Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-4 rounded-[8px] border transition-all ${
                    cat.isActive ? "bg-white border-stone-200" : "bg-stone-50 border-stone-200/60 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-heading font-bold text-[13px] text-[#1E3A2E] uppercase">
                      {cat.displayName}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                      {cat.id}
                    </span>
                  </div>
                  <p className="text-[12px] text-stone-600 mb-3">{cat.description || "No description provided."}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryModalOpen(true);
                      }}
                      className="text-[#1E3A2E] font-heading font-semibold uppercase hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleCategoryActiveAction(cat.id, !cat.isActive);
                        setCategories((prev) =>
                          prev.map((c) => (c.id === cat.id ? { ...c, isActive: !c.isActive } : c))
                        );
                        showSuccess(`Category status toggled.`);
                        router.refresh();
                      }}
                      className={cat.isActive ? "text-amber-700" : "text-emerald-700"}
                    >
                      {cat.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBSECTION 5: PACKAGE PRICING */}
      {/* ===================================================================== */}
      {activeTab === "pricing" && currentSelectedPlan && (
        <div className="bg-white rounded-[10px] border border-stone-200/90 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-[18px] font-heading font-bold text-[#1E3A2E] uppercase">
              Package Pricing Configuration — {currentSelectedPlan.name}
            </h2>
            <p className="text-[13px] text-stone-500 font-body">
              Configure pricing modes (Fixed, Product-Based, Base Plus Adjustments) and multi-country rates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-[8px] border border-stone-200 bg-[#F8F5E9]/40 space-y-2">
              <span className="text-[11px] font-heading font-bold uppercase text-stone-500">
                Current Pricing Mode
              </span>
              <div className="font-heading font-bold text-[16px] text-[#1E3A2E] capitalize">
                {currentSelectedPlan.pricingMode.replace(/_/g, " ")}
              </div>
              <p className="text-[12px] text-stone-600">
                {currentSelectedPlan.pricingMode === "fixed" &&
                  "Customer pays a flat package rate regardless of individual platter substitutions."}
                {currentSelectedPlan.pricingMode === "product_based" &&
                  "Package total dynamically recalculates as the exact sum of all chosen platters."}
                {currentSelectedPlan.pricingMode === "base_plus_adjustments" &&
                  "Base rate applies, with price deltas added/subtracted when customers swap platters."}
              </p>
            </div>

            <div className="p-4 rounded-[8px] border border-stone-200 space-y-2">
              <span className="text-[11px] font-heading font-bold uppercase text-stone-500">
                India Price (INR)
              </span>
              <div className="text-[24px] font-heading font-800 text-[#1E3A2E]">
                ₹{currentSelectedPlan.basePrice}
              </div>
              {currentSelectedPlan.originalPrice && (
                <span className="text-[12px] text-stone-400 line-through">
                  MRP: ₹{currentSelectedPlan.originalPrice}
                </span>
              )}
            </div>

            <div className="p-4 rounded-[8px] border border-stone-200 space-y-2">
              <span className="text-[11px] font-heading font-bold uppercase text-stone-500">
                UAE Price (AED)
              </span>
              <div className="text-[24px] font-heading font-800 text-[#1E3A2E]">
                AED {currentSelectedPlan.basePriceAed ? currentSelectedPlan.basePriceAed.toFixed(2) : "Not Configured"}
              </div>
              {currentSelectedPlan.originalPriceAed && (
                <span className="text-[12px] text-stone-400 line-through">
                  MRP: AED {currentSelectedPlan.originalPriceAed.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex justify-end">
            <button
              type="button"
              onClick={() => openEditPlanModal(currentSelectedPlan)}
              className="px-4 py-2 bg-[#1E3A2E] text-white text-[12px] font-heading font-semibold uppercase tracking-wider rounded-[6px]"
            >
              Modify Pricing Settings
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBSECTION 6: SWAP RULES */}
      {/* ===================================================================== */}
      {activeTab === "swap_rules" && currentSelectedPlan && (
        <div className="bg-white rounded-[10px] border border-stone-200/90 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-[18px] font-heading font-bold text-[#1E3A2E] uppercase">
              Meal Swap Policies — {currentSelectedPlan.name}
            </h2>
            <p className="text-[13px] text-stone-500 font-body">
              Set customer customization rules, maximum swap allowances, and substitution restrictions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-[8px] border border-stone-200">
              <span className="text-[11px] font-heading font-bold uppercase text-stone-500 block mb-1">
                Swaps Allowed
              </span>
              <strong className={currentSelectedPlan.swapRules.enabled ? "text-emerald-700" : "text-red-700"}>
                {currentSelectedPlan.swapRules.enabled ? "ENABLED" : "DISABLED"}
              </strong>
            </div>

            <div className="p-4 rounded-[8px] border border-stone-200">
              <span className="text-[11px] font-heading font-bold uppercase text-stone-500 block mb-1">
                Max Swaps per Plan
              </span>
              <strong className="text-[#1E3A2E]">
                {currentSelectedPlan.swapRules.maxSwapsPerPlan === 0
                  ? "Unlimited"
                  : `${currentSelectedPlan.swapRules.maxSwapsPerPlan} Swaps`}
              </strong>
            </div>

            <div className="p-4 rounded-[8px] border border-stone-200">
              <span className="text-[11px] font-heading font-bold uppercase text-stone-500 block mb-1">
                Cross-Category Swaps
              </span>
              <strong className={currentSelectedPlan.swapRules.allowCrossCategory ? "text-emerald-700" : "text-stone-700"}>
                {currentSelectedPlan.swapRules.allowCrossCategory ? "Permitted" : "Category-Restricted"}
              </strong>
            </div>

            <div className="p-4 rounded-[8px] border border-stone-200">
              <span className="text-[11px] font-heading font-bold uppercase text-stone-500 block mb-1">
                Swap Deadline
              </span>
              <strong className="text-[#1E3A2E]">
                {currentSelectedPlan.swapRules.deadlineHours === 0
                  ? "Anytime prior to confirmation"
                  : `${currentSelectedPlan.swapRules.deadlineHours}h before scheduled delivery`}
              </strong>
            </div>

            <div className="p-4 rounded-[8px] border border-stone-200">
              <span className="text-[11px] font-heading font-bold uppercase text-stone-500 block mb-1">
                Price Difference Handling
              </span>
              <strong className="text-[#1E3A2E] capitalize">
                {(currentSelectedPlan.swapRules.priceDifferenceMode || "none").replace(/_/g, " ")}
              </strong>
            </div>

            <div className="p-4 rounded-[8px] border border-stone-200">
              <span className="text-[11px] font-heading font-bold uppercase text-stone-500 block mb-1">
                Order Lock Policy
              </span>
              <strong className="text-emerald-800">
                Strict Server Lock on Confirmation
              </strong>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex justify-end">
            <button
              type="button"
              onClick={() => openEditPlanModal(currentSelectedPlan)}
              className="px-4 py-2 bg-[#1E3A2E] text-white text-[12px] font-heading font-semibold uppercase tracking-wider rounded-[6px]"
            >
              Update Swap Rules
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBSECTION 7 & 8: SUBSCRIPTIONS & CONFIRMED MEAL ORDERS */}
      {/* ===================================================================== */}
      {(activeTab === "subscriptions" || activeTab === "orders") && (
        <div className="bg-white rounded-[10px] border border-stone-200/90 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-heading font-bold text-[#1E3A2E] uppercase">
                {activeTab === "orders" ? "Confirmed Meal Orders (Locked)" : "Customer Subscriptions"}
              </h2>
              <p className="text-[13px] text-stone-500 font-body">
                {activeTab === "orders"
                  ? "Review permanently locked customer meal orders. Only authorized admins can make corrections."
                  : "All customer memberships, dates, and order lock statuses."}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[#1E3A2E] text-[11px] font-heading font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Dates & Duration</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Order Lock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400">
                      No customer subscriptions recorded yet.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <strong className="text-[#1E3A2E] block">{sub.customerName}</strong>
                        <span className="text-[11px] text-stone-500 font-mono">{sub.customerPhone}</span>
                        <span className="text-[11px] text-stone-400 block truncate max-w-[200px]">
                          {sub.deliveryAddress}, {sub.city}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-heading font-semibold text-[#1E3A2E] block">
                          {sub.planName}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          {sub.planDuration} Days ({sub.country})
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[12px] text-stone-600">
                        {sub.startDate} to {sub.endDate}
                      </td>

                      <td className="py-3 px-4 font-heading font-bold text-[#1E3A2E]">
                        {sub.currency === "AED" ? `AED ${sub.totalAmount.toFixed(2)}` : `₹${sub.totalAmount}`}
                      </td>

                      <td className="py-3 px-4">
                        {sub.orderLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-heading font-bold uppercase tracking-wider">
                            <Lock size={10} />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-heading font-bold uppercase tracking-wider">
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={sub.status}
                          onChange={async (e) => {
                            const newSt = e.target.value as MealSubscription["status"];
                            await updateSubscriptionStatusAction(sub.id, newSt);
                            setSubscriptions((prev) =>
                              prev.map((s) => (s.id === sub.id ? { ...s, status: newSt } : s))
                            );
                            showSuccess(`Status updated to ${newSt}.`);
                          }}
                          className="px-2 py-1 rounded border border-stone-200 text-[11px] font-heading font-semibold uppercase bg-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <Link
                            href={`/meal-club/order/${sub.id}`}
                            target="_blank"
                            className="text-[11px] font-heading font-semibold uppercase text-[#1E3A2E] hover:underline"
                          >
                            View Schedule →
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              const firstSlot = (sub.dailySchedule || sub.snapshotSchedule)?.[0] || { dayNumber: 1, slotKey: "breakfast", productName: "Item 1" };
                              setCorrectionTarget({
                                subId: sub.id,
                                dayNumber: firstSlot.dayNumber,
                                slotKey: firstSlot.slotKey,
                                currentProductName: firstSlot.productName,
                              });
                              setCorrectionProductId("");
                              setCorrectionReason("");
                              setCorrectionModalOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-[#1E3A2E] text-[10px] font-heading font-bold uppercase tracking-wider transition-colors"
                            title="Authorized administrative correction with permanent audit log"
                          >
                            Correct
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBSECTION 9: SETTINGS */}
      {/* ===================================================================== */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-[10px] border border-stone-200/90 shadow-sm p-6 space-y-4">
          <h2 className="text-[18px] font-heading font-bold text-[#1E3A2E] uppercase">
            Meal Club System Settings
          </h2>
          <p className="text-[13px] text-stone-500 font-body">
            General operational rules, customer support contact mechanisms, and order locking policy.
          </p>

          <div className="p-4 bg-stone-50 rounded-[8px] border border-stone-200 text-[13px] space-y-2">
            <h3 className="font-heading font-bold text-[#1E3A2E] uppercase">
              Critical Order Locking Enforcement
            </h3>
            <p className="text-stone-600 leading-relaxed">
              When a customer confirms their meal package, all selections are written to historical snapshots and locked server-side. Customer swap endpoints automatically reject any alteration attempts on confirmed orders. Authorized administrators can make exceptional corrections with a mandatory audit record.
            </p>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE / EDIT MEAL PLAN */}
      {/* ===================================================================== */}
      {planModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[12px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-[18px] font-heading font-bold text-[#1E3A2E] uppercase">
                {editingPlan.id ? "Edit Meal Plan" : "Create New Meal Plan"}
              </h3>
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlanForm} className="space-y-4">
              {editingPlan.id && <input type="hidden" name="id" value={editingPlan.id} />}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingPlan.name}
                    placeholder="e.g. 7-Day Everyday Breakfast Club"
                    className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] focus:outline-none focus:border-[#1E3A2E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    name="slug"
                    required
                    defaultValue={editingPlan.slug}
                    placeholder="e.g. 7-day-everyday-breakfast-club"
                    className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] font-mono focus:outline-none focus:border-[#1E3A2E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  name="subtitle"
                  defaultValue={editingPlan.subtitle}
                  placeholder="e.g. 7 mornings of slow-release oat jars & parfait"
                  className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] focus:outline-none focus:border-[#1E3A2E]"
                />
              </div>

              <div>
                <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingPlan.description}
                  className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] focus:outline-none focus:border-[#1E3A2E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    name="durationDays"
                    min={1}
                    required
                    defaultValue={editingPlan.durationDays}
                    className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] font-heading font-bold text-[#1E3A2E]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                    Pricing Mode
                  </label>
                  <select
                    name="pricingMode"
                    defaultValue={editingPlan.pricingMode}
                    className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] bg-white"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="product_based">Product-Based (Sum of items)</option>
                    <option value="base_plus_adjustments">Base Price + Adjustments</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                    Publication Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingPlan.status}
                    className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] bg-white font-heading font-bold"
                  >
                    <option value="draft">Draft (Admin only)</option>
                    <option value="published">Published (Customer live)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                    India Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="basePrice"
                    defaultValue={editingPlan.basePrice}
                    className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                    India MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="originalPrice"
                    defaultValue={editingPlan.originalPrice ?? ""}
                    className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                    UAE Price (AED)
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="basePriceAed"
                    defaultValue={editingPlan.basePriceAed ?? ""}
                    className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                    UAE MRP (AED)
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="originalPriceAed"
                    defaultValue={editingPlan.originalPriceAed ?? ""}
                    className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-[6px] text-[12px] font-heading font-semibold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-[#1E3A2E] hover:bg-[#162d22] text-white rounded-[6px] text-[12px] font-heading font-semibold uppercase tracking-wider disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Meal Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PRODUCT SELECTOR FOR MENU PLANNER */}
      {/* ===================================================================== */}
      {productPickerOpen && pickerTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[12px] max-w-xl w-full max-h-[85vh] overflow-y-auto p-5 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-[16px] font-heading font-bold text-[#1E3A2E] uppercase">
                  Select Platter for Day {pickerTarget.dayNumber}
                </h3>
                <p className="text-[12px] text-stone-500 font-body">
                  Choose an existing platter from the PLATTEROBE catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProductPickerOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search platters..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-[6px] border border-stone-300 text-[13px]"
              />
              <select
                value={pickerCategoryFilter}
                onChange={(e) => setPickerCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-[6px] border border-stone-300 text-[12px] bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Products List */}
            <div className="divide-y divide-stone-100 max-h-[50vh] overflow-y-auto">
              {allProducts
                .filter((p) => {
                  const matchesS =
                    p.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                    p.slug.toLowerCase().includes(pickerSearch.toLowerCase());
                  const matchesC = pickerCategoryFilter === "all" || p.category === pickerCategoryFilter;
                  return matchesS && matchesC;
                })
                .map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleScheduleProductSelect(prod.id)}
                    className="w-full text-left py-2.5 px-2 hover:bg-[#F8F5E9]/60 rounded flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {prod.image && (
                        <div className="relative w-10 h-10 rounded overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                          <Image
                            src={prod.image}
                            alt={prod.name}
                            fill
                            unoptimized={Boolean(prod.image.startsWith("http") || prod.image.startsWith("/uploads/"))}
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <strong className="font-heading font-bold text-[#1E3A2E] text-[13px] block">
                          {prod.name}
                        </strong>
                        <span className="text-[11px] text-stone-500 font-body">
                          ₹{prod.price} {prod.nutrition?.calories ? `· ${prod.nutrition.calories} cal` : ""} {prod.nutrition?.protein ? `· ${prod.nutrition.protein}` : ""}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-heading font-semibold uppercase text-[#1E3A2E] bg-stone-100 px-2 py-1 rounded">
                      Assign
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CATEGORY CREATE / EDIT */}
      {/* ===================================================================== */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h3 className="text-[16px] font-heading font-bold text-[#1E3A2E] uppercase">
                {editingCategory ? "Edit Category" : "New Meal Category"}
              </h3>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="text-stone-400"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fd.append("isEditing", editingCategory ? "true" : "false");
                const res = await saveMealCategoryAction(fd);
                if (res.error) {
                  showError(res.error);
                } else if (res.category) {
                  setCategories((prev) => {
                    const idx = prev.findIndex((c) => c.id === res.category!.id);
                    if (idx !== -1) {
                      const copy = [...prev];
                      copy[idx] = res.category!;
                      return copy;
                    }
                    return [...prev, res.category!];
                  });
                  setCategoryModalOpen(false);
                  showSuccess(`Category saved.`);
                  router.refresh();
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                  Category ID (Slug) *
                </label>
                <input
                  type="text"
                  name="id"
                  required
                  readOnly={Boolean(editingCategory)}
                  defaultValue={editingCategory?.id || ""}
                  placeholder="e.g. lunch, dinner, snacks"
                  className="w-full px-3 py-1.5 rounded-[6px] border border-stone-300 text-[13px] font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  name="displayName"
                  required
                  defaultValue={editingCategory?.displayName || ""}
                  placeholder="e.g. Midday Plates"
                  className="w-full px-3 py-1.5 rounded-[6px] border border-stone-300 text-[13px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingCategory?.description || ""}
                  className="w-full px-3 py-1.5 rounded-[6px] border border-stone-300 text-[13px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-stone-300 text-[12px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#1E3A2E] text-white text-[12px] font-heading font-semibold uppercase"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADMINISTRATIVE MEAL CORRECTION */}
      {/* ===================================================================== */}
      {correctionModalOpen && correctionTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] max-w-lg w-full p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-amber-600" size={20} />
                <h3 className="text-[16px] font-heading font-bold text-[#1E3A2E] uppercase">
                  Authorized Meal Correction
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCorrectionModalOpen(false);
                  setCorrectionTarget(null);
                }}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            {(() => {
              const targetSub = subscriptions.find((s) => s.id === correctionTarget.subId);
              const scheduleList = targetSub?.dailySchedule || targetSub?.snapshotSchedule || [];
              const days: number[] = scheduleList.length > 0
                ? Array.from(new Set(scheduleList.map((s) => s.dayNumber))).sort((a, b) => a - b)
                : Array.from({ length: targetSub?.planDuration || 7 }, (_, i) => i + 1);

              const availableSlotsForDay = scheduleList.length > 0
                ? scheduleList.filter((s) => s.dayNumber === correctionTarget.dayNumber)
                : [{ slotKey: "breakfast", slotName: "Breakfast", productName: "Platter" }];

              return (
                <form onSubmit={handleExecuteCorrection} className="space-y-4">
                  <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-[8px] text-[12px] text-amber-900 space-y-1">
                    <p className="font-semibold">Subscription: {targetSub?.customerName} ({targetSub?.id})</p>
                    <p className="text-[11px] text-amber-800">
                      Administrative changes bypass customer lockouts and write an immutable audit entry to <code>meal_audit_logs</code>.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                        Select Day *
                      </label>
                      <select
                        value={correctionTarget.dayNumber}
                        onChange={(e) => {
                          const d = parseInt(e.target.value, 10);
                          const matchingSlots = scheduleList.filter((s) => s.dayNumber === d);
                          const first = matchingSlots[0];
                          setCorrectionTarget({
                            ...correctionTarget,
                            dayNumber: d,
                            slotKey: first?.slotKey || "breakfast",
                            currentProductName: first?.productName || "Unknown",
                          });
                        }}
                        className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] bg-white font-medium"
                      >
                        {days.map((d) => (
                          <option key={d} value={d}>
                            Day {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                        Meal Slot *
                      </label>
                      <select
                        value={correctionTarget.slotKey}
                        onChange={(e) => {
                          const sk = e.target.value;
                          const found = scheduleList.find(
                            (s) => s.dayNumber === correctionTarget.dayNumber && s.slotKey === sk
                          );
                          setCorrectionTarget({
                            ...correctionTarget,
                            slotKey: sk,
                            currentProductName: found?.productName || "Unknown",
                          });
                        }}
                        className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] bg-white capitalize"
                      >
                        {availableSlotsForDay.map((slot) => (
                          <option key={slot.slotKey} value={slot.slotKey}>
                            {slot.slotName || slot.slotKey} ({slot.productName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-2.5 bg-stone-50 rounded-[6px] text-[12px] text-stone-600 border border-stone-200">
                    <span className="font-heading font-semibold uppercase text-stone-500 text-[10px] block">
                      Currently Assigned:
                    </span>
                    <strong className="text-[#1E3A2E]">{correctionTarget.currentProductName}</strong>
                  </div>

                  <div>
                    <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                      Replacement Platter *
                    </label>
                    <select
                      value={correctionProductId}
                      onChange={(e) => setCorrectionProductId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] bg-white font-medium"
                    >
                      <option value="">-- Choose replacement from catalog --</option>
                      {allProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.seriesNo || p.id}) - ₹{p.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-heading font-semibold uppercase text-stone-600 block mb-1">
                      Mandatory Reason for Correction *
                    </label>
                    <textarea
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      required
                      rows={2}
                      placeholder="e.g. Customer called support requesting nut-free swap after order locked"
                      className="w-full px-3 py-2 rounded-[6px] border border-stone-300 text-[13px] focus:outline-none focus:border-[#1E3A2E]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => {
                        setCorrectionModalOpen(false);
                        setCorrectionTarget(null);
                      }}
                      className="px-3.5 py-1.5 rounded border border-stone-300 text-[12px] font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-4 py-1.5 rounded bg-[#1E3A2E] hover:bg-[#162C22] text-white text-[12px] font-heading font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors"
                    >
                      {isPending ? "Applying..." : "Log & Apply Correction"}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
