import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/data/products";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E] focus-visible:ring-offset-4 rounded-[8px]"
      aria-label={`View ${product.name} — ₹${product.price}`}
    >
      {/* 1. Product Image */}
      <div className="relative aspect-square w-full rounded-[8px] overflow-hidden bg-[#F8F5E9] mb-4">
        <Image
          src={product.image}
          alt={`${product.name} — PLATTEROBE`}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {!product.available && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <span className="text-[11px] tracking-[0.1em] uppercase text-[#1A1A1A]/60 font-semibold font-heading">
              Currently Unavailable
            </span>
          </div>
        )}
      </div>

      {/* 2. Product Name & 3. Price & 4. View Details */}
      <div className="flex flex-col space-y-1.5">
        <h3 className="font-heading font-700 text-[15px] sm:text-[16px] md:text-[17px] text-[#1E3A2E] leading-snug tracking-[-0.01em] uppercase group-hover:text-[#6B8F56] transition-colors duration-200">
          {product.name}
        </h3>

        <div className="flex items-center justify-between pt-1">
          <span className="font-heading font-700 text-[15px] md:text-[16px] text-[#1E3A2E] tabular-nums">
            {product.price !== null ? `₹${product.price}` : "Price on request"}
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-heading font-semibold tracking-[0.08em] uppercase text-[#1E3A2E]/60 group-hover:text-[#1E3A2E] transition-colors duration-200">
            <span>View Details</span>
            <span
              aria-hidden="true"
              className="transition-transform duration-200 ease-out group-hover:translate-x-1"
            >
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
