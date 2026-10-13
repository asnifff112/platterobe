import { siteConfig } from "@/config/site";

export function buildWhatsAppUrl(message: string): string {
  const encoded = encodeURIComponent(message);
  return `${siteConfig.whatsapp.url}?text=${encoded}`;
}

export function buildProductOrderUrl(
  productName: string,
  price: number | null
): string {
  const priceLine = price !== null ? `Price: ₹${price}\n\n` : "";
  const message = `Hi PLATTEROBE!\n\nI'd like to order ${productName}.\n\n${priceLine}Please confirm availability and delivery details.`;

  return buildWhatsAppUrl(message);
}

export const generalWhatsAppUrl = buildWhatsAppUrl(
  "Hi PLATTEROBE!\n\nI'd like to order a fresh meal platter. Please share availability and details."
);
