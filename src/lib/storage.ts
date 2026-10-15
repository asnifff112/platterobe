import path from "path";
import fs from "fs";
import { getDatabase, getAllProducts } from "@/lib/db";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

export interface UploadResult {
  url: string;
  provider: "supabase-storage" | "vercel-blob" | "local-filesystem" | "database-data-uri";
  size: number;
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Megabytes (matching Supabase bucket limit)
const SUPABASE_BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

/**
 * Validates and saves an uploaded image file using persistent cloud storage.
 * 
 * Order of Storage Providers:
 * 1. Supabase Storage (Preferred for PostgreSQL + Storage stack):
 *    Uploads to the persistent 'product-images' bucket and returns an immutable CDN URL.
 * 2. Vercel Blob Storage:
 *    Used if BLOB_READ_WRITE_TOKEN is configured.
 * 3. Local Filesystem (public/uploads):
 *    Used in local development when public/uploads is writable.
 */
export async function saveUploadedImage(
  file: File,
  slugOrName: string
): Promise<UploadResult> {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
    throw new Error("Invalid or empty image file submitted.");
  }

  // 1. Validate File Size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image file exceeds the maximum allowed limit of 5MB. Please select a smaller file.");
  }

  // 2. Validate File Type
  const mimeType = (file.type || "").toLowerCase();
  const fileExt = path.extname(file.name || "").toLowerCase() || ".jpg";

  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Unsupported image format (${mimeType}). Please upload a JPG, PNG, WebP, AVIF, or GIF image.`
    );
  }

  const cleanSlug = (slugOrName || "platter")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");
  const timestamp = Date.now();
  const filename = `${cleanSlug}-${timestamp}${fileExt}`;

  // ----------------------------------------------------
  // TIER 1: Supabase Cloud Storage (Production Ready)
  // ----------------------------------------------------
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET_NAME)
          .upload(filename, buffer, {
            contentType: mimeType || "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          console.warn("Supabase Storage upload warning:", uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from(SUPABASE_BUCKET_NAME)
            .getPublicUrl(filename);

          if (publicUrlData?.publicUrl) {
            return {
              url: publicUrlData.publicUrl,
              provider: "supabase-storage",
              size: file.size,
            };
          }
        }
      }
    } catch (supabaseErr) {
      console.warn("Supabase Storage exception; checking alternative providers:", supabaseErr);
    }
  }

  // ----------------------------------------------------
  // TIER 2: Vercel Blob Storage
  // ----------------------------------------------------
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`products/${filename}`, file, {
        access: "public",
        addRandomSuffix: true,
      });
      return {
        url: blob.url,
        provider: "vercel-blob",
        size: file.size,
      };
    } catch (blobError) {
      console.warn("Vercel Blob storage upload failed; proceeding to fallback provider:", blobError);
    }
  }

  // ----------------------------------------------------
  // TIER 3: Local Filesystem (public/uploads) - Local Development Only
  // ----------------------------------------------------
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!isServerless) {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, filename);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.promises.writeFile(filePath, buffer);

      return {
        url: `/uploads/${filename}`,
        provider: "local-filesystem",
        size: file.size,
      };
    } catch (fsError) {
      console.warn("Local filesystem write failed:", fsError);
    }
  }

  throw new Error(
    "Cloud storage is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or BLOB_READ_WRITE_TOKEN) in your environment variables for persistent cloud storage."
  );
}

/**
 * Safely cleans up an old image when replaced, only if it is no longer referenced
 * by ANY other product in the database, and is NOT a protected system preset image.
 */
export async function cleanupOldImageSafely(
  oldImageUrl: string | null | undefined,
  newImageUrl: string,
  currentProductId?: string
): Promise<void> {
  if (!oldImageUrl || oldImageUrl === newImageUrl) {
    return;
  }

  // Never delete system preset images located in /images/
  if (oldImageUrl.startsWith("/images/")) {
    return;
  }

  // Check if any OTHER product is using this same image reference
  try {
    const allProducts = await getAllProducts();
    const otherReferences = allProducts.filter(
      (p) => p.image === oldImageUrl && p.id !== currentProductId
    );

    if (otherReferences.length > 0) {
      // Shared image referenced by another product: preserve it!
      return;
    }
  } catch (dbErr) {
    console.warn("Could not query products during image cleanup check:", dbErr);
    return; // Safely abort cleanup to avoid accidental deletion
  }

  // 1. Safe removal from Supabase Storage
  if (oldImageUrl.includes("/storage/v1/object/public/") && isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        // Extract filename from URL
        const parts = oldImageUrl.split(`${SUPABASE_BUCKET_NAME}/`);
        if (parts.length > 1) {
          const filePath = parts[1];
          await supabase.storage.from(SUPABASE_BUCKET_NAME).remove([filePath]);
        }
      }
    } catch (err) {
      console.warn("Could not delete old image from Supabase Storage:", err);
    }
    return;
  }

  // 2. Safe removal from Vercel Blob
  if (oldImageUrl.includes("blob.vercel-storage.com") && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { del } = await import("@vercel/blob");
      await del(oldImageUrl);
    } catch (delErr) {
      console.warn("Could not delete old image from Vercel Blob:", delErr);
    }
    return;
  }

  // 3. Safe removal from local uploads folder
  if (oldImageUrl.startsWith("/uploads/")) {
    try {
      const filename = path.basename(oldImageUrl);
      const filePath = path.join(process.cwd(), "public", "uploads", filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (delErr) {
      console.warn("Could not delete old local upload file:", delErr);
    }
  }
}
