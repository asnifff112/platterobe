"use client";

import { buildProductOrderUrl } from "@/lib/whatsapp";
import { useCountry } from "@/components/CountryProvider";
import { formatPrice, type CountryCode } from "@/lib/country";

interface WhatsAppButtonProps {
  productName: string;
  price: number | null;
  country?: CountryCode;
  label?: string;
  size?: "default" | "large";
  variant?: "primary" | "outline";
  className?: string;
  disabled?: boolean;
}

export default function WhatsAppButton({
  productName,
  price,
  country: explicitCountry,
  label = "Order on WhatsApp",
  size = "default",
  variant = "primary",
  className = "",
  disabled = false,
}: WhatsAppButtonProps) {
  const { country: contextCountry } = useCountry();
  const activeCountry = explicitCountry || contextCountry;

  const isOrderable = !disabled && price !== null && price !== undefined;
  const formattedPrice = formatPrice(price, activeCountry);
  const url = isOrderable ? buildProductOrderUrl(productName, price, activeCountry, formattedPrice) : "#";

  const sizeClasses =
    size === "large"
      ? "text-[13px] md:text-[14px] px-7 py-3.5 min-h-[52px]"
      : "text-[12px] md:text-[13px] px-6 py-3 min-h-[48px]";

  const variantClasses =
    variant === "primary"
      ? "bg-[#1E3A2E] text-white hover:bg-[#162d22] border border-transparent shadow-none"
      : "bg-white text-[#1E3A2E] border border-[#1E3A2E] hover:bg-[#1E3A2E]/5";

  const handleOrderClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isOrderable) {
      e.preventDefault();
      return;
    }

    try {
      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          unitPrice: price,
          quantity: 1,
          source: "whatsapp",
          country: activeCountry,
        }),
        keepalive: true,
      }).catch(() => {
        // Non-blocking telemetry
      });
    } catch {
      // Ignore background logging errors
    }
  };

  if (!isOrderable) {
    return (
      <div
        className={`
          inline-flex items-center justify-center gap-2
          rounded-[8px] font-heading font-semibold tracking-[0.06em] uppercase
          bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed select-none
          ${sizeClasses}
          ${className}
        `}
        aria-disabled="true"
      >
        <span>Price Unavailable</span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleOrderClick}
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
