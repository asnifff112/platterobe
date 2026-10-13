"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { Product } from "@/data/products";
import { MENU_CATEGORIES, normalizeCategoryKey } from "@/data/categories";
import { siteConfig } from "@/config/site";
import ProductCard from "./ProductCard";
import { ArrowRight } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showCategories?: boolean;
  defaultCategory?: string;
}

const CATEGORY_TABS = [
  { key: "all", label: "All Platters" },
  ...MENU_CATEGORIES.map((c) => ({ key: c.key, label: c.displayName })),
];

export default function ProductGrid({
  products,
  title = "THE PLATTERS",
  subtitle = "Wholesome meals made for everyday living.",
  showHeader = true,
  showCategories = true,
  defaultCategory = "all",
}: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>(defaultCategory);
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Filter products by active category
  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((p) => normalizeCategoryKey(p.category) === activeCategory);
  }, [products, activeCategory]);

  const activeCategoryMeta = useMemo(() => {
    return CATEGORY_TABS.find((t) => t.key === activeCategory);
  }, [activeCategory]);

  // Subtle GSAP entrance on products update
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let ctx: { revert: () => void } | null = null;

    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);

        ctx = gsap.context(() => {
          const cards = gridRef.current?.querySelectorAll<HTMLElement>(".product-card-item");
          if (!cards || cards.length === 0) return;

          gsap.fromTo(
            cards,
            { opacity: 0, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: 0.35,
              ease: "power2.out",
              stagger: 0.04,
            }
          );
        }, sectionRef);
      }
    );

    return () => {
      ctx?.revert();
    };
  }, [filteredProducts]);

  return (
    <section
      ref={sectionRef}
      className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 sm:py-14 md:py-20"
      aria-label="Platters Menu"
    >
      {/* Header */}
      {showHeader && (
        <div className="mb-6 sm:mb-8 md:mb-10 border-b border-stone-200/80 pb-5 sm:pb-6">
          <p className="text-[11px] tracking-[0.16em] uppercase text-[#6B8F56] font-heading font-semibold mb-1.5 sm:mb-2">
            Everyday Menu
          </p>
          <h2 className="text-[26px] sm:text-[34px] md:text-[44px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[13px] sm:text-[15px] text-[#1A1A1A]/60 mt-1 font-body">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Category Filter Chips / Tabs */}
      {showCategories && (
        <div className="mb-7 sm:mb-10 md:mb-12">
          <div
            role="tablist"
            aria-label="Filter platters by category"
            className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0 md:flex-wrap"
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  id={`tab-${tab.key}`}
                  aria-selected={isActive}
                  aria-controls="menu-product-list"
                  onClick={() => setActiveCategory(tab.key)}
                  className={`
                    shrink-0 inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full text-[12px] sm:text-[13px] md:text-[14px]
                    font-heading font-semibold transition-all duration-150 cursor-pointer select-none
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E] focus-visible:ring-offset-2
                    ${
                      isActive
                        ? "bg-[#1E3A2E] text-[#F8F5E9] shadow-sm ring-1 ring-[#1E3A2E]"
                        : "bg-[#F8F5E9]/60 hover:bg-[#F8F5E9] text-[#1A1A1A]/75 hover:text-[#1E3A2E] border border-stone-200/70"
                    }
                  `}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Products Content Container */}
      <div id="menu-product-list" role="region" aria-live="polite">
        {filteredProducts.length === 0 ? (
          /* Clean Empty State */
          <div className="py-14 sm:py-16 md:py-20 px-6 sm:px-10 text-center bg-[#F8F5E9]/50 border border-stone-200/80 rounded-[12px] max-w-xl mx-auto my-4 animate-fadeIn">
            <span className="inline-block px-3 py-1 bg-white border border-stone-200/70 rounded-full text-[11px] font-heading font-semibold uppercase tracking-[0.12em] text-[#6B8F56] mb-3">
              {activeCategoryMeta?.label || "Category"}
            </span>
            <h3 className="text-[20px] sm:text-[24px] md:text-[26px] font-heading font-bold text-[#1E3A2E] tracking-[-0.02em]">
              Coming Soon
            </h3>
            <p className="text-[13px] sm:text-[14px] md:text-[15px] text-[#1A1A1A]/70 font-body mt-2 max-w-md mx-auto leading-relaxed">
              No platters are currently listed under {activeCategoryMeta?.label}.
              We prepare every batch with seasonal ingredients. Contact us on WhatsApp for daily specials and updates.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={siteConfig.whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px]
                  bg-[#1E3A2E] text-white text-[13px] font-heading font-semibold uppercase tracking-[0.04em]
                  hover:bg-[#162d22] transition-colors shadow-sm
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E]
                "
              >
                <span>Ask on WhatsApp</span>
                <ArrowRight size={14} />
              </a>
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className="
                  px-4 py-2.5 text-[13px] font-heading font-semibold text-[#1E3A2E] hover:underline
                "
              >
                View All Platters
              </button>
            </div>
          </div>
        ) : (
          /* Responsive 2-column mobile grid, scaling to 3/4 columns on desktop */
          <div
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-6 lg:gap-x-8 gap-y-7 sm:gap-y-10 lg:gap-y-12"
          >
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card-item">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
