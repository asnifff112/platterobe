"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/data/products";
import type { MealPlan, MealPlanItemAssignment } from "@/data/meal-club-types";
import { useCountry } from "@/components/CountryProvider";
import { formatPrice, getCountryPrice } from "@/lib/country";
import { normalizeCategoryKey } from "@/data/categories";
import { X, Check, ArrowRightLeft, AlertCircle } from "lucide-react";

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  dayLabel: string;
  currentMeal: MealPlanItemAssignment;
  allProducts: Product[];
  plan: MealPlan;
  onConfirmSwap: (newProductId: string) => void;
}

export default function SwapModal({
  isOpen,
  onClose,
  dayNumber,
  dayLabel,
  currentMeal,
  allProducts,
  plan,
  onConfirmSwap,
}: SwapModalProps) {
  const { country } = useCountry();
  const [selectedProductId, setSelectedProductId] = useState<string>(currentMeal.productId);
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const currentProd = allProducts.find((p) => p.id === currentMeal.productId);
  const currentPrice = currentProd ? (getCountryPrice(currentProd, country) || currentProd.price || 0) : 0;

  // Filter eligible replacement platters based on active swap rules
  const eligibleProducts = allProducts.filter((p) => {
    if (!p.available) return false;

    // Cross-category check with normalization
    if (!plan.swapRules.allowCrossCategory && normalizeCategoryKey(p.category) !== normalizeCategoryKey(currentMeal.category)) {
      return false;
    }

    // Explicit eligible list check
    if (
      plan.swapRules.eligibleProductIds &&
      plan.swapRules.eligibleProductIds.length > 0 &&
      !plan.swapRules.eligibleProductIds.includes(p.id)
    ) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
    }

    return true;
  });

  function handleSelect() {
    if (selectedProductId && selectedProductId !== currentMeal.productId) {
      onConfirmSwap(selectedProductId);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-[14px] max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 bg-[#F8F5E9]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1E3A2E] text-white flex items-center justify-center">
              <ArrowRightLeft size={14} />
            </div>
            <div>
              <h3 className="text-[15px] font-heading font-bold text-[#1E3A2E] uppercase tracking-[-0.01em]">
                Swap Platter — {dayLabel || `Day ${dayNumber}`}
              </h3>
              <p className="text-[11px] text-stone-500 font-body">
                Select an approved alternative platter for your {currentMeal.slotName}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Platter Snapshot */}
        {currentProd && (
          <div className="px-5 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-[12px]">
            <span className="text-stone-500">Currently Scheduled:</span>
            <span className="font-heading font-bold text-[#1E3A2E]">
              {currentProd.name} ({formatPrice(currentPrice, country)})
            </span>
          </div>
        )}

        {/* Search */}
        <div className="p-3 border-b border-stone-100">
          <input
            type="text"
            placeholder="Search replacement platters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] border border-stone-300 text-[13px] focus:outline-none focus:border-[#1E3A2E]"
          />
        </div>

        {/* Replacement Options List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2">
          {eligibleProducts.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-[13px] space-y-1">
              <AlertCircle size={24} className="mx-auto text-stone-300 mb-2" />
              <p>No eligible replacement platters found.</p>
              <p className="text-[11px] text-stone-400">
                Replacements must be in category &quot;{currentMeal.category}&quot;.
              </p>
            </div>
          ) : (
            eligibleProducts.map((prod) => {
              const prodPrice = getCountryPrice(prod, country) ?? 0;
              const priceDelta = prodPrice - currentPrice;
              const isSelected = selectedProductId === prod.id;
              const isCurrent = currentMeal.productId === prod.id;

              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => setSelectedProductId(prod.id)}
                  className={`w-full text-left p-3 rounded-[8px] flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#F8F5E9] border-2 border-[#1E3A2E]"
                      : "hover:bg-stone-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-[6px] overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                      <Image
                        src={prod.image}
                        alt={prod.name}
                        fill
                        unoptimized={Boolean(prod.image.startsWith("http") || prod.image.startsWith("/uploads/"))}
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-[13px] text-[#1E3A2E] truncate">
                          {prod.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-heading font-semibold uppercase bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-stone-500 font-body mt-0.5">
                        <span>{formatPrice(prodPrice, country)}</span>
                        {prod.nutrition?.calories && <span>· {prod.nutrition.calories} cal</span>}
                        {prod.nutrition?.protein && <span>· {prod.nutrition.protein}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {plan.pricingMode === "base_plus_adjustments" && priceDelta !== 0 && (
                      <span
                        className={`text-[11px] font-mono font-semibold block ${
                          priceDelta > 0 ? "text-amber-700" : "text-emerald-700"
                        }`}
                      >
                        {priceDelta > 0 ? `+${formatPrice(priceDelta, country)}` : `-${formatPrice(Math.abs(priceDelta), country)}`}
                      </span>
                    )}

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#1E3A2E] text-white flex items-center justify-center ml-auto mt-1">
                        <Check size={12} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-heading font-semibold uppercase text-stone-600 hover:text-[#1E3A2E]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSelect}
            disabled={selectedProductId === currentMeal.productId}
            className="px-5 py-2 bg-[#1E3A2E] hover:bg-[#162d22] disabled:opacity-40 disabled:hover:bg-[#1E3A2E] text-white text-[12px] font-heading font-semibold uppercase tracking-wider rounded-[6px] transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Confirm Swap
          </button>
        </div>
      </div>
    </div>
  );
}
