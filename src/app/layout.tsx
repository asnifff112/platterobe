import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/images/logo.png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
  },
  metadataBase: new URL("https://platterobe.co"),
  title: {
    default: "PLATTEROBE — Everyday Food, Made Better.",
    template: "%s | PLATTEROBE",
  },
  description:
    "Fresh, nutritious and affordable meal platters made for everyday living.",
  keywords: ["platterobe", "meal platters", "healthy food", "everyday meals", "Parappanangadi", "Malappuram"],
  authors: [{ name: "PLATTEROBE" }],
  creator: "PLATTEROBE",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://platterobe.co",
    siteName: "PLATTEROBE",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "PLATTEROBE Logo" }],
    title: "PLATTEROBE — Everyday Food, Made Better.",
    description:
      "Fresh, nutritious and affordable meal platters made for everyday living.",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/logo.png"],
    title: "PLATTEROBE — Everyday Food, Made Better.",
    description:
      "Fresh, nutritious and affordable meal platters made for everyday living.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-white text-[#1A1A1A] font-body antialiased">
        {children}
      </body>
    </html>
  );
}
