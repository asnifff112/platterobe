"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Product, Ingredient } from "@/data/products";
import { MENU_CATEGORIES, CategoryKey, normalizeCategoryKey } from "@/data/categories";
import { upsertProductAction } from "@/app/admin/actions";
import {
  X,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Star,
  CheckCircle2,
  Image as ImageIcon,
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

const PRESET_IMAGES = [
  { label: "Classic Oats", url: "/images/classic-overnight-oats.jpg" },
  { label: "Fruit Oats", url: "/images/fruit-overnight-oats.jpg" },
  { label: "Chia Pudding", url: "/images/chia-banana-pudding.jpg" },
  { label: "Egg & PB Toast", url: "/images/egg-pb-toast.jpg" },
  { label: "PB Banana Sandwich", url: "/images/pb-banana-sandwich.jpg" },
  { label: "Banana & Egg", url: "/images/banana-egg.jpg" },
  { label: "Oat Pancakes", url: "/images/pancake.jpg" },
  { label: "Smoothie Blend", url: "/images/banana-oats-smoothie.jpg" },
  { label: "Hero Fresh Food", url: "/images/hero-food.jpg" },
];

function parseInitialIngredients(
  rawList?: Array<Ingredient | string>
): IngredientRow[] {
  if (!rawList || rawList.length === 0) {
    return [
      { id: "row-1", name: "Oats", quantity: "60", unit: "g" },
      { id: "row-2", name: "Milk", quantity: "150", unit: "ml" },
    ];
  }

  return rawList.map((item, idx) => {
    const rowId = `row-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`;
    if (typeof item === "string") {
      const match = item.match(/^(.*?)\s*[-—:]\s*(.*)$/);
      if (match) {
        return { rowId, id: rowId, name: match[1].trim(), quantity: match[2].trim(), unit: "" };
      }
      return { rowId, id: rowId, name: item.trim(), quantity: "", unit: "" };
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

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<CategoryKey>("breakfast");
  const [subtitle, setSubtitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [whyYoullLikeIt, setWhyYoullLikeIt] = useState("");

  // Pricing & Inventory
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [available, setAvailable] = useState(true);

  // Nutrition
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");

  // Ingredients dynamic list
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);

  // Image management
  const [imageUrl, setImageUrl] = useState("/images/classic-overnight-oats.jpg");
  const [imagePreview, setImagePreview] = useState("/images/classic-overnight-oats.jpg");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Populate or reset form whenever modal opens or product changes
  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setName(product.name || "");
      setSlug(product.slug || "");
      setCategory(normalizeCategoryKey(product.category || "breakfast"));
      setSubtitle(product.subtitle || "");
      setShortDescription(product.shortDescription || "");
      setDescription(product.description || "");
      setWhyYoullLikeIt(product.whyYoullLikeIt || "");

      setPrice(product.price !== null && product.price !== undefined ? String(product.price) : "");
      setOriginalPrice(
        product.originalPrice !== null && product.originalPrice !== undefined
          ? String(product.originalPrice)
          : ""
      );
      setWeight(product.weight || "");
      setSortOrder(product.sortOrder !== undefined ? String(product.sortOrder) : "");
      setIsFeatured(Boolean(product.isFeatured));
      setAvailable(product.available !== undefined ? product.available : true);

      setCalories(product.nutrition?.calories ? String(product.nutrition.calories) : "");
      setProtein(product.nutrition?.protein ? String(product.nutrition.protein).replace(/g$/i, "") : "");
      setCarbs(product.nutrition?.carbs ? String(product.nutrition.carbs).replace(/g$/i, "") : "");
      setFat(product.nutrition?.fat ? String(product.nutrition.fat).replace(/g$/i, "") : "");
      setFiber(product.nutrition?.fiber ? String(product.nutrition.fiber).replace(/g$/i, "") : "");

      setIngredients(parseInitialIngredients(product.ingredients));
      setImageUrl(product.image || "/images/classic-overnight-oats.jpg");
      setImagePreview(product.image || "/images/classic-overnight-oats.jpg");
      setSelectedFile(null);
    } else {
      // Adding new product
      setName("");
      setSlug("");
      setCategory("breakfast");
      setSubtitle("");
      setShortDescription("");
      setDescription("");
      setWhyYoullLikeIt("");

      setPrice("");
      setOriginalPrice("");
      setWeight("");
      setSortOrder("");
      setIsFeatured(false);
      setAvailable(true);

      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setFiber("");

      setIngredients([
        { id: "row-1", name: "", quantity: "", unit: "g" },
        { id: "row-2", name: "", quantity: "", unit: "g" },
      ]);
      setImageUrl("/images/classic-overnight-oats.jpg");
      setImagePreview("/images/classic-overnight-oats.jpg");
      setSelectedFile(null);
    }
    setError(null);
  }, [product, isOpen]);

  if (!isOpen) return null;

  // Auto-generate slug from name if adding new product
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

  // Handle local image file selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image file exceeds maximum allowed size of 10MB.");
        return;
      }
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      setError(null);
    }
  }

  function handleSelectPresetImage(url: string) {
    setSelectedFile(null);
    setImageUrl(url);
    setImagePreview(url);
  }

  // Dynamic Ingredient Actions
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

  function handleUpdateIngredient(
    id: string,
    field: "name" | "quantity" | "unit",
    val: string
  ) {
    setIngredients((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: val } : row))
    );
  }

  function handleRemoveIngredient(id: string) {
    setIngredients((prev) => {
      if (prev.length <= 1) {
        return [{ id: `row-${Date.now()}`, name: "", quantity: "", unit: "g" }];
      }
      return prev.filter((row) => row.id !== id);
    });
  }

  function handleMoveIngredient(index: number, direction: "up" | "down") {
    setIngredients((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  }

  // Submit Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate name
      if (!name.trim()) {
        setError("Product name is required.");
        setLoading(false);
        return;
      }

      // Validate price
      if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        setError("Please enter a valid non-negative selling price.");
        setLoading(false);
        return;
      }

      // Validate original price if supplied
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

      const fd = new FormData();
      if (product?.id) {
        fd.append("id", product.id);
      }

      fd.append("name", name.trim());
      fd.append("slug", slug.trim());
      fd.append("category", category);
      fd.append("subtitle", subtitle.trim());
      fd.append("shortDescription", shortDescription.trim());
      fd.append("description", description.trim());
      fd.append("whyYoullLikeIt", whyYoullLikeIt.trim());

      fd.append("price", price.trim());
      if (originalPrice.trim()) {
        fd.append("originalPrice", originalPrice.trim());
      }
      if (weight.trim()) {
        fd.append("weight", weight.trim());
      }
      if (sortOrder.trim()) {
        fd.append("sortOrder", sortOrder.trim());
      }

      fd.append("isFeatured", isFeatured ? "true" : "false");
      fd.append("available", available ? "true" : "false");

      // Nutrition
      if (calories.trim()) fd.append("calories", calories.trim());
      if (protein.trim()) fd.append("protein", protein.trim());
      if (carbs.trim()) fd.append("carbs", carbs.trim());
      if (fat.trim()) fd.append("fat", fat.trim());
      if (fiber.trim()) fd.append("fiber", fiber.trim());

      // Image
      if (selectedFile) {
        fd.append("imageFile", selectedFile);
      }
      fd.append("imageUrl", imageUrl.trim());
      fd.append("currentImage", imageUrl.trim());

      // Structured dynamic ingredients
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
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-3xl bg-white rounded-[12px] shadow-2xl border border-stone-200 overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#F8F5E9]/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.08em] text-[#6B8F56]">
                {isEditing ? "Product Management" : "New Platter"}
              </span>
              {isEditing && (
                <span className="px-2 py-0.5 bg-stone-200/80 rounded text-[10px] font-mono text-stone-600">
                  ID: {product?.id}
                </span>
              )}
            </div>
            <h2 className="text-[20px] font-heading font-bold text-[#1E3A2E] leading-tight">
              {isEditing ? `Edit "${product?.name}"` : "Add New Breakfast Platter"}
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 font-body">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-[6px] font-body">
              {error}
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-heading font-bold uppercase tracking-[0.1em] text-[#1E3A2E] pb-1 border-b border-stone-200">
              1. Basic Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Oat Jar"
                  className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  Product Slug / URL *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. oat-jar"
                  className="w-full px-3.5 py-2.5 text-[14px] font-mono bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Public URL: /product/{slug || "slug"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                Short Description (Cards & Previews)
              </label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Creamy overnight oats layered with banana, chia seeds, and raw honey."
                className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                Full Description (Product Detail Page)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full culinary and nutritional description for the public product page..."
                className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
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
                placeholder="Key health and wellness benefits..."
                className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
            </div>
          </div>

          {/* Section 2: Pricing & Settings */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-heading font-bold uppercase tracking-[0.1em] text-[#1E3A2E] pb-1 border-b border-stone-200">
              2. Pricing, Order & Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  Selling Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">
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
                    className="w-full pl-8 pr-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Official price charged on order</p>
              </div>

              <div>
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  Original Price (₹ MRP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="99"
                    className="w-full pl-8 pr-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Shows strikethrough & discount</p>
              </div>

              <div>
                <label className="block text-[12px] font-heading font-semibold uppercase tracking-[0.06em] text-[#1E3A2E] mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  step="1"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full px-3.5 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
                />
                <p className="text-[11px] text-stone-500 mt-1">Sort rank in category list</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-3 p-3 border border-stone-200 rounded-[8px] bg-stone-50/50 hover:bg-stone-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={available}
                  onChange={(e) => setAvailable(e.target.checked)}
                  className="w-4 h-4 text-[#1E3A2E] rounded border-stone-300 focus:ring-[#1E3A2E]"
                />
                <div>
                  <span className="block text-[13px] font-heading font-bold text-[#1E3A2E]">
                    Available on Menu
                  </span>
                  <span className="text-[11px] text-stone-500">
                    When unchecked, shows as &quot;Sold Out&quot; and prevents ordering.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-stone-200 rounded-[8px] bg-stone-50/50 hover:bg-stone-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 text-[#1E3A2E] rounded border-stone-300 focus:ring-[#1E3A2E]"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Star size={13} className="text-amber-500 fill-amber-500" />
                    <span className="text-[13px] font-heading font-bold text-[#1E3A2E]">
                      Featured Platters
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500">
                    Display prominently on the homepage Featured Platters section.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Nutrition & Weight */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-heading font-bold uppercase tracking-[0.1em] text-[#1E3A2E] pb-1 border-b border-stone-200">
              3. Nutrition & Weight
            </h3>

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
                  className="w-full px-3 py-2 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
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
                  className="w-full px-3 py-2 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
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
                  className="w-full px-3 py-2 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-semibold uppercase text-stone-600 mb-1">
                  Carbs (opt)
                </label>
                <input
                  type="text"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="45g"
                  className="w-full px-3 py-2 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-semibold uppercase text-stone-600 mb-1">
                  Fat (opt)
                </label>
                <input
                  type="text"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="12g"
                  className="w-full px-3 py-2 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Dynamic Ingredients Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-stone-200">
              <h3 className="text-[12px] font-heading font-bold uppercase tracking-[0.1em] text-[#1E3A2E]">
                4. Dynamic Ingredient Management
              </h3>
              <span className="text-[11px] text-[#6B8F56] font-medium">
                {ingredients.length} items configured
              </span>
            </div>

            <p className="text-[12px] text-stone-600 leading-relaxed">
              Add, edit, remove, and reorder ingredients. These are displayed dynamically on the public product details page (e.g. <em>&quot;Oats — 60g&quot;</em>).
            </p>

            <div className="space-y-2.5">
              {ingredients.map((ing, idx) => (
                <div
                  key={ing.id}
                  className="flex items-center gap-2 p-2.5 bg-stone-50/70 border border-stone-200 rounded-[8px]"
                >
                  {/* Reorder controls */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveIngredient(idx, "up")}
                      className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-stone-200"
                      title="Move up"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === ingredients.length - 1}
                      onClick={() => handleMoveIngredient(idx, "down")}
                      className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-stone-200"
                      title="Move down"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>

                  {/* Ingredient Name */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => handleUpdateIngredient(ing.id, "name", e.target.value)}
                      placeholder="e.g. Oats, Milk, Banana..."
                      className="w-full px-3 py-1.5 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="w-24 sm:w-28">
                    <input
                      type="text"
                      value={ing.quantity}
                      onChange={(e) => handleUpdateIngredient(ing.id, "quantity", e.target.value)}
                      placeholder="Quantity (60)"
                      className="w-full px-3 py-1.5 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-20 sm:w-24">
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => handleUpdateIngredient(ing.id, "unit", e.target.value)}
                      placeholder="Unit (g/ml)"
                      className="w-full px-3 py-1.5 text-[13px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(ing.id)}
                    className="p-2 text-stone-400 hover:text-red-600 rounded-[6px] hover:bg-red-50 transition-colors shrink-0"
                    title="Remove ingredient"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddIngredient}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-heading font-semibold text-[#1E3A2E] bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-[6px] transition-colors"
            >
              <Plus size={14} />
              <span>Add Ingredient</span>
            </button>
          </div>

          {/* Section 5: Photography & Image Management */}
          <div className="space-y-4">
            <h3 className="text-[12px] font-heading font-bold uppercase tracking-[0.1em] text-[#1E3A2E] pb-1 border-b border-stone-200">
              5. Platter Photography
            </h3>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Current Preview */}
              <div className="relative w-28 h-28 rounded-[8px] overflow-hidden border border-stone-300 shrink-0 bg-stone-100 shadow-sm">
                <Image
                  src={imagePreview}
                  alt="Platter preview"
                  fill
                  className="object-cover"
                />
              </div>

              {/* Upload & Choice Controls */}
              <div className="flex-1 space-y-3 w-full">
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-stone-300 hover:border-[#1E3A2E] rounded-[8px] cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors">
                  <Upload size={16} className="text-stone-500" />
                  <span className="text-[13px] font-body text-stone-600">
                    {selectedFile ? selectedFile.name : "Upload new image file (JPG, PNG, WebP)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {/* Preset image selector */}
                <div>
                  <span className="block text-[11px] font-heading font-semibold uppercase text-stone-500 mb-1.5">
                    Or select from library presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => handleSelectPresetImage(preset.url)}
                        className={`px-2.5 py-1 text-[11px] font-body rounded-[4px] border transition-colors ${
                          imageUrl === preset.url && !selectedFile
                            ? "bg-[#1E3A2E] text-white border-[#1E3A2E]"
                            : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct image URL input */}
                <div>
                  <label className="block text-[11px] font-heading font-semibold uppercase text-stone-500 mb-1">
                    Image path / URL
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="/images/classic-overnight-oats.jpg"
                    className="w-full px-3 py-1.5 text-[12px] font-mono bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-[#1E3A2E]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3 shrink-0">
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
              className="px-6 py-2.5 text-[13px] font-heading font-semibold uppercase tracking-[0.04em] bg-[#1E3A2E] text-white hover:bg-[#162d22] rounded-[6px] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loading && <span className="animate-spin">⏳</span>}
              <span>
                {loading
                  ? "Saving to Database..."
                  : isEditing
                  ? "Save Changes"
                  : "Create Platter"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
