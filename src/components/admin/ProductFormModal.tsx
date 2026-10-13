"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/data/products";
import { MENU_CATEGORIES, CategoryKey, normalizeCategoryKey } from "@/data/categories";
import { upsertProductAction } from "@/app/admin/actions";
import { X, Upload, Sparkles, Star } from "lucide-react";

interface ProductFormModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductFormModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: ProductFormModalProps) {
  const isEditing = Boolean(product);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [category, setCategory] = useState<CategoryKey>(
    product?.category ? normalizeCategoryKey(product.category) : "breakfast"
  );

  // Pricing states
  const [price, setPrice] = useState<string>(
    product?.price !== null && product?.price !== undefined ? String(product.price) : ""
  );
  const [originalPrice, setOriginalPrice] = useState<string>(
    product?.originalPrice !== null && product?.originalPrice !== undefined
      ? String(product.originalPrice)
      : ""
  );

  // Featured and Available flags
  const [isFeatured, setIsFeatured] = useState<boolean>(
    product ? Boolean(product.isFeatured) : false
  );
  const [available, setAvailable] = useState<boolean>(product ? product.available : true);

  const [subtitle, setSubtitle] = useState(product?.subtitle || "");
  const [shortDescription, setShortDescription] = useState(product?.shortDescription || "");
  const [description, setDescription] = useState(product?.description || "");
  const [whyYoullLikeIt, setWhyYoullLikeIt] = useState(product?.whyYoullLikeIt || "");

  // Nutrition states
  const [calories, setCalories] = useState<string>(
    product?.nutrition?.calories ? String(product.nutrition.calories) : ""
  );
  const [protein, setProtein] = useState<string>(product?.nutrition?.protein || "");
  const [carbs, setCarbs] = useState<string>(product?.nutrition?.carbs || "");
  const [fat, setFat] = useState<string>(product?.nutrition?.fat || "");
  const [fiber, setFiber] = useState<string>(product?.nutrition?.fiber || "");

  // Ingredients text (one per line)
  const initialIngredients = product?.ingredients
    ? product.ingredients
        .map((ing) => (typeof ing === "string" ? ing : ing.name))
        .join("\n")
    : "";
  const [ingredientsText, setIngredientsText] = useState(initialIngredients);

  // Image upload
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  function generateSlugFromName() {
    if (!name) return;
    const generated = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generated);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError("Please enter a platter name.");
      setLoading(false);
      return;
    }

    const finalSlug =
      slug.trim() ||
      name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (!finalSlug) {
      setError("Please enter or generate a valid URL slug.");
      setLoading(false);
      return;
    }

    // Pricing validation
    if (originalPrice.trim() && price.trim()) {
      const orig = parseFloat(originalPrice.trim());
      const sell = parseFloat(price.trim());
      if (orig <= sell) {
        setError(
          `Original price (₹${orig}) must be greater than selling price (₹${sell}) to qualify as a discount.`
        );
        setLoading(false);
        return;
      }
    }

    const formData = new FormData();
    if (product?.id) {
      formData.set("id", product.id);
    }
    formData.set("name", name.trim());
    formData.set("slug", finalSlug);
    formData.set("category", category);

    // Both prices
    formData.set("price", price.trim());
    formData.set("originalPrice", originalPrice.trim());

    // Featured and Availability
    formData.set("isFeatured", isFeatured ? "true" : "false");
    formData.set("available", available ? "true" : "false");

    formData.set("subtitle", subtitle.trim());
    formData.set("shortDescription", shortDescription.trim());
    formData.set("description", description.trim());
    formData.set("whyYoullLikeIt", whyYoullLikeIt.trim());

    // Image
    if (selectedFile) {
      formData.set("imageFile", selectedFile);
    }
    if (product?.image) {
      formData.set("currentImage", product.image);
    }

    // Nutrition
    formData.set("calories", calories.trim());
    formData.set("protein", protein.trim());
    formData.set("carbs", carbs.trim());
    formData.set("fat", fat.trim());
    formData.set("fiber", fiber.trim());

    // Ingredients
    formData.set("ingredients", ingredientsText.trim());

    try {
      const result = await upsertProductAction(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        setLoading(false);
        onSuccess();
      }
    } catch (err: unknown) {
      console.error("Save product error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Failed to fetch") || msg.includes("body size") || msg.includes("1 MB")) {
        setError("Image upload error: Please ensure the image is under 10MB or choose a smaller file.");
      } else {
        setError(msg || "An unexpected error occurred while saving.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-[12px] shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#F8F5E9]/50">
          <div>
            <h2 className="text-[18px] font-heading font-bold text-[#1E3A2E]">
              {isEditing ? `Edit Platter: ${product?.name}` : "Add New Platter"}
            </h2>
            <p className="text-[12px] text-[#1A1A1A]/60 font-body">
              Changes persist immediately to database and public menu.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-[6px] hover:bg-stone-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-[13px] rounded-[6px] font-body">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                Platter Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Classic Overnight Oats"
                className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E]">
                  URL Slug *
                </label>
                <button
                  type="button"
                  onClick={generateSlugFromName}
                  className="inline-flex items-center gap-1 text-[11px] text-[#6B8F56] hover:text-[#1E3A2E] font-heading font-semibold"
                >
                  <Sparkles size={11} />
                  Auto-generate
                </button>
              </div>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. classic-overnight-oats"
                className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryKey)}
              className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
            >
              {MENU_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Section (Selling Price & Original Price) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-stone-50/60 border border-stone-200/80 rounded-[8px]">
            <div>
              <label className="block text-[12px] font-heading font-bold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 99"
                className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
              <p className="text-[11px] text-[#1A1A1A]/55 font-body mt-1">
                Active price charged to customers and used for WhatsApp orders.
              </p>
            </div>

            <div>
              <label className="block text-[12px] font-heading font-bold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                Original Price (₹) <span className="text-stone-400 font-normal lowercase">(optional MRP)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="e.g. 129"
                className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
              <p className="text-[11px] text-[#1A1A1A]/55 font-body mt-1">
                Displayed with strikethrough when greater than selling price.
              </p>
            </div>
          </div>

          {/* Featured Platters & Catalog Availability Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F8F5E9]/50 border border-stone-200/80 rounded-[8px]">
            {/* Add to Featured Platters option */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#1E3A2E] focus:ring-[#1E3A2E]"
              />
              <div>
                <span className="flex items-center gap-1.5 text-[13px] font-heading font-bold text-[#1E3A2E]">
                  <Star size={13} className="fill-[#D4B789] text-[#D4B789]" />
                  <span>Add to Featured Platters</span>
                </span>
                <span className="block text-[11px] text-[#1A1A1A]/60 font-body mt-0.5">
                  Display in the Featured Platters showcase on the customer-facing homepage.
                </span>
              </div>
            </label>

            {/* Catalog Status option */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#1E3A2E] focus:ring-[#1E3A2E]"
              />
              <div>
                <span className="block text-[13px] font-heading font-bold text-[#1E3A2E]">
                  Catalog Status
                </span>
                <span className="block text-[11px] text-[#1A1A1A]/60 font-body mt-0.5">
                  {available ? "Available for ordering" : "Sold Out / Hidden"}
                </span>
              </div>
            </label>
          </div>

          {/* Subtitle & Descriptions */}
          <div>
            <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
              Ingredient Subtitle / Tagline
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Oats • Milk/Curd • Banana • Chia • Honey"
              className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
              Short Description (Card snippet)
            </label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="e.g. Creamy overnight oats layered with banana, chia seeds, and raw honey."
              className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
              Detailed Description (Product Page)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full culinary description for the product details page..."
              className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
              Why You&apos;ll Like It
            </label>
            <textarea
              rows={2}
              value={whyYoullLikeIt}
              onChange={(e) => setWhyYoullLikeIt(e.target.value)}
              placeholder="Value proposition and benefit summary..."
              className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
              Platter Photography
            </label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <div className="relative w-20 h-20 rounded-[6px] overflow-hidden border border-stone-200 shrink-0 bg-stone-100">
                  <Image
                    src={imagePreview}
                    alt="Platter preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-stone-300 hover:border-[#1E3A2E] rounded-[6px] cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors">
                  <Upload size={16} className="text-stone-500" />
                  <span className="text-[13px] font-body text-stone-600">
                    {selectedFile ? selectedFile.name : "Upload new photo (JPG, PNG, WebP)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-[#1A1A1A]/50 font-body mt-1">
                  Keep under 10MB. Recommended resolution: 1200x900px or 4:3 ratio.
                </p>
              </div>
            </div>
          </div>

          {/* Nutrition Macros */}
          <div>
            <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
              Nutrition Information (Optional)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <span className="block text-[11px] text-stone-500 font-body mb-1">Calories (kcal)</span>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="e.g. 425"
                  className="w-full px-3 py-2 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>
              <div>
                <span className="block text-[11px] text-stone-500 font-body mb-1">Protein</span>
                <input
                  type="text"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="e.g. 15g"
                  className="w-full px-3 py-2 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>
              <div>
                <span className="block text-[11px] text-stone-500 font-body mb-1">Carbs</span>
                <input
                  type="text"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="e.g. 45g"
                  className="w-full px-3 py-2 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>
              <div>
                <span className="block text-[11px] text-stone-500 font-body mb-1">Fat</span>
                <input
                  type="text"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="e.g. 12g"
                  className="w-full px-3 py-2 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>
              <div>
                <span className="block text-[11px] text-stone-500 font-body mb-1">Fiber</span>
                <input
                  type="text"
                  value={fiber}
                  onChange={(e) => setFiber(e.target.value)}
                  placeholder="e.g. 8g"
                  className="w-full px-3 py-2 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>
            </div>
          </div>

          {/* Ingredients list */}
          <div>
            <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
              Ingredients (One item per line)
            </label>
            <textarea
              rows={4}
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder="Oats&#10;Milk / curd&#10;Banana&#10;Chia seeds&#10;Honey"
              className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
            />
            <p className="text-[11px] text-[#1A1A1A]/50 font-body mt-1">
              Public page displays clean ingredient names. Gram measurements remain private to staff.
            </p>
          </div>

          {/* Actions Footer */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-[13px] font-heading font-semibold text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 rounded-[6px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-[13px] font-heading font-semibold uppercase tracking-[0.04em] bg-[#1E3A2E] text-white hover:bg-[#162d22] rounded-[6px] transition-colors disabled:opacity-50"
            >
              {loading ? "Saving to Database..." : isEditing ? "Save Changes" : "Create Platter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
