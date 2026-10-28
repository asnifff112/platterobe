"use client";

import type { PlanNutritionSummary } from "@/data/meal-club-types";
import { Activity, Flame, ShieldAlert } from "lucide-react";

interface NutritionSummaryCardProps {
  summary: PlanNutritionSummary;
  mealsPerDay: number;
}

export default function NutritionSummaryCard({ summary, mealsPerDay }: NutritionSummaryCardProps) {
  return (
    <div className="bg-white rounded-[12px] border border-stone-200/90 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[#6B8F56]" />
          <h3 className="text-[14px] font-heading font-bold text-[#1E3A2E] uppercase tracking-wide">
            Nutrition Profile
          </h3>
        </div>
        <span className="text-[11px] font-mono text-stone-500 bg-[#F8F5E9] px-2.5 py-0.5 rounded">
          {mealsPerDay === 1 ? "1 Meal / Day Average" : `${mealsPerDay} Meals / Day Average`}
        </span>
      </div>

      {summary.isIncomplete && (
        <div className="p-2.5 rounded-[6px] bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
          <ShieldAlert size={14} className="shrink-0 text-amber-600" />
          <span>Some items in this schedule do not have complete nutritional values recorded yet.</span>
        </div>
      )}

      {/* Grid of Macros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-3 rounded-[8px] bg-stone-50 border border-stone-100">
          <div className="flex items-center justify-center gap-1 text-[11px] font-heading font-semibold uppercase text-stone-500 mb-1">
            <Flame size={12} className="text-amber-500" />
            <span>Daily Calories</span>
          </div>
          <span className="text-[20px] font-heading font-800 text-[#1E3A2E] tabular-nums">
            {summary.averageDailyCalories ? `${summary.averageDailyCalories} kcal` : "N/A"}
          </span>
        </div>

        <div className="p-3 rounded-[8px] bg-stone-50 border border-stone-100">
          <div className="text-[11px] font-heading font-semibold uppercase text-stone-500 mb-1">
            Protein
          </div>
          <span className="text-[20px] font-heading font-800 text-emerald-800 tabular-nums">
            {summary.averageDailyProtein ? `${summary.averageDailyProtein}g` : "N/A"}
          </span>
        </div>

        <div className="p-3 rounded-[8px] bg-stone-50 border border-stone-100">
          <div className="text-[11px] font-heading font-semibold uppercase text-stone-500 mb-1">
            Carbohydrates
          </div>
          <span className="text-[20px] font-heading font-800 text-stone-700 tabular-nums">
            {summary.averageDailyCarbs ? `${summary.averageDailyCarbs}g` : "N/A"}
          </span>
        </div>

        <div className="p-3 rounded-[8px] bg-stone-50 border border-stone-100">
          <div className="text-[11px] font-heading font-semibold uppercase text-stone-500 mb-1">
            Healthy Fats
          </div>
          <span className="text-[20px] font-heading font-800 text-stone-700 tabular-nums">
            {summary.averageDailyFat ? `${summary.averageDailyFat}g` : "N/A"}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-stone-500 font-body text-center leading-relaxed">
        *Calculated strictly from real ingredient specifications. Clean whole-food macros with zero added preservatives.
      </p>
    </div>
  );
}
