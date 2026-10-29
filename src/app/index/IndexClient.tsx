"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import { useSearchParams } from "next/navigation";
import {
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { lookupSeriesAction, type LookupResult } from "./actions";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useCountry } from "@/components/CountryProvider";
import { formatPrice, getCountryName } from "@/lib/country";

interface IndexClientProps {
  initialCode?: string;
  initialResult?: LookupResult | null;
}

export default function IndexClient({
  initialCode = "",
  initialResult = null,
}: IndexClientProps) {
  const searchParams = useSearchParams();

  const [inputCode, setInputCode] = useState(initialCode);
  const [result, setResult] = useState<LookupResult | null>(initialResult);
  const [hasSearched, setHasSearched] = useState(Boolean(initialResult || initialCode));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Synchronize URL query parameter if it changes
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam && codeParam.trim() !== inputCode.trim()) {
      const clean = codeParam.trim();
      setInputCode(clean);
      performSearch(clean);
    }
  }, [searchParams]);

  function performSearch(codeToSearch: string) {
    const clean = codeToSearch.trim();
    if (!clean) {
      setValidationError("Please enter your product series number.");
      return;
    }

    setValidationError(null);
    setHasSearched(true);

    startTransition(async () => {
      const res = await lookupSeriesAction(clean);
      setResult(res);

      // Keep URL clean and shareable without full page reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("code", clean);
      window.history.replaceState({}, "", newUrl.toString());
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    performSearch(inputCode);
  }

  function handleClear() {
    setInputCode("");
    setResult(null);
    setHasSearched(false);
    setValidationError(null);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("code");
    window.history.replaceState({}, "", newUrl.toString());
  }

  const product = result?.found ? result.product : undefined;
  const { country } = useCountry();

  const activePrice = country === "AE" ? product?.priceAed ?? null : product?.price ?? null;
  const activeOriginalPrice = country === "AE" ? product?.originalPriceAed ?? null : product?.originalPrice ?? null;
  const isAvailableInCountry = product ? (
    country === "AE"
      ? Boolean(product.availableInUae) && product.publishedInUae === "published" && product.priceAed !== null && product.priceAed !== undefined
      : Boolean(product.availableInIndia !== false) && (product.publishedInIndia === "published" || !product.publishedInIndia) && product.price !== null && product.price !== undefined && product.available
  ) : false;
  const hasDiscountInCountry = Boolean(
    activeOriginalPrice &&
      activePrice !== null &&
      activeOriginalPrice > activePrice
  );
  const discountPercentInCountry =
    hasDiscountInCountry && activeOriginalPrice && activePrice !== null
      ? Math.round(((activeOriginalPrice - activePrice) / activeOriginalPrice) * 100)
      : 0;

  const hasNutrition = Boolean(
    product?.nutrition &&
      (product.nutrition.calories !== null ||
        product.nutrition.protein ||
        product.nutrition.carbs ||
        product.nutrition.fat ||
        product.nutrition.fiber)
  );

  const hasIngredients = Boolean(
    product?.ingredients && Array.isArray(product.ingredients) && product.ingredients.length > 0
  );

  return (
    <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* ── Page Hero Header ── */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8F5E9] border border-stone-200 text-[#6B8F56] text-[11px] font-heading font-bold uppercase tracking-[0.12em] mb-3.5">
          <ShieldCheck size={13} className="text-[#6B8F56]" />
          <span>Product Verification</span>
        </div>

        <h1 className="text-[32px] sm:text-[44px] md:text-[48px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-[1.08] uppercase mb-3">
          THE PLATTEROBE INDEX
        </h1>

        <p className="text-[14px] sm:text-[15px] text-[#1A1A1A]/70 font-body leading-relaxed">
          Search any platter’s unique series number to inspect authentic ingredients,
          verified kitchen macros, and genuine specifications.
        </p>
      </div>

      {/* ── Search Input Interface ── */}
      <div className="max-w-xl mx-auto mb-10">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center shadow-sm rounded-[10px] border border-stone-300 focus-within:border-[#1E3A2E] focus-within:ring-2 focus-within:ring-[#1E3A2E]/20 bg-white transition-all overflow-hidden"
        >
          <div className="pl-4 pr-2 text-stone-400 flex items-center pointer-events-none shrink-0">
            <Search size={18} className="text-stone-400" />
          </div>

          <input
            type="text"
            value={inputCode}
            onChange={(e) => {
              setInputCode(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Enter your product series number"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 min-w-0 py-3.5 sm:py-4 px-2 text-[14px] sm:text-[15px] font-mono tracking-wide text-[#1E3A2E] placeholder:text-stone-400 placeholder:normal-case placeholder:font-body placeholder:font-normal focus:outline-none bg-transparent"
            aria-label="Product Series Number"
          />

          {inputCode && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-stone-400 hover:text-stone-700 transition-colors rounded-full shrink-0"
              aria-label="Clear search input"
            >
              <X size={16} />
            </button>
          )}

          <button
            type="submit"
            disabled={isPending || !inputCode.trim()}
            className="m-1.5 px-5 sm:px-6 py-2.5 sm:py-3 bg-[#1E3A2E] hover:bg-[#152a21] disabled:opacity-50 disabled:hover:bg-[#1E3A2E] text-[#F8F5E9] font-heading font-semibold text-[12px] sm:text-[13px] uppercase tracking-[0.06em] rounded-[6px] transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#F8F5E9]/40 border-t-[#F8F5E9] rounded-full animate-spin" />
                <span className="hidden sm:inline">Searching</span>
              </>
            ) : (
              <span>Lookup</span>
            )}
          </button>
        </form>

        {validationError && (
          <p className="mt-2 text-[12px] text-red-600 text-center font-medium">
            {validationError}
          </p>
        )}
      </div>

      {/* ── STATE 1: LOADING STATE ── */}
      {isPending && (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-stone-50/60 rounded-[12px] border border-stone-200 animate-pulse">
          <div className="h-6 w-36 bg-stone-200 rounded mb-4" />
          <div className="h-8 w-3/4 bg-stone-200 rounded mb-6" />
          <div className="aspect-[4/3] w-full bg-stone-200 rounded-[8px] mb-6" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-stone-200 rounded" />
            <div className="h-4 w-5/6 bg-stone-200 rounded" />
          </div>
        </div>
      )}

      {/* ── STATE 2: MATCH FOUND ── */}
      {!isPending && product && (
        <div className="max-w-2xl mx-auto bg-white rounded-[12px] border border-stone-200/90 shadow-sm overflow-hidden animate-fadeIn">
          {/* Top Verification Ribbon */}
          <div className="px-5 py-3 bg-[#1E3A2E] text-[#F8F5E9] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[#6B8F56]" />
              <span className="text-[11px] sm:text-[12px] font-heading font-semibold uppercase tracking-[0.08em]">
                Verified Product Record
              </span>
            </div>
            <span className="font-mono text-[12px] font-bold tracking-widest text-[#D4B789] bg-black/25 px-2.5 py-0.5 rounded break-all">
              {product.seriesNo}
            </span>
          </div>

          {/* Platter Media & Key Identity */}
          <div className="p-5 sm:p-7">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start mb-6">
              {/* Product Image */}
              <div className="sm:col-span-5">
                <div className="relative aspect-square w-full rounded-[8px] overflow-hidden bg-[#F8F5E9] border border-stone-200">
                  <ProductImage
                    src={product.image}
                    alt={`${product.name} — PLATTEROBE`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 300px"
                    productName={product.name}
                  />

                  {hasDiscountInCountry && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#1E3A2E] text-[#F8F5E9] text-[10px] font-heading font-bold uppercase tracking-[0.04em]">
                        Save {discountPercentInCountry}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Core Identifiers */}
              <div className="sm:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.1em] text-[#6B8F56] bg-[#F8F5E9] px-2 py-0.5 rounded">
                      {product.categoryDisplayName}
                    </span>

                    {isAvailableInCountry ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-heading font-semibold uppercase tracking-[0.06em] text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>Available Today</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.06em] text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        Unavailable in {getCountryName(country)}
                      </span>
                    )}
                  </div>

                  <h2 className="text-[24px] sm:text-[28px] font-heading font-800 text-[#1E3A2E] uppercase tracking-[-0.02em] leading-tight mb-2">
                    {product.name}
                  </h2>

                  {product.subtitle && (
                    <p className="text-[12px] sm:text-[13px] text-stone-600 font-body mb-3">
                      {product.subtitle}
                    </p>
                  )}

                  {/* Price Row */}
                  <div className="flex items-baseline gap-2 mb-4 flex-wrap">
                    <span className="text-[24px] sm:text-[26px] font-heading font-800 text-[#1E3A2E] tabular-nums">
                      {formatPrice(activePrice, country)}
                    </span>
                    {hasDiscountInCountry && activeOriginalPrice && (
                      <span className="line-through text-stone-400 text-[15px] font-normal tabular-nums">
                        {formatPrice(activeOriginalPrice, country)}
                      </span>
                    )}
                    {product.weight && (
                      <span className="text-[12px] text-stone-500 font-mono ml-auto">
                        Weight: {product.weight}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ordering & Platter Page CTAs */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  {isAvailableInCountry ? (
                    <WhatsAppButton
                      productName={product.name}
                      price={activePrice}
                      country={country}
                      label="Order on WhatsApp"
                      size="default"
                      className="w-full text-center"
                    />
                  ) : (
                    <div className="w-full text-center py-2.5 px-4 bg-stone-100 border border-stone-200 rounded-[6px] text-stone-500 font-heading font-semibold text-[12px] uppercase">
                      Unavailable in {getCountryName(country)}
                    </div>
                  )}

                  <Link
                    href={`/product/${product.slug}`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[6px] border border-stone-300 hover:border-[#1E3A2E] text-[#1E3A2E] font-heading font-semibold text-[12px] uppercase tracking-[0.05em] transition-colors text-center"
                  >
                    <span>View Platter</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Narrative Description (Only if present in database) */}
            {(product.description || product.shortDescription) && (
              <div className="border-t border-stone-200/80 pt-5 mb-6">
                <h3 className="text-[11px] font-heading font-bold uppercase tracking-[0.12em] text-[#1E3A2E] mb-2">
                  Description
                </h3>
                <p className="text-[14px] text-[#1A1A1A]/80 font-body leading-relaxed">
                  {product.description || product.shortDescription}
                </p>
                {product.whyYoullLikeIt && (
                  <p className="text-[13px] text-stone-600 font-body leading-relaxed mt-2 italic bg-[#F8F5E9]/60 p-3 rounded-[6px] border border-stone-200/60">
                    &ldquo;{product.whyYoullLikeIt}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* Nutrition Breakdown (Only if genuine nutrition data exists in database) */}
            {hasNutrition && (
              <div className="border-t border-stone-200/80 pt-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-heading font-bold uppercase tracking-[0.12em] text-[#1E3A2E]">
                    Nutritional Information
                  </h3>
                  {product.weight && (
                    <span className="text-[11px] font-mono text-stone-500">
                      Portion: {product.weight}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-3 bg-[#F8F5E9] rounded-[6px] border border-stone-200/70 text-center">
                    <span className="block text-[10px] font-heading font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Calories
                    </span>
                    <span className="font-heading font-800 text-[16px] text-[#1E3A2E]">
                      {product.nutrition.calories ? `${product.nutrition.calories} kcal` : "-"}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F8F5E9] rounded-[6px] border border-stone-200/70 text-center">
                    <span className="block text-[10px] font-heading font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Protein
                    </span>
                    <span className="font-heading font-800 text-[16px] text-[#1E3A2E]">
                      {product.nutrition.protein || "-"}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F8F5E9] rounded-[6px] border border-stone-200/70 text-center">
                    <span className="block text-[10px] font-heading font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Carbs
                    </span>
                    <span className="font-heading font-800 text-[16px] text-[#1E3A2E]">
                      {product.nutrition.carbs || "-"}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F8F5E9] rounded-[6px] border border-stone-200/70 text-center">
                    <span className="block text-[10px] font-heading font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Fat
                    </span>
                    <span className="font-heading font-800 text-[16px] text-[#1E3A2E]">
                      {product.nutrition.fat || "-"}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 p-3 bg-[#F8F5E9] rounded-[6px] border border-stone-200/70 text-center">
                    <span className="block text-[10px] font-heading font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                      Fiber
                    </span>
                    <span className="font-heading font-800 text-[16px] text-[#1E3A2E]">
                      {product.nutrition.fiber || "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Whole-Food Ingredients (Only if genuine ingredients exist in database) */}
            {hasIngredients && (
              <div className="border-t border-stone-200/80 pt-5">
                <h3 className="text-[11px] font-heading font-bold uppercase tracking-[0.12em] text-[#1E3A2E] mb-3">
                  Ingredients ({product.ingredients.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-stone-100 border border-stone-200 text-[12px] text-[#1E3A2E] font-medium"
                    >
                      <span>{ing.name}</span>
                      {ing.quantity && (
                        <span className="text-[11px] font-mono text-stone-500">
                          ({ing.quantity}
                          {ing.unit ? ` ${ing.unit}` : ""})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STATE 3: NOT FOUND STATE ── */}
      {!isPending && hasSearched && result && !result.found && (
        <div className="max-w-xl mx-auto p-7 sm:p-9 bg-[#F8F5E9]/80 border border-stone-200 rounded-[12px] text-center animate-fadeIn">
          <div className="w-12 h-12 mx-auto mb-3.5 rounded-full bg-stone-200/70 flex items-center justify-center text-[#1E3A2E]">
            <AlertCircle size={22} />
          </div>

          <h2 className="text-[20px] font-heading font-800 uppercase tracking-[-0.01em] text-[#1E3A2E] mb-2">
            Series Number Not Found
          </h2>

          {result.error ? (
            <p className="text-[14px] text-stone-600 mb-6 leading-relaxed">
              {result.error}
            </p>
          ) : (
            <p className="text-[14px] text-stone-600 mb-6 leading-relaxed max-w-md mx-auto">
              No platter record was found matching{" "}
              <span className="font-mono font-bold text-[#1E3A2E] bg-white px-2 py-0.5 rounded border border-stone-300 break-all">
                {result.code}
              </span>
              . Please verify the series number on your platter label and try again.
            </p>
          )}

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleClear}
              className="px-5 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-[#1E3A2E] font-heading font-semibold text-[12px] uppercase tracking-[0.05em] rounded-[6px] transition-colors cursor-pointer"
            >
              Reset Search
            </button>
            <Link
              href="/menu"
              className="px-5 py-2.5 bg-[#1E3A2E] hover:bg-[#152a21] text-[#F8F5E9] font-heading font-semibold text-[12px] uppercase tracking-[0.05em] rounded-[6px] transition-colors"
            >
              Browse Menu
            </Link>
          </div>
        </div>
      )}

      {/* ── STATE 4: EMPTY INITIAL STATE (No Search Yet) ── */}
      {!isPending && !hasSearched && (
        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          <div className="p-5 rounded-[10px] bg-[#F8F5E9]/60 border border-stone-200/80 flex flex-col items-center sm:items-start">
            <div className="w-8 h-8 rounded-full bg-[#1E3A2E]/10 text-[#1E3A2E] flex items-center justify-center font-mono font-bold text-[13px] mb-3">
              1
            </div>
            <h3 className="font-heading font-bold text-[13px] uppercase text-[#1E3A2E] mb-1 tracking-wide">
              Locate Series No.
            </h3>
            <p className="text-[12px] text-stone-600 leading-relaxed font-body">
              Find the unique Series No. printed on your platter container or packaging label.
            </p>
          </div>

          <div className="p-5 rounded-[10px] bg-[#F8F5E9]/60 border border-stone-200/80 flex flex-col items-center sm:items-start">
            <div className="w-8 h-8 rounded-full bg-[#1E3A2E]/10 text-[#1E3A2E] flex items-center justify-center font-mono font-bold text-[13px] mb-3">
              2
            </div>
            <h3 className="font-heading font-bold text-[13px] uppercase text-[#1E3A2E] mb-1 tracking-wide">
              Enter &amp; Lookup
            </h3>
            <p className="text-[12px] text-stone-600 leading-relaxed font-body">
              Type your exact series identifier into the search box above and click LOOKUP.
            </p>
          </div>

          <div className="p-5 rounded-[10px] bg-[#F8F5E9]/60 border border-stone-200/80 flex flex-col items-center sm:items-start">
            <div className="w-8 h-8 rounded-full bg-[#1E3A2E]/10 text-[#1E3A2E] flex items-center justify-center font-mono font-bold text-[13px] mb-3">
              3
            </div>
            <h3 className="font-heading font-bold text-[13px] uppercase text-[#1E3A2E] mb-1 tracking-wide">
              View Verified Details
            </h3>
            <p className="text-[12px] text-stone-600 leading-relaxed font-body">
              Inspect genuine ingredients, kitchen nutritional macros, and verified platter specifications.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
