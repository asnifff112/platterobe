import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import EditorialStatementBanner from "@/components/EditorialStatementBanner";
import ProductGrid from "@/components/ProductGrid";
import EditorialShowcase from "@/components/EditorialShowcase";
import BrandStatement from "@/components/BrandStatement";
import HowItWorks from "@/components/HowItWorks";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import { getAvailableProducts, getFeaturedProducts } from "@/lib/db";

export default function HomePage() {
  const allProducts = getAvailableProducts();
  const featuredProducts = getFeaturedProducts();

  return (
    <>
      {/* SECTION 1: Minimal navigation */}
      <Navbar />

      <main id="main-content">
        {/* SECTION 2: Editorial hero */}
        <Hero />

        {/* SECTION 3: Thin horizontal divider / understated brand statement */}
        <EditorialStatementBanner />

        {/* SECTION 4: Featured products managed dynamically by Admin */}
        {featuredProducts.length > 0 && (
          <ProductGrid
            products={featuredProducts}
            title="FEATURED PLATTERS"
            subtitle="Curated daily essentials handpicked by our culinary team."
            showHeader
            showCategories={false}
          />
        )}

        {/* SECTION 5: Large editorial food image paired with short text block */}
        <EditorialShowcase />

        {/* SECTION 6: Complete product collection with category filter */}
        <ProductGrid
          products={allProducts}
          title="THE COMPLETE COLLECTION"
          subtitle="All everyday meal platters — fresh, nutritious, and affordable."
          showHeader
          showCategories={true}
        />

        {/* SECTION 7: Minimal NOT A DIET. JUST BETTER FOOD. brand statement */}
        <BrandStatement />

        {/* SECTION 8: How It Works */}
        <HowItWorks />

        {/* SECTION 9: Contact CTA and Footer */}
        <FinalCTA />
      </main>

      <Footer />
    </>
  );
}
