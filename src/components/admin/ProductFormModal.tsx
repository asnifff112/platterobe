"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { getProductImageUrl, type Product, type Ingredient } from "@/data/products";
import { MENU_CATEGORIES, CategoryKey, normalizeCategoryKey } from "@/data/categories";
import { upsertProductAction } from "@/app/admin/actions";
import { sanitizeSeriesNo } from "@/lib/series";
import {
  X,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  RotateCcw,
  ImageIcon,
} from "lucide-react";

interface ProductFormModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

interface IngredientRow {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

const PRESET_LIBRARY = [
  { label: "ABC Glow Juice", url: "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/abc-glow.jpg" },
  { label: "Classic Oat Jar", url: "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/classic-overnight-oats.jpg" },
  { label: "Fruit Oat Jar", url: "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/fruit-overnight-oats.jpg" },
  { label: "Chia Cloud / Parfait", url: "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/chia-banana-pudding.jpg" },
  { label: "Protein Toast", url: "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/egg-pb-toast.jpg" },
  { label: "Peanut Stack", url: "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/pb-banana-sandwich.jpg" },
  { label: "Power Duo / Toast", url: "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/banana-egg.jpg" },
  { label: "Oat Cakes", url: "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/pancake.jpg" },
  { label: "Banana Blend", url: "https://rsojkuiouwnotplrebki.supabase.co/storage/v1/object/public/product-images/banana-oats-smoothie.jpg" },
];

function parseInitialIngredients(
  rawList?: Array<Ingredient | string>
): IngredientRow[] {
  if (!rawList || rawList.length === 0) {
    return [];
  }

  return rawList.map((item, idx) => {
    const rowId = `row-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`;
    if (typeof item === "string") {
      const match = item.match(/^(.*?)\s*[-—:]\s*(.*)$/);
      if (match) {
        return { id: rowId, name: match[1].trim(), quantity: match[2].trim(), unit: "" };
      }
      return { id: rowId, name: item.trim(), quantity: "", unit: "" };
    }

    let qty = (item.quantity || "").trim();
    let unit = (item.unit || "").trim();

    if (!unit && qty) {
      const unitMatch = qty.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
      if (unitMatch && unitMatch[2]) {
        qty = unitMatch[1];
        unit = unitMatch[2].toLowerCase();
      }
    }

    return {
      id: rowId,
      name: item.name || "",
      quantity: qty,
      unit: unit,
    };
  });
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // SECTION A: Basic Information
  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [seriesNo, setSeriesNo] = useState(product?.seriesNo || "");
  const [category, setCategory] = useState<CategoryKey>(
    product?.category ? normalizeCategoryKey(product.category) : "breakfast"
  );
  const [subtitle, setSubtitle] = useState(product?.subtitle || "");
  const [shortDescription, setShortDescription] = useState(product?.shortDescription || "");
  const [description, setDescription] = useState(product?.description || "");
  const [whyYoullLikeIt, setWhyYoullLikeIt] = useState(product?.whyYoullLikeIt || "");

  // SECTION B: Product Image Management
  const [currentSavedImage, setCurrentSavedImage] = useState(product?.image || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);

  // SECTION C: Pricing
  const [price, setPrice] = useState(
    product?.price !== null && product?.price !== undefined ? String(product.price) : ""
  );
  const [originalPrice, setOriginalPrice] = useState(
    product?.originalPrice !== null && product?.originalPrice !== undefined
      ? String(product.originalPrice)
      : ""
  );

  // SECTION D: Nutrition & Weight
  const [weight, setWeight] = useState(product?.weight || "");
  const [calories, setCalories] = useState(
    product?.nutrition?.calories ? String(product.nutrition.calories) : ""
  );
  const [protein, setProtein] = useState(
    product?.nutrition?.protein ? String(product.nutrition.protein).replace(/g$/i, "") : ""
  );
  const [carbs, setCarbs] = useState(
    product?.nutrition?.carbs ? String(product.nutrition.carbs).replace(/g$/i, "") : ""
  );
  const [fat, setFat] = useState(
    product?.nutrition?.fat ? String(product.nutrition.fat).replace(/g$/i, "") : ""
  );
  const [fiber, setFiber] = useState(
    product?.nutrition?.fiber ? String(product.nutrition.fiber).replace(/g$/i, "") : ""
  );

  // SECTION E: Ingredients
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    parseInitialIngredients(product?.ingredients)
  );

  // SECTION F: Product Settings
  const [isFeatured, setIsFeatured] = useState(Boolean(product?.isFeatured));
  const [available, setAvailable] = useState(
    product?.available !== undefined ? product.available : true
  );
  const [sortOrder, setSortOrder] = useState(
    product?.sortOrder !== undefined ? String(product.sortOrder) : ""
  );

  // Re-synchronize modal state when product prop or modal open state changes
  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setName(product.name || "");
      setSlug(product.slug || "");
      setSeriesNo(product.seriesNo || "");
      setCategory(normalizeCategoryKey(product.category || "breakfast"));
      setSubtitle(product.subtitle || "");
      setShortDescription(product.shortDescription || "");
      setDescription(product.description || "");
      setWhyYoullLikeIt(product.whyYoullLikeIt || "");

      const activeImage = product.image || "";
      setCurrentSavedImage(activeImage);
      setCustomImageUrl("");
      setSelectedFile(null);
      setNewImagePreview(null);

      setPrice(product.price !== null && product.price !== undefined ? String(product.price) : "");
      setOriginalPrice(
        product.originalPrice !== null && product.originalPrice !== undefined
          ? String(product.originalPrice)
          : ""
      );

      setWeight(product.weight || "");
      setCalories(product.nutrition?.calories ? String(product.nutrition.calories) : "");
      setProtein(product.nutrition?.protein ? String(product.nutrition.protein).replace(/g$/i, "") : "");
      setCarbs(product.nutrition?.carbs ? String(product.nutrition.carbs).replace(/g$/i, "") : "");
      setFat(product.nutrition?.fat ? String(product.nutrition.fat).replace(/g$/i, "") : "");
      setFiber(product.nutrition?.fiber ? String(product.nutrition.fiber).replace(/g$/i, "") : "");

      setIngredients(parseInitialIngredients(product.ingredients));

      setIsFeatured(Boolean(product.isFeatured));
      setAvailable(product.available !== undefined ? product.available : true);
      setSortOrder(product.sortOrder !== undefined ? String(product.sortOrder) : "");
    } else {
      // Clean initialization for Add New Product: everything starts empty
      setName("");
      setSlug("");
      setSeriesNo("");
      setCategory("breakfast");
      setSubtitle("");
      setShortDescription("");
      setDescription("");
      setWhyYoullLikeIt("");

      setCurrentSavedImage("");
      setCustomImageUrl("");
      setSelectedFile(null);
      setNewImagePreview(null);
      setShowLibrary(false);

      setPrice("");
      setOriginalPrice("");

      setWeight("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setFiber("");

      setIngredients([]);

      setIsFeatured(false);
      setAvailable(true);
      setSortOrder("");
    }
    setError(null);
  }, [product, isOpen]);

  // Clean up any blob preview URLs on unmount
  useEffect(() => {
    return () => {
      if (newImagePreview) {
        URL.revokeObjectURL(newImagePreview);
      }
    };
  }, [newImagePreview]);

  if (!isOpen) return null;

  function handleNameChange(val: string) {
    setName(val);
    if (!isEditing && !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      );
    }
  }

  // Handle image selection from file picker
  function handleImageFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Selected image exceeds 5MB limit. Please choose a smaller photo.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
    if (file.type && !validTypes.includes(file.type.toLowerCase())) {
      setError("Please choose a valid JPG, PNG, WebP, AVIF, or GIF image.");
      return;
    }

    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setNewImagePreview(previewUrl);
    setCustomImageUrl(""); // Clear any preset selection
    setError(null);
  }

  function handleRevertSelectedImage() {
    setSelectedFile(null);
    if (newImagePreview) {
      URL.revokeObjectURL(newImagePreview);
      setNewImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSelectPresetImage(url: string) {
    handleRevertSelectedImage();
    setCustomImageUrl(url);
    setError(null);
  }

  function handleClearImageSelection() {
    handleRevertSelectedImage();
    setCustomImageUrl("");
  }

  // Dynamic ingredient handlers
  function handleAddIngredient() {
    setIngredients((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: "",
        quantity: "",
        unit: "g",
      },
    ]);
  }

  function handleUpdateIngredient(id: string, field: "name" | "quantity" | "unit", val: string) {
    setIngredients((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: val } : row))
    );
  }

  function handleRemoveIngredient(id: string) {
    setIngredients((prev) => prev.filter((row) => row.id !== id));
  }

  function handleMoveIngredient(index: number, direction: "up" | "down") {
    setIngredients((prev) => {
      const copy = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  }

  // Submit Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!name.trim()) {
        setError("Product name is required.");
        setLoading(false);
        return;
      }

      if (!isEditing && !seriesNo.trim()) {
        setError("Series No. is required for new products.");
        setLoading(false);
        return;
      }

      if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        setError("Please enter a valid non-negative selling price.");
        setLoading(false);
        return;
      }

      if (originalPrice.trim()) {
        const orig = parseFloat(originalPrice);
        const sell = parseFloat(price);
        if (isNaN(orig) || orig <= 0) {
          setError("Original price must be a valid positive number.");
          setLoading(false);
          return;
        }
        if (orig <= sell) {
          setError(
            `Original price (₹${orig}) must be greater than selling price (₹${sell}) to display as a discount.`
          );
          setLoading(false);
          return;
        }
      }

      // Validate that an image is provided when adding a new product
      if (!isEditing && !selectedFile && !customImageUrl.trim() && !currentSavedImage.trim()) {
        setError("Please upload an image from your computer or choose an image for this product.");
        setLoading(false);
        return;
      }

      const fd = new FormData();
      if (product?.id) {
        fd.append("id", product.id);
      }

      // Basic Information
      fd.append("name", name.trim());
      fd.append("slug", slug.trim());
      if (seriesNo.trim()) {
        fd.append("seriesNo", seriesNo.trim());
      } else {
        fd.append("seriesNo", "");
      }
      fd.append("category", category);
      fd.append("subtitle", subtitle.trim());
      fd.append("shortDescription", shortDescription.trim());
      fd.append("description", description.trim());
      fd.append("whyYoullLikeIt", whyYoullLikeIt.trim());

      // Pricing
      fd.append("price", price.trim());
      if (originalPrice.trim()) {
        fd.append("originalPrice", originalPrice.trim());
      }

      // Nutrition & Weight
      if (weight.trim()) fd.append("weight", weight.trim());
      if (calories.trim()) fd.append("calories", calories.trim());
      if (protein.trim()) fd.append("protein", protein.trim());
      if (carbs.trim()) fd.append("carbs", carbs.trim());
      if (fat.trim()) fd.append("fat", fat.trim());
      if (fiber.trim()) fd.append("fiber", fiber.trim());

      // Settings
      fd.append("isFeatured", isFeatured ? "true" : "false");
      fd.append("available", available ? "true" : "false");
      if (sortOrder.trim()) fd.append("sortOrder", sortOrder.trim());

      // Image Management
      if (currentSavedImage.trim()) {
        fd.append("currentImage", currentSavedImage.trim());
      }
      if (selectedFile) {
        fd.append("imageFile", selectedFile);
      } else if (customImageUrl.trim()) {
        fd.append("imageUrl", customImageUrl.trim());
      }

      // Ingredients
      const cleanIngredients = ingredients
        .filter((i) => i.name.trim().length > 0)
        .map((i) => ({
          name: i.name.trim(),
          quantity: i.quantity.trim(),
          unit: i.unit.trim() || undefined,
        }));
      fd.append("ingredientsJson", JSON.stringify(cleanIngredients));

      const res = await upsertProductAction(fd);

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        setLoading(false);
        onSuccess(
          isEditing
            ? `"${name}" updated successfully!`
            : `"${name}" created successfully!`
        );
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while saving.";
      setError(msg);
      setLoading(false);
    }
  }

  const activeDisplayImage = newImagePreview || customImageUrl || (isEditing ? currentSavedImage : "");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-4xl bg-white rounded-[12px] shadow-2xl border border-stone-200 overflow-hidden my-6 max-h-[94vh] flex flex-col animate-fadeIn">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#F8F5E9]/90 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.08em] text-[#6B8F56]">
                {isEditing ? "Complete Product Management" : "New Platter Creation"}
              </span>
              {isEditing && (
                <span className="px-2 py-0.5 bg-stone-200/80 rounded text-[10px] font-mono text-stone-600">
                  ID: {product?.id}
                </span>
              )}
            </div>
            <h2 className="text-[20px] sm:text-[22px] font-heading font-bold text-[#1E3A2E] leading-tight">
              {isEditing ? `Edit "${product?.name}"` : "Add New Platter"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* SCROLLABLE FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-7 overflow-y-auto flex-1 font-body">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-[13px] rounded-[8px] flex items-start gap-2.5">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* ====================================================
              SECTION A: BASIC INFORMATION
          ==================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
              <h3 className="text-[13px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E]">
                Section A — Basic Information
              </h3>
              <span className="text-[11px] text-stone-500 font-medium">Public Identifiers</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5 flex items-center justify-between">
                  <span>Series No. {!isEditing && <span className="text-red-600">*</span>}</span>
                </label>
                <input
                  type="text"
                  required={!isEditing}
                  value={seriesNo}
                  onChange={(e) => setSeriesNo(e.target.value)}
                  placeholder="Enter series number"
                  className="w-full px-3.5 py-2.5 text-[14px] font-mono tracking-wider bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Classic Oat Jar"
                  className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  URL Slug (Auto) *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. classic-oat-jar"
                  className="w-full px-3.5 py-2.5 text-[14px] font-mono bg-stone-50 border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  Product Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryKey)}
                  className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                >
                  {MENU_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.displayName} ({cat.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  Subtitle / Highlights
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Oats · Milk · Banana · Chia · Honey"
                  className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                Short Description (Cards & Summaries)
              </label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Concise, appetizing preview for product cards and social shares..."
                className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                Full Description (Product Details Page)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full culinary and nutritional narrative for the product page..."
                className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                Why You&apos;ll Like It (Value Proposition)
              </label>
              <textarea
                rows={2}
                value={whyYoullLikeIt}
                onChange={(e) => setWhyYoullLikeIt(e.target.value)}
                placeholder="Key benefits and reasons customers choose this platter..."
                className="w-full px-3.5 py-2.5 text-[14px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
            </div>
          </div>

          {/* ====================================================
              SECTION B: PRODUCT IMAGE REPLACEMENT & UPLOADS
          ==================================================== */}
          <div className="space-y-4 p-5 bg-[#F8F5E9]/50 border border-stone-200/90 rounded-[10px]">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E]">
                  Section B — Product Image Management
                </h3>
                <span className="px-2 py-0.5 bg-[#6B8F56]/15 text-[#1E3A2E] text-[10px] font-heading font-bold uppercase rounded">
                  Supabase Storage
                </span>
              </div>
              <span className="text-[11px] text-stone-500">
                5 MB Limit · JPG, PNG, WebP
              </span>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              onChange={handleImageFileSelected}
              className="hidden"
            />

            {/* MODE 1: EDITING AN EXISTING PRODUCT */}
            {isEditing && currentSavedImage ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  {/* Box 1: Currently Saved Product Image */}
                  <div className="p-3.5 bg-white border border-stone-200 rounded-[8px] flex flex-col items-center">
                    <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.06em] text-stone-500 mb-2">
                      Current Saved Image
                    </span>
                    <div className="relative w-44 h-36 rounded-[6px] overflow-hidden bg-stone-100 border border-stone-200 shadow-sm">
                      <Image
                        key={currentSavedImage}
                        src={getProductImageUrl(currentSavedImage, product?.updatedAt)}
                        alt="Current product image"
                        fill
                        sizes="176px"
                        unoptimized={Boolean(currentSavedImage.startsWith("data:") || currentSavedImage.includes("?v="))}
                        className="object-cover"
                      />
                    </div>
                    <p className="text-[10px] font-mono text-stone-500 truncate max-w-[200px] mt-2">
                      {currentSavedImage}
                    </p>
                  </div>

                  {/* Box 2: Newly Selected Replacement Image Preview */}
                  <div className={`p-3.5 rounded-[8px] border flex flex-col items-center transition-all ${
                    selectedFile || customImageUrl
                      ? "bg-emerald-50/60 border-emerald-300"
                      : "bg-white border-dashed border-stone-300 text-stone-400"
                  }`}>
                    <span className={`text-[11px] font-heading font-semibold uppercase tracking-[0.06em] mb-2 ${
                      selectedFile || customImageUrl ? "text-emerald-800" : "text-stone-500"
                    }`}>
                      {selectedFile || customImageUrl ? "Replacement Preview (Unsaved)" : "Replacement Preview"}
                    </span>

                    {newImagePreview ? (
                      <>
                        <div className="relative w-44 h-36 rounded-[6px] overflow-hidden bg-stone-100 border-2 border-emerald-500 shadow-sm">
                          <Image
                            src={newImagePreview}
                            alt="Replacement preview"
                            fill
                            sizes="176px"
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div className="mt-2 text-center">
                          <p className="text-[11px] font-semibold text-emerald-800 truncate max-w-[200px]">
                            {selectedFile?.name}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            {selectedFile?.size ? `${Math.round(selectedFile.size / 1024)} KB` : ""} · Ready to save
                          </p>
                        </div>
                      </>
                    ) : customImageUrl ? (
                      <>
                        <div className="relative w-44 h-36 rounded-[6px] overflow-hidden bg-stone-100 border-2 border-emerald-500 shadow-sm">
                          <Image
                            src={customImageUrl}
                            alt="Library preview"
                            fill
                            sizes="176px"
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <p className="text-[10px] text-emerald-800 font-mono truncate max-w-[200px] mt-2">
                          From Editorial Library
                        </p>
                      </>
                    ) : (
                      <div className="w-44 h-36 rounded-[6px] border border-dashed border-stone-300 flex flex-col items-center justify-center p-3 text-center">
                        <Upload size={22} className="text-stone-400 mb-1" />
                        <span className="text-[11px] text-stone-500 font-medium">
                          No replacement chosen yet
                        </span>
                        <span className="text-[10px] text-stone-400 mt-0.5">
                          Click &quot;Replace Image&quot; below
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A2E] text-white rounded-[6px] text-[12px] font-heading font-semibold uppercase tracking-[0.04em] hover:bg-[#162d22] transition-colors shadow-sm"
                  >
                    <RefreshCw size={14} />
                    <span>Replace Image from Computer</span>
                  </button>

                  {(selectedFile || customImageUrl) && (
                    <button
                      type="button"
                      onClick={handleClearImageSelection}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-body text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-[6px] transition-colors"
                    >
                      <RotateCcw size={13} />
                      <span>Revert to Current</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* MODE 2: ADDING A NEW PRODUCT - CLEAN EMPTY PLACEHOLDER */
              <div className="space-y-3">
                {activeDisplayImage ? (
                  <div className="p-4 bg-white border border-emerald-300 rounded-[8px] flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-36 h-28 rounded-[6px] overflow-hidden bg-stone-100 border border-stone-200 shadow-sm shrink-0">
                      <Image
                        src={activeDisplayImage}
                        alt="Selected new product image"
                        fill
                        sizes="144px"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                        <span className="text-[12px] font-heading font-bold text-emerald-800">
                          {selectedFile ? "Local File Ready to Upload" : "Library Image Selected"}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 truncate max-w-sm mt-0.5">
                        {selectedFile?.name || customImageUrl}
                      </p>
                      {selectedFile?.size && (
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          Size: {Math.round(selectedFile.size / 1024)} KB
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2.5 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded border border-stone-300 transition-colors"
                        >
                          Change Photo
                        </button>
                        <button
                          type="button"
                          onClick={handleClearImageSelection}
                          className="px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* EMPTY PLACEHOLDER: "No image selected" */
                  <div className="w-full py-8 px-4 rounded-[8px] border-2 border-dashed border-stone-300 bg-white flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-2">
                      <ImageIcon size={24} />
                    </div>
                    <p className="text-[13px] font-heading font-semibold text-stone-700">
                      No image selected
                    </p>
                    <p className="text-[11px] text-stone-500 max-w-sm mt-0.5 mb-3.5">
                      Upload an image file from your computer (JPG, PNG, WebP up to 5MB)
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A2E] text-white rounded-[6px] text-[12px] font-heading font-semibold uppercase tracking-[0.04em] hover:bg-[#162d22] transition-colors shadow-sm"
                    >
                      <Upload size={14} />
                      <span>Upload Image from Computer</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Optional Editorial Library Selector */}
            <div className="pt-2 border-t border-stone-200/80">
              <button
                type="button"
                onClick={() => setShowLibrary((prev) => !prev)}
                className="text-[11px] font-heading font-semibold uppercase tracking-[0.05em] text-[#1E3A2E] hover:underline flex items-center gap-1.5"
              >
                <span>{showLibrary ? "▲ Hide Editorial Library" : "▼ Or select from Editorial Photo Library (Optional)"}</span>
              </button>

              {showLibrary && (
                <div className="mt-2.5 pt-2 border-t border-stone-200/60">
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_LIBRARY.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => handleSelectPresetImage(preset.url)}
                        className={`px-2.5 py-1 text-[11px] font-body rounded-[4px] border transition-colors ${
                          customImageUrl === preset.url
                            ? "bg-[#1E3A2E] text-white border-[#1E3A2E] font-medium"
                            : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ====================================================
              SECTION C: PRICING
          ==================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
              <h3 className="text-[13px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E]">
                Section C — Pricing
              </h3>
              <span className="text-[11px] text-stone-500 font-medium">Official Menu Rates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  Selling Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-[15px]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="79"
                    className="w-full pl-8 pr-3.5 py-2.5 text-[15px] font-heading font-bold text-[#1E3A2E] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Active customer price charged on order</p>
              </div>

              <div>
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  Original Price (₹ MRP Strikethrough)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-[15px]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="99"
                    className="w-full pl-8 pr-3.5 py-2.5 text-[15px] font-heading text-stone-600 bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Optional higher price for &quot;Save %&quot; badge</p>
              </div>
            </div>
          </div>

          {/* ====================================================
              SECTION D: NUTRITION & SERVING SIZE
          ==================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
              <h3 className="text-[13px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E]">
                Section D — Nutrition & Serving Size
              </h3>
              <span className="text-[11px] text-stone-500 font-medium">Independent Recipe Macros</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-[11px] font-heading font-semibold uppercase text-stone-600 mb-1">
                  Serving Weight
                </label>
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 302g"
                  className="w-full px-3 py-2 text-[13px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-semibold uppercase text-stone-600 mb-1">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="440"
                  className="w-full px-3 py-2 text-[13px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-semibold uppercase text-stone-600 mb-1">
                  Protein (g)
                </label>
                <input
                  type="text"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="15g"
                  className="w-full px-3 py-2 text-[13px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-semibold uppercase text-stone-600 mb-1">
                  Carbs (g)
                </label>
                <input
                  type="text"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="45g"
                  className="w-full px-3 py-2 text-[13px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-semibold uppercase text-stone-600 mb-1">
                  Fat (g)
                </label>
                <input
                  type="text"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="12g"
                  className="w-full px-3 py-2 text-[13px] bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>
            </div>
          </div>

          {/* ====================================================
              SECTION E: DYNAMIC INGREDIENT MANAGEMENT
          ==================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
              <h3 className="text-[13px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E]">
                Section E — Ingredients Management
              </h3>
              <span className="text-[11px] text-[#6B8F56] font-medium font-mono">
                {ingredients.length} items
              </span>
            </div>

            <p className="text-[12px] text-stone-600 leading-relaxed">
              Add recipe ingredients individually with their exact quantities. Saved directly to the product record and displayed on the product page.
            </p>

            <div className="space-y-2.5">
              {ingredients.length === 0 ? (
                <div className="p-4 bg-stone-50 border border-dashed border-stone-300 rounded-[6px] text-center">
                  <p className="text-[12px] text-stone-500 italic">
                    No ingredients added yet. Click &quot;Add Ingredient&quot; below to add items.
                  </p>
                </div>
              ) : (
                ingredients.map((ing, idx) => (
                  <div
                    key={ing.id}
                    className="flex items-center gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded-[6px]"
                  >
                    <span className="text-[11px] font-mono text-stone-400 w-5 text-center">
                      {idx + 1}
                    </span>

                    <input
                      type="text"
                      placeholder="Ingredient name (e.g. Oats)"
                      value={ing.name}
                      onChange={(e) => handleUpdateIngredient(ing.id, "name", e.target.value)}
                      className="flex-1 px-3 py-1.5 text-[13px] bg-white border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                    />

                    <input
                      type="text"
                      placeholder="Qty (e.g. 60)"
                      value={ing.quantity}
                      onChange={(e) => handleUpdateIngredient(ing.id, "quantity", e.target.value)}
                      className="w-20 px-3 py-1.5 text-[13px] bg-white border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                    />

                    <input
                      type="text"
                      placeholder="Unit (g)"
                      value={ing.unit}
                      onChange={(e) => handleUpdateIngredient(ing.id, "unit", e.target.value)}
                      className="w-16 px-2.5 py-1.5 text-[13px] bg-white border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                    />

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveIngredient(idx, "up")}
                        className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:hover:text-stone-400"
                        aria-label="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === ingredients.length - 1}
                        onClick={() => handleMoveIngredient(idx, "down")}
                        className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:hover:text-stone-400"
                        aria-label="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(ing.id)}
                        className="p-1 text-stone-400 hover:text-red-600 transition-colors ml-1"
                        aria-label="Remove ingredient"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={handleAddIngredient}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-heading font-semibold text-[#1E3A2E] bg-stone-100 hover:bg-stone-200 rounded-[4px] transition-colors"
            >
              <Plus size={14} />
              <span>Add Ingredient</span>
            </button>
          </div>

          {/* ====================================================
              SECTION F: SETTINGS & VISIBILITY
          ==================================================== */}
          <div className="space-y-4 p-4 bg-stone-50 border border-stone-200 rounded-[8px]">
            <h3 className="text-[12px] font-heading font-bold uppercase tracking-[0.06em] text-[#1E3A2E]">
              Section F — Settings & Display Controls
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1E3A2E] focus:ring-[#1E3A2E]"
                />
                <span className="text-[13px] font-medium text-stone-700">
                  Available on Menu
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1E3A2E] focus:ring-[#1E3A2E]"
                />
                <span className="text-[13px] font-medium text-stone-700">
                  Featured Platter (Homepage)
                </span>
              </label>

              <div>
                <label className="block text-[11px] font-heading font-semibold uppercase text-stone-500 mb-1">
                  Menu Display Sort Order
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="e.g. 1, 2, 3"
                  className="w-full px-3 py-1.5 text-[13px] bg-white border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-[13px] font-heading font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#1E3A2E] text-white rounded-[6px] text-[13px] font-heading font-semibold uppercase tracking-[0.05em] hover:bg-[#162d22] transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? "Saving to Database..." : isEditing ? "Save Product Changes" : "Create New Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
