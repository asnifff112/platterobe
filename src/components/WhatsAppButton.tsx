"use client";

import { buildProductOrderUrl } from "@/lib/whatsapp";

interface WhatsAppButtonProps {
  productName: string;
  price: number | null;
  label?: string;
  size?: "default" | "large";
  variant?: "primary" | "outline";
  className?: string;
}

export default function WhatsAppButton({
  productName,
  price,
  label = "Order on WhatsApp",
  size = "default",
  variant = "primary",
  className = "",
}: WhatsAppButtonProps) {
  const url = buildProductOrderUrl(productName, price);

  const sizeClasses =
    size === "large"
      ? "text-[13px] md:text-[14px] px-7 py-3.5 min-h-[52px]"
      : "text-[12px] md:text-[13px] px-6 py-3 min-h-[48px]";

  const variantClasses =
    variant === "primary"
      ? "bg-[#1E3A2E] text-white hover:bg-[#162d22] border border-transparent shadow-none"
      : "bg-white text-[#1E3A2E] border border-[#1E3A2E] hover:bg-[#1E3A2E]/5";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        group inline-flex items-center justify-center gap-2
        rounded-[8px] font-heading font-semibold tracking-[0.06em] uppercase
        transition-all duration-200 ease-out
        hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E] focus-visible:ring-offset-2
        ${sizeClasses}
        ${variantClasses}
        ${className}
      `}
      aria-label={`Order ${productName} on WhatsApp`}
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className="transition-transform duration-200 ease-out group-hover:translate-x-1"
      >
        →
      </span>
    </a>
  );
}
