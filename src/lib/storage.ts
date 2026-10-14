import path from "path";
import fs from "fs";
import { getDatabase } from "@/lib/db";

export interface UploadResult {
  url: string;
  provider: "vercel-blob" | "local-filesystem" | "database-data-uri";
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Megabytes

/**
 * Validates and saves an uploaded image file using the optimal persistent storage provider.
 * 
 * Order of Storage Providers:
 * 1. Vercel Blob: Used in production if process.env.BLOB_READ_WRITE_TOKEN is configured.
 * 2. Local Filesystem: Used in local development / self-hosted environments where public/uploads is writable.
 * 3. Database Data URI: Resilient fallback in serverless environments when no external blob token is set,
 *    ensuring images are permanently stored inside SQLite and never lost upon container teardown.
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
    throw new Error("Image file exceeds the maximum allowed limit of 10MB. Please select a smaller file.");
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
  // TIER 1: Vercel Blob Storage
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
  // TIER 2: Local Filesystem (public/uploads) - only on non-serverless persistent environments
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
      console.warn("Local filesystem write failed; falling back to resilient database storage:", fsError);
    }
  }

  // ----------------------------------------------------
  // TIER 3: Database-Persisted Base64 Data URI
  // ----------------------------------------------------
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const detectedMime = mimeType || "image/jpeg";
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${detectedMime};base64,${base64Data}`;

    return {
      url: dataUrl,
      provider: "database-data-uri",
      size: file.size,
    };
  } catch (dataUrlErr) {
    console.error("Failed to process image buffer:", dataUrlErr);
    throw new Error("Failed to process and store image data. Please try another image.");
  }
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

  // Data URIs exist only in SQLite rows and do not have filesystem artifacts
  if (oldImageUrl.startsWith("data:")) {
    return;
  }

  // Check if any OTHER product in SQLite is using this same image reference
  try {
    const db = getDatabase();
    const query = currentProductId
      ? db.prepare("SELECT COUNT(*) as count FROM products WHERE image = ? AND id != ?")
      : db.prepare("SELECT COUNT(*) as count FROM products WHERE image = ?");

    const row = (currentProductId ? query.get(oldImageUrl, currentProductId) : query.get(oldImageUrl)) as {
      count: number;
    } | undefined;

    if (row && row.count > 0) {
      // Shared image referenced by another product: preserve it!
      return;
    }
  } catch (dbErr) {
    console.warn("Could not query database during image cleanup check:", dbErr);
    return; // Safely abort cleanup to avoid accidental deletion
  }

  // Safe removal from Vercel Blob
  if (oldImageUrl.includes("blob.vercel-storage.com") && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { del } = await import("@vercel/blob");
      await del(oldImageUrl);
    } catch (delErr) {
      console.warn("Could not delete old image from Vercel Blob:", delErr);
    }
    return;
  }

  // Safe removal from local uploads folder
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
