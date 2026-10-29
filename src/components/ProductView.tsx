"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/data/products";
import { getProductImageUrl } from "@/data/products";
import ProductImage from "@/components/ProductImage";
import { getCategoryDisplayName } from "@/data/categories";
import { useCountry } from "@/components/CountryProvider";
import {
  getCountryPrice,
  getCountryOriginalPrice,
  formatPrice,
  isProductAvailableInCountry,
  isProductPublishedInCountry,
  getCountryName,
} from "@/lib/country";
import NutritionGrid from "@/components/NutritionGrid";
import IngredientsList from "@/components/IngredientsList";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Globe, ArrowRight, AlertCircle } from "lucide-react";

interface ProductViewProps {
  product: Product;
}

export default function ProductView({ product }: ProductViewProps) {
  const { country, setCountry, openSelector } = useCountry();
  const imageUrl = getProductImageUrl(product.image, product.updatedAt);

  const currentCountryName = getCountryName(country);
  const isPublished = isProductPublishedInCountry(product, country);
  const isAvailable = isProductAvailableInCountry(product, country);
  const price = getCountryPrice(product, country);
  const originalPrice = getCountryOriginalPrice(product, country);

  const hasDiscount = Boolean(
    originalPrice &&
      price !== null &&
      originalPrice > price
  );

  const discountPercent =
    hasDiscount && originalPrice && price !== null
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
      {/* Back Navigation & Category badge */}
      <div className="mb-6 md:mb-10 flex items-center justify-between">
        <Link
          href="/menu"
          className="inline-flex items-center gap-1.5 text-[12px] tracking-[0.08em] uppercase text-[#1E3A2E]/70 hover:text-[#1E3A2E] font-heading font-semibold transition-colors duration-150"
          aria-label="Back to menu"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Menu</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSelector}
            className="text-[11px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] px-2.5 py-1 bg-[#F8F5E9] hover:bg-stone-200/80 rounded-full transition-colors flex items-center gap-1"
            title="Change country"
          >
            <Globe size={12} className="text-[#6B8F56]" />
            <span>{currentCountryName}</span>
          </button>

          <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.1em] text-[#6B8F56] px-2.5 py-1 bg-[#F8F5E9] rounded-full">
            {getCategoryDisplayName(product.category)}
          </span>
        </div>
      </div>

      {/* Product Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        {/* Left: Product Image */}
        <div className="lg:col-span-6">
          <div className="relative aspect-square w-full rounded-[8px] overflow-hidden bg-[#F8F5E9]">
            <ProductImage
              src={imageUrl}
              alt={`${product.name} — PLATTEROBE`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 600px"
              productName={product.name}
            />

            {isPublished && hasDiscount && (
              <div className="absolute top-3 left-3 z-10">
                <span className="px-2.5 py-1 rounded-[4px] bg-[#1E3A2E] text-[#F8F5E9] text-[11px] font-heading font-bold uppercase tracking-[0.05em] shadow-sm">
                  Save {discountPercent}%
                </span>
              </div>
            )}

            {!isPublished && (
              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle size={28} className="text-stone-400 mb-2" />
                <span className="text-[13px] tracking-[0.08em] uppercase text-[#1E3A2E] font-heading font-bold">
                  Not Available in {currentCountryName}
                </span>
                <p className="text-[12px] text-stone-500 font-body mt-1 max-w-xs">
                  This platter has not been launched for {currentCountryName} yet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Editorial Product Details */}
        <div className="lg:col-span-6 flex flex-col">
          {/* Product Name */}
          <h1 className="text-[32px] sm:text-[40px] lg:text-[46px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-[1.08] mb-2 uppercase">
            {product.name}
          </h1>

          {/* If NOT published in current country */}
          {!isPublished ? (
            <div className="my-4 p-5 bg-[#F8F5E9] border border-stone-200 rounded-[10px]">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-[#6B8F56] shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-[15px] font-heading font-bold text-[#1E3A2E] uppercase">
                    Unavailable in {currentCountryName}
                  </h2>
                  <p className="text-[13px] text-stone-600 font-body mt-1 leading-relaxed">
                    This platter is currently only configured for customers in {country === "AE" ? "India" : "UAE"}.
                    Ordering is disabled in {currentCountryName}.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCountry(country === "AE" ? "IN" : "AE")}
                      className="px-4 py-2 bg-[#1E3A2E] text-white text-[12px] font-heading font-semibold uppercase tracking-[0.05em] rounded-[6px] hover:bg-[#162d22] transition-colors"
                    >
                      Switch Country to {country === "AE" ? "India 🇮🇳" : "UAE 🇦🇪"}
                    </button>
                    <Link
                      href="/menu"
                      className="px-4 py-2 bg-white border border-stone-300 text-[#1E3A2E] text-[12px] font-heading font-semibold uppercase tracking-[0.05em] rounded-[6px] hover:border-[#1E3A2E] transition-colors"
                    >
                      Browse Available Platters
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* If published in current country */
            <>
              {/* Price Row: Selling Price + Strikethrough Original Price + Badge */}
              <div className="mb-4 flex flex-wrap items-baseline gap-3">
                <span className="text-[30px] md:text-[34px] font-heading font-800 text-[#1E3A2E] tabular-nums tracking-[-0.02em]">
                  {formatPrice(price, country)}
                </span>

                {hasDiscount && (
                  <>
                    <span className="line-through text-stone-400 text-[18px] md:text-[20px] font-normal tabular-nums">
                      {formatPrice(originalPrice, country)}
                    </span>
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#6B8F56]/15 text-[#1E3A2E] text-[11px] font-heading font-bold uppercase tracking-[0.04em]">
                      Save {discountPercent}%
                    </span>
                  </>
                )}
              </div>

              {/* Short Description */}
              <p className="text-[15px] md:text-[16px] text-[#1A1A1A]/70 font-body leading-[1.65] mb-7">
                {product.description}
              </p>

              {/* Primary Order Action */}
              <div className="mb-10">
                {isAvailable ? (
                  <WhatsAppButton
                    productName={product.name}
                    price={price}
                    country={country}
                    label="Order on WhatsApp"
                    size="large"
                    className="w-full sm:w-auto"
                  />
                ) : (
                  <div className="inline-flex items-center gap-2 px-6 py-3.5 bg-stone-100 border border-stone-300 rounded-[8px] text-stone-500 font-heading font-semibold text-[13px] uppercase tracking-[0.06em]">
                    <span>Sold Out / Unavailable Today</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Nutrition Information */}
          <div className="border-t border-stone-200/80 pt-6 mb-8">
            <h2 className="text-[12px] font-heading font-bold tracking-[0.14em] uppercase text-[#1E3A2E] mb-3">
              Nutrition
            </h2>
            <NutritionGrid nutrition={product.nutrition} weight={product.weight} />
          </div>

          {/* Ingredients */}
          <div className="border-t border-stone-200/80 pt-6 mb-8">
            <h2 className="text-[12px] font-heading font-bold tracking-[0.14em] uppercase text-[#1E3A2E] mb-3">
              Ingredients
            </h2>
            <IngredientsList ingredients={product.ingredients} />
          </div>

          {/* Why You'll Like It */}
          {product.whyYoullLikeIt && (
            <div className="border-t border-stone-200/80 pt-6">
              <h2 className="text-[12px] font-heading font-bold tracking-[0.14em] uppercase text-[#1E3A2E] mb-2">
                Why You&apos;ll Like It
              </h2>
              <p className="text-[14px] text-[#1A1A1A]/65 font-body leading-relaxed">
                {product.whyYoullLikeIt}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
