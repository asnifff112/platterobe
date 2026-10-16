"use server";

import { getProductBySeriesNo } from "@/lib/db";
import { normalizeSeriesNo, isValidSeriesNo } from "@/lib/series";
import { getCategoryDisplayName } from "@/data/categories";
import { getProductImageUrl } from "@/data/products";

export interface PublicIndexProduct {
  name: string;
  seriesNo: string;
  slug: string;
  category: string;
  categoryDisplayName: string;
  price: number | null;
  originalPrice: number | null;
  hasDiscount: boolean;
  discountPercent: number;
  available: boolean;
  image: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  whyYoullLikeIt: string;
  weight: string | null;
  nutrition: {
    calories: number | null;
    protein: string | null;
    carbs: string | null;
    fat: string | null;
    fiber: string | null;
  };
  ingredients: Array<{
    name: string;
    quantity: string;
    unit?: string;
  }>;
}

export interface LookupResult {
  found: boolean;
  code: string;
  product?: PublicIndexProduct;
  error?: string;
}

/**
 * Server action to securely lookup a product by Series Number for the Public Index.
 * Strictly sanitizes output: excludes internal database IDs, user credentials, and admin metadata.
 */
export async function lookupSeriesAction(rawCode: string): Promise<LookupResult> {
  const code = normalizeSeriesNo(rawCode);

  if (!code) {
    return {
      found: false,
      code: "",
      error: "Please enter a valid series number (e.g. PLTR.001).",
    };
  }

  if (!isValidSeriesNo(code)) {
    return {
      found: false,
      code,
      error: `Invalid format for "${code}". Please enter a valid series code like PLTR.001.`,
    };
  }

  try {
    const product = await getProductBySeriesNo(code);

    if (!product) {
      return {
        found: false,
        code,
      };
    }

    const hasDiscount = Boolean(
      product.originalPrice &&
        product.price !== null &&
        product.originalPrice > product.price
    );

    const discountPercent =
      hasDiscount && product.originalPrice && product.price !== null
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;

    const publicData: PublicIndexProduct = {
      name: product.name,
      seriesNo: product.seriesNo || code,
      slug: product.slug,
      category: product.category,
      categoryDisplayName: getCategoryDisplayName(product.category),
      price: product.price,
      originalPrice: product.originalPrice || null,
      hasDiscount,
      discountPercent,
      available: product.available,
      image: getProductImageUrl(product.image, product.updatedAt),
      subtitle: product.subtitle || "",
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      whyYoullLikeIt: product.whyYoullLikeIt || "",
      weight: product.weight || null,
      nutrition: {
        calories: product.nutrition?.calories ?? null,
        protein: product.nutrition?.protein ?? null,
        carbs: product.nutrition?.carbs ?? null,
        fat: product.nutrition?.fat ?? null,
        fiber: product.nutrition?.fiber ?? null,
      },
      ingredients: Array.isArray(product.ingredients)
        ? product.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          }))
        : [],
    };

    return {
      found: true,
      code,
      product: publicData,
    };
  } catch (err: unknown) {
    console.error("Error in lookupSeriesAction:", err);
    return {
      found: false,
      code,
      error: "Unable to complete lookup at this time. Please try again.",
    };
  }
}
