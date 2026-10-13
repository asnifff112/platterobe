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
  getUserById,
  getUserByEmail,
  updateUserPassword,
} from "@/lib/db";
import type { Product } from "@/data/products";
import { isValidCategoryKey, normalizeCategoryKey, CategoryKey } from "@/data/categories";

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

  const authResult = verifyAdminCredentials(identifier, password);
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
    getUserById(session.userId) ||
    (session.email ? getUserByEmail(session.email) : undefined);

  if (!user) {
    return { error: "Administrator account record not found in database." };
  }

  const isCurrentMatch = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isCurrentMatch) {
    return { error: "Current password is incorrect." };
  }

  const saltRounds = 10;
  const newHash = bcrypt.hashSync(newPassword, saltRounds);
  const updated = updateUserPassword(user.id, newHash);

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
  toggleProductAvailability(id, newStatus);

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/menu");
  return { success: true, available: newStatus };
}

export async function toggleProductFeaturedStatus(id: string, currentlyFeatured: boolean) {
  const session = await getAdminSession();
  if (!session.isAuthenticated || session.role !== "admin") {
    throw new Error("Unauthorized: Administrator permissions required.");
  }

  const newStatus = !currentlyFeatured;
  toggleProductFeatured(id, newStatus);

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/menu");
  return { success: true, isFeatured: newStatus };
}

export async function removeProduct(id: string) {
  const session = await getAdminSession();
  if (!session.isAuthenticated || session.role !== "admin") {
    throw new Error("Unauthorized: Administrator permissions required.");
  }

  const product = getProductById(id);
  deleteProduct(id);

  if (product) {
    revalidatePath(`/product/${product.slug}`);
  }
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/menu");
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
      const existingProduct = getProductBySlug(slug);
      if (existingProduct) {
        return { error: `A product with slug "${slug}" already exists. Please choose a unique name or slug.` };
      }
    } else {
      const existingProduct = getProductBySlug(slug);
      if (existingProduct && existingProduct.id !== id) {
        return { error: `Another product with slug "${slug}" already exists. Please choose a different slug.` };
      }
    }

    const subtitle = (formData.get("subtitle") as string)?.trim() || "";
    const shortDescription = (formData.get("shortDescription") as string)?.trim() || "";
    const description = (formData.get("description") as string)?.trim() || "";
    const whyYoullLikeIt = (formData.get("whyYoullLikeIt") as string)?.trim() || "";

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

    // Handle Image Upload
    let imagePath = (formData.get("currentImage") as string) || "/images/classic-overnight-oats.jpg";
    const imageFile = formData.get("imageFile") as File | null;

    if (imageFile && imageFile.size > 0 && typeof imageFile.arrayBuffer === "function") {
      try {
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = path.extname(imageFile.name) || ".jpg";
        const cleanName = slug || "platter";
        const filename = `${cleanName}-${Date.now()}${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        await fs.promises.writeFile(filePath, buffer);
        imagePath = `/uploads/${filename}`;
      } catch (err) {
        console.error("Failed to save image upload:", err);
        return { error: "Failed to upload image file. Please check file permissions and size." };
      }
    }

    // Handle Ingredients
    const ingredientsRaw = formData.get("ingredients") as string | null;
    let ingredients: { name: string; quantity: string }[] = [];
    if (ingredientsRaw) {
      ingredients = ingredientsRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ name: line, quantity: "" }));
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

    if (id) {
      updateProduct(id, {
        slug,
        name,
        subtitle,
        shortDescription,
        description,
        whyYoullLikeIt,
        price,
        originalPrice,
        isFeatured,
        image: imagePath,
        ingredients,
        nutrition,
        category,
        available,
      });
    } else {
      createProduct({
        slug,
        name,
        subtitle,
        shortDescription,
        description,
        whyYoullLikeIt,
        price,
        originalPrice,
        isFeatured,
        image: imagePath,
        ingredients,
        nutrition,
        category,
        available,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/menu");
    revalidatePath(`/product/${slug}`);

    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to save product:", err);
    const msg = err instanceof Error ? err.message : "Database error";
    return { error: `Failed to save product: ${msg}` };
  }
}
