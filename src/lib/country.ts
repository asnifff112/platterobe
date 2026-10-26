/**
 * PLATTEROBE Multi-Country Utilities
 * Handles country codes, currency formatting, and country-specific product logic.
 */

import type { Product } from "@/data/products";

export type CountryCode = "IN" | "AE";

export interface CountryConfig {
  code: CountryCode;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  locale: string;
}

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR", currencySymbol: "₹", locale: "en-IN" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currency: "AED", currencySymbol: "AED", locale: "en-AE" },
];

export const COUNTRY_COOKIE_NAME = "platterobe_country";

export const DEFAULT_COUNTRY: CountryCode = "IN";

/**
 * Validates whether a string is a supported country code.
 */
export function isValidCountryCode(code: string | undefined | null): code is CountryCode {
  return code === "IN" || code === "AE";
}

/**
 * Returns configuration for a country code.
 */
export function getCountryConfig(code: CountryCode): CountryConfig {
  return SUPPORTED_COUNTRIES.find((c) => c.code === code)!;
}

/**
 * Returns the selling price for a product in the given country.
 */
export function getCountryPrice(product: Product, country: CountryCode): number | null {
  if (country === "AE") {
    return product.priceAed !== undefined && product.priceAed !== null ? Number(product.priceAed) : null;
  }
  return product.price !== undefined && product.price !== null ? Number(product.price) : null;
}

/**
 * Returns the original/MRP price for a product in the given country.
 */
export function getCountryOriginalPrice(product: Product, country: CountryCode): number | null {
  if (country === "AE") {
    return product.originalPriceAed !== undefined && product.originalPriceAed !== null
      ? Number(product.originalPriceAed)
      : null;
  }
  return product.originalPrice !== undefined && product.originalPrice !== null
    ? Number(product.originalPrice)
    : null;
}

/**
 * Formats a price for display with the correct currency for the given country.
 * India: ₹79 (no decimals for whole numbers)
 * UAE: AED 10.00 (always 2 decimals)
 */
export function formatPrice(price: number | null, country: CountryCode): string {
  if (price === null || price === undefined) return "Price on request";
  if (country === "AE") {
    return `AED ${price.toFixed(2)}`;
  }
  // India: match existing format — ₹79 for integers, ₹79.50 for decimals
  return `₹${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

/**
 * Checks if a product is available for ordering in the given country.
 * A product is available only when:
 * 1. It is marked available in that country
 * 2. Its publication status is "published" for that country
 * 3. It has a configured price in that country's currency
 */
export function isProductAvailableInCountry(product: Product, country: CountryCode): boolean {
  if (country === "AE") {
    return (
      Boolean(product.availableInUae) &&
      product.publishedInUae === "published" &&
      product.priceAed !== null &&
      product.priceAed !== undefined
    );
  }
  return (
    product.available !== false &&
    product.availableInIndia !== false &&
    (product.publishedInIndia === "published" || product.publishedInIndia === undefined) &&
    product.price !== null &&
    product.price !== undefined
  );
}

/**
 * Checks if a product is published for the given country.
 * Used for direct page access: if not published in the country, show not-found/unavailable.
 */
export function isProductPublishedInCountry(product: Product, country: CountryCode): boolean {
  if (country === "AE") {
    return product.publishedInUae === "published" && product.priceAed !== null && product.priceAed !== undefined;
  }
  return (product.publishedInIndia === "published" || product.publishedInIndia === undefined) && product.price !== null && product.price !== undefined;
}

/**
 * Checks if a product is visible (should appear in listings) in the given country.
 * Must be published, priced, and available in that country.
 */
export function isProductVisibleInCountry(product: Product, country: CountryCode): boolean {
  return isProductAvailableInCountry(product, country);
}

/**
 * Returns the country name for display.
 */
export function getCountryName(code: CountryCode): string {
  return code === "AE" ? "UAE" : "India";
}
