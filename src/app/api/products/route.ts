import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import {
  getAllProducts,
  getAvailableProducts,
  getFeaturedProducts,
  getProductBySlug,
  createProduct,
} from "@/lib/db";
import { isValidCategoryKey, normalizeCategoryKey } from "@/data/categories";

// GET /api/products - Public listing of products with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const availableFilter = searchParams.get("available");
    const featuredFilter = searchParams.get("featured");
    const categoryFilter = searchParams.get("category");

    let products = await getAllProducts();

    if (availableFilter === "true") {
      products = products.filter((p) => p.available);
    } else if (availableFilter === "false") {
      products = products.filter((p) => !p.available);
    }

    if (featuredFilter === "true") {
      products = products.filter((p) => p.isFeatured && p.available);
    }

    if (categoryFilter && categoryFilter !== "all") {
      const normalized = normalizeCategoryKey(categoryFilter);
      products = products.filter((p) => p.category === normalized);
    }

    return NextResponse.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error: unknown) {
    console.error("GET /api/products error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch products.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/products - Secure product creation (Admin permissions required)
export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session.isAuthenticated || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator permissions required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const rawName = body.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Product name is required." },
        { status: 400 }
      );
    }

    let slug = typeof body.slug === "string"
      ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")
      : "";

    if (!slug) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "A valid product slug is required." },
        { status: 400 }
      );
    }

    // Slug Uniqueness Validation
    const existing = await getProductBySlug(slug);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A product with slug "${slug}" already exists.` },
        { status: 409 }
      );
    }

    // Selling Price Validation
    const rawPrice = body.price;
    let price: number | null = null;
    if (rawPrice !== null && rawPrice !== undefined && rawPrice !== "") {
      const parsed = parseFloat(String(rawPrice));
      if (isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { success: false, error: "Selling price must be a valid non-negative number." },
          { status: 400 }
        );
      }
      price = parsed;
    }

    // Original MRP Validation (Optional)
    const rawOriginal = body.originalPrice;
    let originalPrice: number | null = null;
    if (rawOriginal !== null && rawOriginal !== undefined && rawOriginal !== "") {
      const parsed = parseFloat(String(rawOriginal));
      if (isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { success: false, error: "Original price must be a valid positive number." },
          { status: 400 }
        );
      }
      if (price !== null && parsed <= price) {
        return NextResponse.json(
          { success: false, error: `Original price (₹${parsed}) must be greater than selling price (₹${price}) for discounts.` },
          { status: 400 }
        );
      }
      originalPrice = parsed;
    }

    const category = isValidCategoryKey(body.category)
      ? body.category
      : "breakfast";

    const created = await createProduct({
      slug,
      name,
      subtitle: String(body.subtitle || "").trim(),
      shortDescription: String(body.shortDescription || "").trim(),
      description: String(body.description || "").trim(),
      whyYoullLikeIt: String(body.whyYoullLikeIt || "").trim(),
      price,
      originalPrice,
      isFeatured: Boolean(body.isFeatured),
      image: String(body.image || "/images/classic-overnight-oats.jpg"),
      ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
      nutrition: body.nutrition && typeof body.nutrition === "object" ? body.nutrition : {
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
      },
      category,
      available: body.available !== undefined ? Boolean(body.available) : true,
      weight: body.weight ? String(body.weight).trim() : null,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    });

    revalidatePath("/admin");
    revalidatePath("/", "page");
    revalidatePath("/menu", "page");
    revalidatePath(`/product/${slug}`, "page");
    revalidatePath("/", "layout");

    return NextResponse.json(
      { success: true, data: created, message: "Product created successfully." },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/products error:", error);
    const message = error instanceof Error ? error.message : "Failed to create product.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
