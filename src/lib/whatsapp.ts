import { siteConfig } from "@/config/site";
import { formatPrice, getCountryName, type CountryCode } from "@/lib/country";

export function buildWhatsAppUrl(message: string): string {
  const encoded = encodeURIComponent(message);
  return `${siteConfig.whatsapp.url}?text=${encoded}`;
}

export function buildProductOrderUrl(
  productName: string,
  price: number | null,
  country?: CountryCode,
  currencyFormattedPrice?: string
): string {
  let priceLine = "";
  if (currencyFormattedPrice) {
    priceLine = `Price: ${currencyFormattedPrice}\n`;
  } else if (price !== null) {
    priceLine = `Price: ${country ? formatPrice(price, country) : `₹${price}`}\n`;
  }

  const countryLine = country ? `Country: ${getCountryName(country)}\n` : "";
  const message = `Hi PLATTEROBE!\n\nI'd like to order ${productName}.\n\n${countryLine}${priceLine}\nPlease confirm availability and delivery details.`;

  return buildWhatsAppUrl(message);
}

export const generalWhatsAppUrl = buildWhatsAppUrl(
  "Hi PLATTEROBE!\n\nI'd like to order a fresh meal platter. Please share availability and details."
);
