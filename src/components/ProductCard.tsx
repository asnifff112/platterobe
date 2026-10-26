"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/data/products";
import { getProductImageUrl } from "@/data/products";
import { useCountry } from "@/components/CountryProvider";
import {
  getCountryPrice,
  getCountryOriginalPrice,
  formatPrice,
  isProductAvailableInCountry,
} from "@/lib/country";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { country } = useCountry();
  const imageUrl = getProductImageUrl(product.image, product.updatedAt);

  const price = getCountryPrice(product, country);
  const originalPrice = getCountryOriginalPrice(product, country);
  const isAvailable = isProductAvailableInCountry(product, country);

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
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E] focus-visible:ring-offset-2 rounded-[8px]"
      aria-label={`View ${product.name} — ${formatPrice(price, country)}`}
    >
      {/* 1. Product Image Container */}
      <div className="relative aspect-square w-full rounded-[8px] overflow-hidden bg-[#F8F5E9] mb-2.5 sm:mb-3.5">
        <Image
          key={`${product.id}-${imageUrl}`}
          src={imageUrl}
          unoptimized={Boolean(imageUrl.startsWith("data:") || imageUrl.startsWith("/uploads/") || imageUrl.includes("?v="))}
          alt={`${product.name} — PLATTEROBE`}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Discount Badge on Image */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 z-10">
            <span className="px-1.5 sm:px-2 py-0.5 rounded-[4px] bg-[#1E3A2E] text-[#F8F5E9] text-[9px] sm:text-[10px] font-heading font-bold uppercase tracking-[0.04em] shadow-sm">
              Save {discountPercent}%
            </span>
          </div>
        )}

        {/* Unavailable Overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/85 flex items-center justify-center p-2 text-center">
            <span className="text-[10px] sm:text-[11px] tracking-[0.08em] uppercase text-[#1A1A1A]/70 font-semibold font-heading">
              Currently Unavailable
            </span>
          </div>
        )}
      </div>

      {/* 2. Product Name & Pricing Information */}
      <div className="flex flex-col flex-1 justify-between space-y-1 sm:space-y-1.5">
        <div>
          <h3 className="font-heading font-700 text-[13px] sm:text-[15px] md:text-[16px] text-[#1E3A2E] leading-snug tracking-[-0.01em] uppercase group-hover:text-[#6B8F56] transition-colors duration-200 line-clamp-2">
            {product.name}
          </h3>

          {product.subtitle && (
            <p className="text-[10px] sm:text-[11px] text-[#1A1A1A]/50 font-body truncate mt-0.5 hidden xs:block">
              {product.subtitle}
            </p>
          )}
        </div>

        {/* Price Row: Original Price Strikethrough + Selling Price */}
        <div className="pt-1 flex flex-wrap items-baseline justify-between gap-x-1.5 gap-y-0.5">
          <div className="flex items-baseline gap-1.5">
            {/* Active Selling Price */}
            <span className="font-heading font-800 text-[14px] sm:text-[16px] md:text-[17px] text-[#1E3A2E] tabular-nums">
              {formatPrice(price, country)}
            </span>

            {/* Original MRP Strikethrough Price */}
            {hasDiscount && (
              <span className="line-through text-stone-400 text-[11px] sm:text-[12px] font-normal tabular-nums">
                {formatPrice(originalPrice, country)}
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-heading font-semibold tracking-[0.04em] uppercase text-[#1E3A2E]/60 group-hover:text-[#1E3A2E] transition-colors duration-200">
            <span>Details</span>
            <span
              aria-hidden="true"
              className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
