"use client";

import React, { useEffect } from "react";
import { useCountry } from "@/components/CountryProvider";
import { SUPPORTED_COUNTRIES, CountryCode } from "@/lib/country";
import { X, Check } from "lucide-react";

export default function CountrySelector() {
  const {
    country,
    setCountry,
    hasSelectedCountry,
    isSelectorOpen,
    closeSelector,
  } = useCountry();

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isSelectorOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSelectorOpen]);

  if (!isSelectorOpen) return null;

  const handleSelect = (code: CountryCode) => {
    setCountry(code);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-selector-title"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-[16px] shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pt-8 pb-5 px-6 text-center border-b border-stone-100 bg-[#F8F5E9]/60">
          {hasSelectedCountry && (
            <button
              onClick={closeSelector}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-[#1E3A2E] rounded-full hover:bg-stone-100 transition-colors"
              aria-label="Close country selector"
            >
              <X size={18} />
            </button>
          )}

          <p className="text-[11px] font-heading font-bold uppercase tracking-[0.16em] text-[#6B8F56] mb-1.5">
            Welcome to PLATTEROBE
          </p>
          <h2
            id="country-selector-title"
            className="text-[22px] sm:text-[24px] font-heading font-800 text-[#1E3A2E] tracking-[-0.02em] uppercase leading-tight"
          >
            Select Your Country
          </h2>
          <p className="text-[13px] text-[#1A1A1A]/65 font-body mt-1 max-w-xs mx-auto">
            Choose your region to see available meal platters, local pricing, and daily kitchen specials.
          </p>
        </div>

        {/* Country Options */}
        <div className="p-6 space-y-3">
          {SUPPORTED_COUNTRIES.map((item) => {
            const isSelected = hasSelectedCountry && country === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleSelect(item.code)}
                className={`
                  w-full flex items-center justify-between p-4 rounded-[12px] border transition-all duration-200 text-left group
                  ${
                    isSelected
                      ? "border-[#1E3A2E] bg-[#F8F5E9]/80 shadow-sm ring-1 ring-[#1E3A2E]"
                      : "border-stone-200 hover:border-[#1E3A2E]/50 hover:bg-[#F8F5E9]/30"
                  }
                `}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-[28px] sm:text-[32px] leading-none select-none">
                    {item.flag}
                  </span>
                  <div>
                    <h3 className="text-[15px] sm:text-[16px] font-heading font-bold text-[#1E3A2E] uppercase tracking-wide group-hover:text-[#6B8F56] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[12px] text-stone-500 font-body">
                      Prices in {item.currency} ({item.currencySymbol})
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-[#1E3A2E] text-white flex items-center justify-center">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-stone-300 group-hover:border-[#1E3A2E] transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 pb-6 pt-1 text-center">
          <p className="text-[11px] text-stone-400 font-body">
            You can change your country preference at any time from the navigation menu.
          </p>
        </div>
      </div>
    </div>
  );
}
