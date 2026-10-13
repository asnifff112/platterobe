import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ProductGrid from "@/components/ProductGrid";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import { getAvailableProducts } from "@/lib/db";

export const metadata: Metadata = {
  title: "Menu — Everyday Meal Platters",
  description:
    "Browse PLATTEROBE's full menu of fresh, nutritious, and affordable meal platters.",
};

export default function MenuPage() {
  const products = getAvailableProducts();

  return (
    <>
      <Navbar />
      <main id="main-content">
        {/* Page Header */}
        <div className="pt-20 md:pt-24 lg:pt-28 bg-[#F8F5E9] border-b border-stone-200/80">
          <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-12 md:py-16">
            <span className="inline-block text-[11px] tracking-[0.16em] uppercase text-[#6B8F56] font-heading font-semibold mb-3">
              Our Menu
            </span>
            <h1 className="text-[38px] md:text-[52px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-[1.05]">
              THE PLATTERS
            </h1>
            <p className="text-[15px] md:text-[16px] text-[#1A1A1A]/70 mt-3 font-body max-w-lg leading-relaxed">
              Wholesome meals made with real ingredients, for everyday living.
              Order directly through WhatsApp with prefilled platter details.
            </p>
          </div>
        </div>

        <ProductGrid products={products} showHeader={false} showCategories={true} />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
