"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/data/products";
import { getProductImageUrl } from "@/data/products";
import { MENU_CATEGORIES, getCategoryDisplayName, normalizeCategoryKey } from "@/data/categories";
import { toggleProductStatus, toggleProductFeaturedStatus } from "@/app/admin/actions";
import ProductFormModal from "./ProductFormModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import MealClubAdmin from "./MealClubAdmin";
import type { MealPlan, MealCategory, MealSubscription } from "@/data/meal-club-types";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  Star,
  UtensilsCrossed,
  Calendar,
} from "lucide-react";

interface AdminDashboardClientProps {
  initialProducts: Product[];
  defaultTab?: "catalog" | "meal-club";
  mealClubData?: {
    initialPlans: MealPlan[];
    initialCategories: MealCategory[];
    initialSubscriptions: MealSubscription[];
    stats: {
      activePlansCount: number;
      publishedPlansCount: number;
      activeSubscriptionsCount: number;
      pendingOrdersCount: number;
      confirmedOrdersCount: number;
      upcomingMealsCount: number;
      unavailableProductsCount: number;
    };
  };
}

export default function AdminDashboardClient({
  initialProducts,
  defaultTab = "catalog",
  mealClubData,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<"catalog" | "meal-club">(defaultTab);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<"all" | "in" | "ae">("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync state whenever initialProducts changes via router.refresh()
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Status toggle state loading
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);

  // Filtered products
  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.seriesNo && p.seriesNo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === "all" ||
      normalizeCategoryKey(p.category) === selectedCategory;
    const matchesFeatured = !featuredOnly || Boolean(p.isFeatured);
    const matchesCountry =
      countryFilter === "all" ||
      (countryFilter === "in" && (p.availableInIndia ?? p.available)) ||
      (countryFilter === "ae" && Boolean(p.availableInUae && p.publishedInUae === "published"));
    return matchesSearch && matchesCategory && matchesFeatured && matchesCountry;
  });

  // Metrics
  const totalCount = products.length;
  const indiaLiveCount = products.filter((p) => p.availableInIndia ?? p.available).length;
  const uaeLiveCount = products.filter((p) => p.availableInUae && p.publishedInUae === "published").length;
  const featuredCount = products.filter((p) => p.isFeatured).length;

  async function handleToggleStatus(product: Product) {
    setTogglingId(product.id);
    try {
      await toggleProductStatus(product.id, product.available);
      setSuccessToast(`"${product.name}" status updated.`);
      setTimeout(() => setSuccessToast(null), 3000);
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle status:", err);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggleFeatured(product: Product) {
    setTogglingFeaturedId(product.id);
    try {
      await toggleProductFeaturedStatus(product.id, Boolean(product.isFeatured));
      const willBeFeatured = !product.isFeatured;
      setSuccessToast(
        willBeFeatured
          ? `"${product.name}" added to Featured Platters.`
          : `"${product.name}" removed from Featured Platters.`
      );
      setTimeout(() => setSuccessToast(null), 3000);
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle featured status:", err);
    } finally {
      setTogglingFeaturedId(null);
    }
  }

  function openCreateModal() {
    setEditingProduct(null);
    setFormModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setFormModalOpen(true);
  }

  function openDeleteModal(product: Product) {
    setDeletingProduct(product);
    setDeleteModalOpen(true);
  }

  function handleModalSuccess(message?: string) {
    setFormModalOpen(false);
    setDeleteModalOpen(false);
    setSuccessToast(message || "Platter saved successfully!");
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
    router.refresh();
  }

  function handleDeleteSuccess(deletedId?: string) {
    setDeleteModalOpen(false);
    if (deletedId) {
      setProducts((prev) => prev.filter((p) => p.id !== deletedId));
    }
    setDeletingProduct(null);
    setSuccessToast("Platter permanently deleted from database.");
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Top Level Section Switcher: Catalog vs Meal Club */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <h1 className="text-[26px] md:text-[32px] font-heading font-800 text-[#1E3A2E] tracking-[-0.02em]">
            {activeSection === "catalog" ? "Platter Catalog Management" : "The Meal Club Management"}
          </h1>
          <p className="text-[14px] text-[#1A1A1A]/60 font-body mt-1">
            {activeSection === "catalog"
              ? "Add, update categories, adjust prices, manage ingredients, and toggle availability."
              : "Manage 7, 14 & 30-day meal plans, daily menu planner, swap rules, subscriptions & order locking."}
          </p>
        </div>

        <div className="inline-flex p-1 bg-stone-200/70 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSection("catalog")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
              activeSection === "catalog"
                ? "bg-white text-[#1E3A2E] shadow-xs"
                : "text-stone-600 hover:text-[#1E3A2E]"
            }`}
          >
            <UtensilsCrossed size={14} className={activeSection === "catalog" ? "text-[#6B8F56]" : "text-stone-400"} />
            Platter Catalog
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-stone-100 text-stone-600 font-mono">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("meal-club")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-all ${
              activeSection === "meal-club"
                ? "bg-[#1E3A2E] text-white shadow-xs"
                : "text-stone-600 hover:text-[#1E3A2E]"
            }`}
          >
            <Calendar size={14} className={activeSection === "meal-club" ? "text-[#6B8F56]" : "text-stone-400"} />
            The Meal Club
            {mealClubData && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeSection === "meal-club" ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
              }`}>
                {mealClubData.initialPlans.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Success notification toast */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[8px] flex items-center justify-between font-body text-[13px] animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-[12px] font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeSection === "meal-club" && mealClubData ? (
        <MealClubAdmin
          initialPlans={mealClubData.initialPlans}
          initialCategories={mealClubData.initialCategories}
          initialSubscriptions={mealClubData.initialSubscriptions}
          allProducts={products}
          stats={mealClubData.stats}
        />
      ) : (
        <>
          {/* Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-[10px] border border-stone-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.08em] text-[#1A1A1A]/50">
                Total Platters
              </p>
              <p className="text-[28px] font-heading font-800 text-[#1E3A2E] mt-1">
                {totalCount}
              </p>
              <p className="text-[12px] text-[#6B8F56] font-body mt-0.5">
                Master catalog records
              </p>
            </div>

        <div className="bg-white p-5 rounded-[10px] border border-stone-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.08em] text-[#1A1A1A]/50">
              India Store 🇮🇳
            </p>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded">INR ₹</span>
          </div>
          <p className="text-[28px] font-heading font-800 text-[#1E3A2E] mt-1">
            {indiaLiveCount}
          </p>
          <p className="text-[12px] text-[#1A1A1A]/50 font-body mt-0.5">
            {totalCount - indiaLiveCount} inactive / sold out
          </p>
        </div>

        <div className="bg-white p-5 rounded-[10px] border border-stone-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.08em] text-[#1A1A1A]/50">
              UAE Store 🇦🇪
            </p>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-50 text-amber-800 font-bold rounded">AED</span>
          </div>
          <p className="text-[28px] font-heading font-800 text-[#1E3A2E] mt-1">
            {uaeLiveCount}
          </p>
          <p className="text-[12px] text-[#1A1A1A]/50 font-body mt-0.5">
            {totalCount - uaeLiveCount} draft / unlaunched
          </p>
        </div>

        <div className="bg-white p-5 rounded-[10px] border border-stone-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <p className="text-[11px] font-heading font-semibold uppercase tracking-[0.08em] text-[#1A1A1A]/50">
            Featured Platters
          </p>
          <p className="text-[28px] font-heading font-800 text-[#1E3A2E] mt-1">
            {featuredCount}
          </p>
          <p className="text-[12px] text-[#D4B789] font-body mt-0.5 font-medium">
            Active on homepage showcase
          </p>
        </div>
      </div>

      {/* Action Bar (Search, Category Filter, Country Filter, Featured Toggle, Add Button) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search platters by name, slug, ingredient..."
              className="w-full pl-9 pr-4 py-2.5 text-[13px] font-body bg-white border border-stone-300 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E] focus:border-transparent"
            />
          </div>

          {/* Category filter */}
          <div className="relative sm:w-48">
            <Filter
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-[13px] font-body bg-white border border-stone-300 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E] focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {MENU_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Country Quick Filters */}
          <div className="inline-flex rounded-[8px] border border-stone-300 bg-white p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setCountryFilter("all")}
              className={`px-2.5 py-1.5 text-[11px] font-heading font-semibold rounded-[6px] transition-colors ${
                countryFilter === "all"
                  ? "bg-[#1E3A2E] text-white"
                  : "text-stone-600 hover:text-[#1E3A2E]"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setCountryFilter("in")}
              className={`px-2.5 py-1.5 text-[11px] font-heading font-semibold rounded-[6px] transition-colors flex items-center gap-1 ${
                countryFilter === "in"
                  ? "bg-[#1E3A2E] text-white"
                  : "text-stone-600 hover:text-[#1E3A2E]"
              }`}
            >
              <span>🇮🇳</span>
              <span>India ({indiaLiveCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setCountryFilter("ae")}
              className={`px-2.5 py-1.5 text-[11px] font-heading font-semibold rounded-[6px] transition-colors flex items-center gap-1 ${
                countryFilter === "ae"
                  ? "bg-[#1E3A2E] text-white"
                  : "text-stone-600 hover:text-[#1E3A2E]"
              }`}
            >
              <span>🇦🇪</span>
              <span>UAE ({uaeLiveCount})</span>
            </button>
          </div>

          {/* Featured Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setFeaturedOnly(!featuredOnly)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-heading font-semibold transition-all border shrink-0
              ${
                featuredOnly
                  ? "bg-[#1E3A2E] text-[#F8F5E9] border-[#1E3A2E]"
                  : "bg-white text-[#1A1A1A]/70 border-stone-300 hover:border-[#1E3A2E] hover:text-[#1E3A2E]"
              }
            `}
          >
            <Star
              size={13}
              className={featuredOnly ? "fill-[#D4B789] text-[#D4B789]" : "text-stone-400"}
            />
            <span>Featured ({featuredCount})</span>
          </button>
        </div>

        <button
          onClick={openCreateModal}
          className="
            inline-flex items-center justify-center gap-2
            bg-[#1E3A2E] text-white text-[13px] font-heading font-semibold uppercase tracking-[0.05em]
            px-5 py-2.5 rounded-[8px]
            hover:bg-[#162d22] transition-colors shadow-sm shrink-0
          "
        >
          <Plus size={16} />
          <span>Add New Platter</span>
        </button>
      </div>

      {/* Platters Table */}
      <div className="bg-white rounded-[10px] border border-stone-200/80 shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-[#F8F5E9]/60 text-[11px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E]">
                <th className="py-3.5 px-4">Platter</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Pricing (IN / UAE)</th>
                <th className="py-3.5 px-4">Markets</th>
                <th className="py-3.5 px-4">Featured</th>
                <th className="py-3.5 px-4">Nutrition</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60 font-body text-[13px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#1A1A1A]/50">
                    No platters found matching your query.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-stone-50/70 transition-colors"
                  >
                    {/* Platter info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-[6px] overflow-hidden bg-[#F8F5E9] border border-stone-200 shrink-0">
                          <Image
                            key={`admin-${item.id}-${getProductImageUrl(item.image, item.updatedAt)}`}
                            src={getProductImageUrl(item.image, item.updatedAt)}
                            unoptimized={Boolean(item.image?.startsWith("data:"))}
                            alt={item.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading font-bold text-[14px] text-[#1E3A2E] leading-tight">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {item.seriesNo && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1E3A2E]/10 text-[#1E3A2E] tracking-wider">
                                {item.seriesNo}
                              </span>
                            )}
                            <span className="text-[11px] text-[#1A1A1A]/50 truncate max-w-[140px]">
                              /{item.slug}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-[#1A1A1A]/70">
                      <span className="inline-block px-2.5 py-1 bg-stone-100 rounded-[4px] text-[11px] font-heading font-semibold text-[#1E3A2E] border border-stone-200/50">
                        {getCategoryDisplayName(item.category)}
                      </span>
                    </td>

                    {/* Pricing (India INR & UAE AED) */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 text-[12px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-stone-500 font-mono font-semibold">🇮🇳</span>
                          <span className="font-heading font-bold text-[#1E3A2E] text-[13px]">
                            {item.price !== null ? `₹${item.price}` : "-"}
                          </span>
                          {item.originalPrice && item.price !== null && item.originalPrice > item.price && (
                            <span className="line-through text-stone-400 text-[10px]">
                              ₹{item.originalPrice}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-stone-500 font-mono font-semibold">🇦🇪</span>
                          {item.priceAed !== null && item.priceAed !== undefined ? (
                            <>
                              <span className="font-heading font-bold text-[#1E3A2E] text-[13px]">
                                AED {item.priceAed}
                              </span>
                              {item.originalPriceAed && item.originalPriceAed > item.priceAed && (
                                <span className="line-through text-stone-400 text-[10px]">
                                  AED {item.originalPriceAed}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-stone-400 text-[11px] italic">Not priced</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Market Availability Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1.5">
                        {/* India Toggle */}
                        <button
                          onClick={() => handleToggleStatus(item)}
                          disabled={togglingId === item.id}
                          className={`
                            inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-heading font-semibold uppercase tracking-wider
                            transition-colors cursor-pointer w-fit
                            ${
                              (item.availableInIndia ?? item.available)
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200"
                            }
                            ${togglingId === item.id ? "opacity-50 cursor-wait" : ""}
                          `}
                          title="Click to toggle India menu availability"
                        >
                          <span>🇮🇳</span>
                          <span>{(item.availableInIndia ?? item.available) ? "Live" : "Sold Out"}</span>
                        </button>

                        {/* UAE Status badge */}
                        <span
                          className={`
                            inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-heading font-semibold uppercase tracking-wider w-fit
                            ${
                              item.availableInUae && item.publishedInUae === "published"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : item.publishedInUae === "draft" || !item.publishedInUae
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-stone-100 text-stone-500 border border-stone-200"
                            }
                          `}
                          title={`UAE Status: ${item.publishedInUae || "draft"}`}
                        >
                          <span>🇦🇪</span>
                          <span>
                            {item.availableInUae && item.publishedInUae === "published"
                              ? "Live"
                              : item.publishedInUae === "unavailable"
                              ? "Sold Out"
                              : "Draft"}
                          </span>
                        </span>
                      </div>
                    </td>

                    {/* Featured Platters status toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleFeatured(item)}
                        disabled={togglingFeaturedId === item.id}
                        className={`
                          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-heading font-semibold tracking-[0.03em]
                          transition-colors cursor-pointer select-none
                          ${
                            item.isFeatured
                              ? "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                              : "bg-stone-50 text-stone-500 border border-stone-200 hover:bg-stone-100 hover:text-stone-800"
                          }
                          ${togglingFeaturedId === item.id ? "opacity-50 cursor-wait" : ""}
                        `}
                        title={item.isFeatured ? "Click to remove from Featured Platters" : "Click to add to Featured Platters"}
                      >
                        <Star
                          size={11}
                          className={item.isFeatured ? "fill-amber-500 text-amber-500" : "text-stone-400"}
                        />
                        <span>{item.isFeatured ? "Featured" : "Standard"}</span>
                      </button>
                    </td>

                    {/* Nutrition & Weight */}
                    <td className="py-3.5 px-4 text-[12px] text-[#1A1A1A]/70">
                      <div className="flex flex-col gap-0.5">
                        {item.weight && (
                          <span className="inline-block text-[11px] font-mono text-[#1E3A2E] font-semibold">
                            {item.weight}
                          </span>
                        )}
                        {item.nutrition.calories ? (
                          <span className="text-stone-600">
                            ~{item.nutrition.calories} kcal
                            {item.nutrition.protein && ` · ${item.nutrition.protein}`}
                          </span>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/product/${item.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-stone-500 hover:text-[#1E3A2E] hover:bg-stone-100 rounded-[4px] transition-colors"
                          title="View on public site"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-stone-500 hover:text-[#1E3A2E] hover:bg-stone-100 rounded-[4px] transition-colors"
                          title="Edit platter details"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(item)}
                          className="p-1.5 text-stone-500 hover:text-red-700 hover:bg-red-50 rounded-[4px] transition-colors"
                          title="Delete platter"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Edit/Create Modal */}
      <ProductFormModal
        key={editingProduct ? `edit-${editingProduct.id}` : "create-new-product"}
        isOpen={formModalOpen}
        product={editingProduct}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() =>
          handleModalSuccess(
            editingProduct ? "Platter updated successfully!" : "New platter created successfully!"
          )
        }
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        product={deletingProduct}
        onClose={() => setDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
