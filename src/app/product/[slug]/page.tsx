export const instant = false;

import { connection } from "next/server";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NutritionGrid from "@/components/NutritionGrid";
import IngredientsList from "@/components/IngredientsList";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getProductBySlug, getAllProducts } from "@/lib/db";
import { getCategoryDisplayName } from "@/data/categories";
import { getProductImageUrl } from "@/data/products";

type Props = {
  params: Promise<{ slug: string }>;
};


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: `${product.name} — Everyday Meal Platter`,
    description: `${product.description} Fresh everyday meal from PLATTEROBE.`,
    openGraph: {
      title: `${product.name} | PLATTEROBE`,
      description: product.description,
      images: [{ url: getProductImageUrl(product.image, product.updatedAt) }],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const imageUrl = getProductImageUrl(product.image, product.updatedAt);

  const hasDiscount = Boolean(
    product.originalPrice &&
      product.price !== null &&
      product.originalPrice > product.price
  );

  const discountPercent =
    hasDiscount && product.originalPrice && product.price !== null
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-20 md:pt-24 lg:pt-28 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
          {/* Back Navigation */}
          <div className="mb-6 md:mb-10 flex items-center justify-between">
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 text-[12px] tracking-[0.08em] uppercase text-[#1E3A2E]/70 hover:text-[#1E3A2E] font-heading font-semibold transition-colors duration-150"
              aria-label="Back to menu"
            >
              <span aria-hidden="true">←</span>
              <span>Back to Menu</span>
            </Link>

            <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.1em] text-[#6B8F56] px-2.5 py-1 bg-[#F8F5E9] rounded-full">
              {getCategoryDisplayName(product.category)}
            </span>
          </div>

          {/* Product Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Left: Product Image */}
            <div className="lg:col-span-6">
              <div className="relative aspect-square w-full rounded-[8px] overflow-hidden bg-[#F8F5E9]">
                <Image
                  key={`detail-${product.id}-${imageUrl}`}
                  src={imageUrl}
                  unoptimized={Boolean(product.image?.startsWith("data:") || product.image?.startsWith("/uploads/") || product.image?.includes("?v="))}
                  alt={`${product.name} — PLATTEROBE`}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 600px"
                />

                {hasDiscount && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-1 rounded-[4px] bg-[#1E3A2E] text-[#F8F5E9] text-[11px] font-heading font-bold uppercase tracking-[0.05em] shadow-sm">
                      Save {discountPercent}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Editorial Product Details */}
            <div className="lg:col-span-6 flex flex-col">
              {/* Product Name */}
              <h1 className="text-[32px] sm:text-[40px] lg:text-[46px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-[1.08] mb-2 uppercase">
                {product.name}
              </h1>

              {/* Price Row: Selling Price + Strikethrough Original Price + Badge */}
              <div className="mb-4 flex flex-wrap items-baseline gap-3">
                <span className="text-[30px] md:text-[34px] font-heading font-800 text-[#1E3A2E] tabular-nums tracking-[-0.02em]">
                  {product.price !== null ? `₹${product.price}` : "Price on request"}
                </span>

                {hasDiscount && (
                  <>
                    <span className="line-through text-stone-400 text-[18px] md:text-[20px] font-normal tabular-nums">
                      ₹{product.originalPrice}
                    </span>
                    <span className="px-2 py-0.5 rounded-[4px] bg-[#6B8F56]/15 text-[#1E3A2E] text-[11px] font-heading font-bold uppercase tracking-[0.04em]">
                      Save {discountPercent}%
                    </span>
                  </>
                )}
              </div>

              {/* Short Description */}
              <p className="text-[15px] md:text-[16px] text-[#1A1A1A]/70 font-body leading-[1.65] mb-7">
                {product.description}
              </p>

              {/* Primary Order Action (Uses selling price!) */}
              <div className="mb-10">
                {product.available ? (
                  <WhatsAppButton
                    productName={product.name}
                    price={product.price}
                    label="Order on WhatsApp"
                    size="large"
                    className="w-full sm:w-auto"
                  />
                ) : (
                  <div className="inline-flex items-center gap-2 px-6 py-3.5 bg-stone-100 border border-stone-300 rounded-[8px] text-stone-500 font-heading font-semibold text-[13px] uppercase tracking-[0.06em]">
                    <span>Sold Out / Unavailable Today</span>
                  </div>
                )}
              </div>

              {/* Nutrition Information */}
              <div className="border-t border-stone-200/80 pt-6 mb-8">
                <h2 className="text-[12px] font-heading font-bold tracking-[0.14em] uppercase text-[#1E3A2E] mb-3">
                  Nutrition
                </h2>
                <NutritionGrid nutrition={product.nutrition} weight={product.weight} />
              </div>

              {/* Ingredients */}
              <div className="border-t border-stone-200/80 pt-6 mb-8">
                <h2 className="text-[12px] font-heading font-bold tracking-[0.14em] uppercase text-[#1E3A2E] mb-3">
                  Ingredients
                </h2>
                <IngredientsList ingredients={product.ingredients} />
              </div>

              {/* Why You'll Like It */}
              {product.whyYoullLikeIt && (
                <div className="border-t border-stone-200/80 pt-6">
                  <h2 className="text-[12px] font-heading font-bold tracking-[0.14em] uppercase text-[#1E3A2E] mb-2">
                    Why You&apos;ll Like It
                  </h2>
                  <p className="text-[14px] text-[#1A1A1A]/65 font-body leading-relaxed">
                    {product.whyYoullLikeIt}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
