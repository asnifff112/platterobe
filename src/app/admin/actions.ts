"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import {
  verifyAdminCredentials,
  setAdminSessionCookie,
  clearAdminSessionCookie,
  getAdminSession,
} from "@/lib/auth";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
  toggleProductFeatured,
  getProductById,
  getProductBySlug,
  getProductBySeriesNo,
  getUserById,
  getUserByEmail,
  updateUserPassword,
} from "@/lib/db";
import type { Product } from "@/data/products";
import { saveUploadedImage, cleanupOldImageSafely } from "@/lib/storage";
import { isValidCategoryKey, normalizeCategoryKey, CategoryKey } from "@/data/categories";
import { normalizeSeriesNo, isValidSeriesNo } from "@/lib/series";

// ----------------------------------------------------------
// Authentication Actions
// ----------------------------------------------------------

export async function loginAction(
  prevState: { error?: string; success?: boolean } | null,
  formData: FormData
) {
  const identifier =
    ((formData.get("identifier") as string) ||
      (formData.get("username") as string) ||
      (formData.get("email") as string) ||
      "").trim();
  const password = ((formData.get("password") as string) || "").trim();

  if (!identifier || !password) {
    return { error: "Please enter your admin email and password." };
  }

  const authResult = await verifyAdminCredentials(identifier, password);
  if (!authResult.isValid || !authResult.user) {
    return { error: "Invalid admin email or password. Please try again." };
  }

  await setAdminSessionCookie(
    authResult.user.id,
    authResult.user.email,
    authResult.user.role
  );
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}

export async function changePasswordAction(
  prevState: { error?: string; success?: boolean; message?: string } | null,
  formData: FormData
) {
  const session = await getAdminSession();
  if (!session.isAuthenticated || !session.userId) {
    return { error: "Unauthorized: Session has expired. Please log in again." };
  }

  const currentPassword = ((formData.get("currentPassword") as string) || "").trim();
  const newPassword = ((formData.get("newPassword") as string) || "").trim();
  const confirmPassword = ((formData.get("confirmPassword") as string) || "").trim();

  if (!currentPassword || !newPassword) {
    return { error: "Please provide both current and new passwords." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters long." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New password and confirm password do not match." };
  }

  const user =
    (await getUserById(session.userId)) ||
    (session.email ? await getUserByEmail(session.email) : undefined);

  if (!user) {
    return { error: "Administrator account record not found in database." };
  }

  const isCurrentMatch = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isCurrentMatch) {
    return { error: "Current password is incorrect." };
  }

  const saltRounds = 10;
  const newHash = bcrypt.hashSync(newPassword, saltRounds);
  const updated = await updateUserPassword(user.id, newHash);

  if (!updated) {
    return { error: "Failed to update password in database." };
  }

  return { success: true, message: "Password updated successfully." };
}

// ----------------------------------------------------------
// Product Mutation Actions (Protected with admin role enforcement)
// ----------------------------------------------------------

export async function toggleProductStatus(id: string, currentlyAvailable: boolean) {
  const session = await getAdminSession();
  if (!session.isAuthenticated || session.role !== "admin") {
    throw new Error("Unauthorized: Administrator permissions required.");
  }

  const newStatus = !currentlyAvailable;
  await toggleProductAvailability(id, newStatus);

  revalidatePath("/admin");
  revalidatePath("/", "page");
  revalidatePath("/menu", "page");
  revalidatePath("/", "layout");
  return { success: true, available: newStatus };
}

export async function toggleProductFeaturedStatus(id: string, currentlyFeatured: boolean) {
  const session = await getAdminSession();
  if (!session.isAuthenticated || session.role !== "admin") {
    throw new Error("Unauthorized: Administrator permissions required.");
  }

  const newStatus = !currentlyFeatured;
  await toggleProductFeatured(id, newStatus);

  revalidatePath("/admin");
  revalidatePath("/", "page");
  revalidatePath("/menu", "page");
  revalidatePath("/", "layout");
  return { success: true, isFeatured: newStatus };
}

export async function removeProduct(id: string) {
  const session = await getAdminSession();
  if (!session.isAuthenticated || session.role !== "admin") {
    return { success: false, error: "Unauthorized: Administrator permissions required." };
  }

  const product = await getProductById(id);
  const deleted = await deleteProduct(id);

  if (!deleted) {
    return { success: false, error: "Failed to delete product from database." };
  }

  // Safely clean up product image from cloud storage if not shared or preset
  if (product?.image) {
    try {
      await cleanupOldImageSafely(product.image, "", id);
    } catch (imgErr) {
      console.warn("Non-critical: Image cleanup failed on delete:", imgErr);
    }
  }

  if (product) {
    revalidatePath(`/product/${product.slug}`);
    revalidatePath(`/product/${product.slug}`, "page");
  }
  revalidatePath("/admin");
  revalidatePath("/admin", "page");
  revalidatePath("/", "page");
  revalidatePath("/menu", "page");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function upsertProductAction(formData: FormData) {
  try {
    const session = await getAdminSession();
    if (!session.isAuthenticated || session.role !== "admin") {
      return { error: "Unauthorized: Administrator permissions required." };
    }

    const id = formData.get("id") as string | null;
    const rawName = formData.get("name") as string | null;
    const name = rawName ? rawName.trim() : "";

    const rawSlug = formData.get("slug") as string | null;
    let slug = rawSlug
      ? rawSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")
      : "";

    if (!name) {
      return { error: "Product name is required." };
    }

    if (!slug) {
      // Auto-generate slug from name if not provided
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (!slug) {
      return { error: "A valid product slug is required." };
    }

    // Slug uniqueness check
    if (!id) {
      const existingProduct = await getProductBySlug(slug);
      if (existingProduct) {
        return { error: `A product with slug "${slug}" already exists. Please choose a unique name or slug.` };
      }
    } else {
      const existingProduct = await getProductBySlug(slug);
      if (existingProduct && existingProduct.id !== id) {
        return { error: `Another product with slug "${slug}" already exists. Please choose a different slug.` };
      }
    }

    // Series No. handling and uniqueness check
    const seriesNoRaw = formData.get("seriesNo") as string | null;
    const seriesNo = seriesNoRaw && seriesNoRaw.trim().length > 0 ? seriesNoRaw.trim() : null;

    if (!id && !seriesNo) {
      return { error: "Series No. is required for new products." };
    }

    if (seriesNo) {
      if (!isValidSeriesNo(seriesNo)) {
        return {
          error: "Series No. must be 64 characters or fewer.",
        };
      }

      const existingWithSeries = await getProductBySeriesNo(seriesNo);
      if (existingWithSeries && existingWithSeries.id !== id) {
        return {
          error: `A product with Series No. "${seriesNo}" already exists ("${existingWithSeries.name}"). Each product must have a unique Series No.`,
        };
      }
    }

    const subtitle = (formData.get("subtitle") as string)?.trim() || "";
    const shortDescription = (formData.get("shortDescription") as string)?.trim() || "";
    const description = (formData.get("description") as string)?.trim() || "";
    const whyYoullLikeIt = (formData.get("whyYoullLikeIt") as string)?.trim() || "";
    const weightRaw = (formData.get("weight") as string)?.trim();
    const weight = weightRaw ? weightRaw : null;

    const sortOrderRaw = formData.get("sortOrder") as string | null;
    let sortOrder: number | undefined = undefined;
    if (sortOrderRaw !== null && sortOrderRaw !== undefined && sortOrderRaw.trim() !== "") {
      const parsed = parseInt(sortOrderRaw.trim(), 10);
      if (!isNaN(parsed)) sortOrder = parsed;
    }

    // Parse Selling Price
    const priceRaw = formData.get("price") as string | null;
    let price: number | null = null;
    if (priceRaw !== null && priceRaw !== undefined && priceRaw.trim() !== "") {
      const parsed = parseFloat(priceRaw.trim());
      if (isNaN(parsed) || parsed < 0) {
        return { error: "Please enter a valid selling price." };
      }
      price = parsed;
    }

    // Parse Original Price (Optional MRP for discount strikethrough)
    const originalPriceRaw = formData.get("originalPrice") as string | null;
    let originalPrice: number | null = null;
    if (originalPriceRaw !== null && originalPriceRaw !== undefined && originalPriceRaw.trim() !== "") {
      const parsedOriginal = parseFloat(originalPriceRaw.trim());
      if (isNaN(parsedOriginal) || parsedOriginal < 0) {
        return { error: "Please enter a valid original price." };
      }
      if (price !== null && parsedOriginal <= price) {
        return {
          error: `Original price (₹${parsedOriginal}) must be greater than selling price (₹${price}) to qualify as a discount.`,
        };
      }
      originalPrice = parsedOriginal;
    }

    // Parse Featured Platters Status
    const isFeatured =
      formData.get("isFeatured") === "on" ||
      formData.get("isFeatured") === "true";

    // Validate Category strictly against the 5 allowed categories
    const categoryRaw = formData.get("category") as string;
    if (!isValidCategoryKey(categoryRaw)) {
      return { error: "Please select a valid category from the 5 supported categories." };
    }
    const category: CategoryKey = categoryRaw;

    const available = formData.get("available") === "on" || formData.get("available") === "true";

    // Handle Image: allow uploaded file, selected URL, or retain existing image
    const currentImage = (formData.get("currentImage") as string)?.trim() || "";
    const imageUrl = (formData.get("imageUrl") as string)?.trim() || "";
    const imageFile = formData.get("imageFile") as File | null;
    let imagePath = imageUrl || currentImage;

    if (imageFile && imageFile.size > 0 && typeof imageFile.arrayBuffer === "function") {
      try {
        const uploadRes = await saveUploadedImage(imageFile, slug || name);
        imagePath = uploadRes.url;

        // Safely cleanup old image if replaced and no longer referenced
        if (currentImage && currentImage !== imagePath && !currentImage.includes("classic-overnight-oats")) {
          await cleanupOldImageSafely(currentImage, imagePath, id || undefined);
        }
      } catch (uploadErr: unknown) {
        console.error("Failed to save uploaded image:", uploadErr);
        const errorMsg = uploadErr instanceof Error ? uploadErr.message : "Failed to upload image.";
        return { error: errorMsg };
      }
    }

    if (!id && !imagePath) {
      return { error: "Please upload or select an image for this new product." };
    }

    // Handle Ingredients - accept JSON structured ingredients
    const ingredientsJson = formData.get("ingredientsJson") as string | null;
    let ingredients: { name: string; quantity: string; unit?: string }[] = [];
    if (ingredientsJson) {
      try {
        const parsed = JSON.parse(ingredientsJson);
        if (Array.isArray(parsed)) {
          ingredients = parsed
            .filter((item) => item && typeof item.name === "string" && item.name.trim().length > 0)
            .map((item) => ({
              name: String(item.name).trim(),
              quantity: String(item.quantity ?? "").trim(),
              unit: item.unit ? String(item.unit).trim() : undefined,
            }));
        }
      } catch (err) {
        console.warn("Failed to parse ingredientsJson:", err);
      }
    }

    // Fallback if ingredientsJson was not provided
    if (ingredients.length === 0) {
      const ingredientsRaw = formData.get("ingredients") as string | null;
      if (ingredientsRaw) {
        ingredients = ingredientsRaw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const match = line.match(/^(.*?)\s*[-—:]\s*(.*)$/);
            if (match) {
              return { name: match[1].trim(), quantity: match[2].trim() };
            }
            return { name: line, quantity: "" };
          });
      }
    }

    // Handle Nutrition
    const caloriesRaw = formData.get("calories") as string | null;
    const proteinRaw = formData.get("protein") as string | null;
    const carbsRaw = formData.get("carbs") as string | null;
    const fatRaw = formData.get("fat") as string | null;
    const fiberRaw = formData.get("fiber") as string | null;

    let caloriesNum: number | null = null;
    if (caloriesRaw && caloriesRaw.trim()) {
      const parsed = parseInt(caloriesRaw.trim(), 10);
      if (!isNaN(parsed)) caloriesNum = parsed;
    }

    const formatGrams = (val: string | null | undefined): string | null => {
      if (!val || !val.trim()) return null;
      const clean = val.trim();
      return clean.toLowerCase().endsWith("g") ? clean : `${clean}g`;
    };

    const nutrition = {
      calories: caloriesNum,
      protein: formatGrams(proteinRaw),
      carbs: formatGrams(carbsRaw),
      fat: formatGrams(fatRaw),
      fiber: formatGrams(fiberRaw),
    };

    // Parse India Availability & Publication Status
    const availableInIndia = formData.has("availableInIndia")
      ? formData.get("availableInIndia") === "on" || formData.get("availableInIndia") === "true"
      : (formData.get("available") === "on" || formData.get("available") === "true");

    const rawPubIndia = (formData.get("publishedInIndia") as string)?.trim().toLowerCase();
    const publishedInIndia: "draft" | "published" | "unavailable" =
      rawPubIndia === "draft" || rawPubIndia === "unavailable" ? rawPubIndia : "published";

    // Parse UAE Selling Price
    const priceAedRaw = formData.get("priceAed") as string | null;
    let priceAed: number | null = null;
    if (priceAedRaw !== null && priceAedRaw !== undefined && priceAedRaw.trim() !== "") {
      const parsedAed = parseFloat(priceAedRaw.trim());
      if (isNaN(parsedAed) || parsedAed < 0) {
        return { error: "Please enter a valid UAE selling price in AED." };
      }
      priceAed = parsedAed;
    }

    // Parse UAE Original Price
    const originalPriceAedRaw = formData.get("originalPriceAed") as string | null;
    let originalPriceAed: number | null = null;
    if (originalPriceAedRaw !== null && originalPriceAedRaw !== undefined && originalPriceAedRaw.trim() !== "") {
      const parsedOrigAed = parseFloat(originalPriceAedRaw.trim());
      if (isNaN(parsedOrigAed) || parsedOrigAed < 0) {
        return { error: "Please enter a valid UAE original price in AED." };
      }
      if (priceAed !== null && parsedOrigAed <= priceAed) {
        return {
          error: `UAE original price (AED ${parsedOrigAed}) must be greater than UAE selling price (AED ${priceAed}) to qualify as a discount.`,
        };
      }
      originalPriceAed = parsedOrigAed;
    }

    // Parse UAE Availability & Publication Status
    const availableInUae =
      formData.get("availableInUae") === "on" ||
      formData.get("availableInUae") === "true";

    const rawPubUae = (formData.get("publishedInUae") as string)?.trim().toLowerCase();
    const publishedInUae: "draft" | "published" | "unavailable" =
      rawPubUae === "published" || rawPubUae === "unavailable" ? rawPubUae : "draft";

    // Validation: If publishing in UAE and marking available, require priceAed
    if (availableInUae && publishedInUae === "published" && priceAed === null) {
      return { error: "To make a product available and published in UAE, please enter its UAE price in AED." };
    }

    if (id) {
      await updateProduct(id, {
        slug,
        seriesNo,
        name,
        subtitle,
        shortDescription,
        description,
        whyYoullLikeIt,
        price,
        originalPrice,
        priceAed,
        originalPriceAed,
        availableInIndia,
        availableInUae,
        publishedInIndia,
        publishedInUae,
        isFeatured,
        image: imagePath,
        ingredients,
        nutrition,
        category,
        available: availableInIndia,
        weight,
        sortOrder,
      });
    } else {
      const newId = `prod-${Date.now()}`;
      await createProduct({
        id: newId,
        slug,
        seriesNo,
        name,
        subtitle,
        shortDescription,
        description,
        whyYoullLikeIt,
        price,
        originalPrice,
        priceAed,
        originalPriceAed,
        availableInIndia,
        availableInUae,
        publishedInIndia,
        publishedInUae,
        isFeatured,
        image: imagePath,
        ingredients,
        nutrition,
        category,
        available: availableInIndia,
        weight,
        sortOrder,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/", "page");
    revalidatePath("/menu", "page");
    revalidatePath(`/product/${slug}`, "page");
    revalidatePath("/index", "page");
    revalidatePath("/index");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to save product:", err);
    const msg = err instanceof Error ? err.message : "Database error";
    if (msg.includes("idx_products_series_no") || msg.toLowerCase().includes("unique constraint") || msg.includes("series_no")) {
      return { error: `A product with this Series No. already exists. Please enter a unique Series No.` };
    }
    return { error: `Failed to save product: ${msg}` };
  }
}
