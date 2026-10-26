export const instant = false;

import { connection } from "next/server";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductView from "@/components/ProductView";
import { getProductBySlug } from "@/lib/db";
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

  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-20 md:pt-24 lg:pt-28 pb-16 md:pb-24">
        <ProductView product={product} />
      </main>
      <Footer />
    </>
  );
}
