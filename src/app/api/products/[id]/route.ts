import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth";
import {
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
} from "@/lib/db";
import { cleanupOldImageSafely } from "@/lib/storage";
import { isValidCategoryKey } from "@/data/categories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/products/[id] - Fetch single product by id
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: `Product with ID "${id}" was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: unknown) {
    console.error("GET /api/products/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch product.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/products/[id] - Update product (Admin permissions required)
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getAdminSession();
    if (!session.isAuthenticated || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator permissions required." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const existing = await getProductById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Product with ID "${id}" was not found.` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json(
          { success: false, error: "Product name cannot be empty." },
          { status: 400 }
        );
      }
      updates.name = name;
    }

    if (body.slug !== undefined) {
      const slug = String(body.slug).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!slug) {
        return NextResponse.json(
          { success: false, error: "Product slug cannot be empty." },
          { status: 400 }
        );
      }
      const otherProduct = await getProductBySlug(slug);
      if (otherProduct && otherProduct.id !== id) {
        return NextResponse.json(
          { success: false, error: `Another product with slug "${slug}" already exists.` },
          { status: 409 }
        );
      }
      updates.slug = slug;
    }

    if (body.price !== undefined) {
      if (body.price === null || body.price === "") {
        updates.price = null;
      } else {
        const parsed = parseFloat(String(body.price));
        if (isNaN(parsed) || parsed < 0) {
          return NextResponse.json(
            { success: false, error: "Price must be a valid non-negative number." },
            { status: 400 }
          );
        }
        updates.price = parsed;
      }
    }

    if (body.originalPrice !== undefined) {
      if (body.originalPrice === null || body.originalPrice === "") {
        updates.originalPrice = null;
      } else {
        const parsed = parseFloat(String(body.originalPrice));
        if (isNaN(parsed) || parsed < 0) {
          return NextResponse.json(
            { success: false, error: "Original price must be a valid positive number." },
            { status: 400 }
          );
        }
        updates.originalPrice = parsed;
      }
    }

    if (body.subtitle !== undefined) updates.subtitle = String(body.subtitle).trim();
    if (body.shortDescription !== undefined) updates.shortDescription = String(body.shortDescription).trim();
    if (body.description !== undefined) updates.description = String(body.description).trim();
    if (body.whyYoullLikeIt !== undefined) updates.whyYoullLikeIt = String(body.whyYoullLikeIt).trim();
    if (body.weight !== undefined) updates.weight = body.weight ? String(body.weight).trim() : null;
    if (body.isFeatured !== undefined) updates.isFeatured = Boolean(body.isFeatured);
    if (body.available !== undefined) updates.available = Boolean(body.available);
    if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder) || 0;

    if (body.category !== undefined && isValidCategoryKey(body.category)) {
      updates.category = body.category;
    }

    if (body.image !== undefined) {
      const newImage = String(body.image).trim();
      if (newImage && newImage !== existing.image) {
        await cleanupOldImageSafely(existing.image, newImage, id);
        updates.image = newImage;
      }
    }

    if (Array.isArray(body.ingredients)) updates.ingredients = body.ingredients;
    if (body.nutrition && typeof body.nutrition === "object") updates.nutrition = body.nutrition;

    const updated = await updateProduct(id, updates);

    revalidatePath("/admin");
    revalidatePath("/", "page");
    revalidatePath("/menu", "page");
    if (updated?.slug) revalidatePath(`/product/${updated.slug}`, "page");
    if (existing.slug && existing.slug !== updated?.slug) revalidatePath(`/product/${existing.slug}`, "page");
    revalidatePath("/", "layout");

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Product updated successfully.",
    });
  } catch (error: unknown) {
    console.error("PUT /api/products/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update product.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete product with confirmation (Admin permissions required)
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getAdminSession();
    if (!session.isAuthenticated || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Administrator permissions required." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const existing = await getProductById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Product with ID "${id}" was not found.` },
        { status: 404 }
      );
    }

    await deleteProduct(id);

    // Clean up image if not shared
    if (existing.image) {
      await cleanupOldImageSafely(existing.image, "", id);
    }

    revalidatePath("/admin");
    revalidatePath("/", "page");
    revalidatePath("/menu", "page");
    revalidatePath(`/product/${existing.slug}`, "page");
    revalidatePath("/", "layout");

    return NextResponse.json({
      success: true,
      deletedId: id,
      message: `Product "${existing.name}" was permanently removed.`,
    });
  } catch (error: unknown) {
    console.error("DELETE /api/products/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete product.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
