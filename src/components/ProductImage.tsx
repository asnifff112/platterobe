"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface ProductImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  unoptimized?: boolean;
  productName?: string;
  fallbackSrc?: string;
}

/**
 * High-reliability, branded ProductImage component for PLATTEROBE.
 * Automatically tries primary CDN image -> local static asset fallback -> branded typographic fallback.
 * Prevents broken image icons, handles network failures gracefully, and maintains aspect ratio.
 */
export default function ProductImage({
  src,
  alt,
  fill = true,
  width,
  height,
  className = "object-cover",
  priority = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  unoptimized,
  productName,
  fallbackSrc,
}: ProductImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallbackSrc || "");
  const [hasFailedPrimary, setHasFailedPrimary] = useState(false);
  const [isCompletelyBroken, setIsCompletelyBroken] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc || "");
    setHasFailedPrimary(false);
    setIsCompletelyBroken(!src && !fallbackSrc);
    setIsLoaded(false);
  }, [src, fallbackSrc]);

  function handleError() {
    if (!hasFailedPrimary && fallbackSrc && fallbackSrc !== currentSrc) {
      // Step 2: Try local/secondary fallback asset
      setHasFailedPrimary(true);
      setCurrentSrc(fallbackSrc);
    } else {
      // Step 3: Switch to branded graphic fallback
      setIsCompletelyBroken(true);
    }
  }

  // Determine if image should bypass Next.js image optimizer proxy
  const shouldBeUnoptimized =
    unoptimized ??
    Boolean(
      currentSrc.startsWith("data:") ||
        currentSrc.startsWith("/uploads/") ||
        currentSrc.includes("?v=") ||
        currentSrc.startsWith("http")
    );

  if (isCompletelyBroken || !currentSrc) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center bg-[#F8F5E9] text-[#1E3A2E] p-4 text-center select-none"
        aria-label={alt || productName || "PLATTEROBE Platter"}
      >
        <div className="w-10 h-10 rounded-full bg-[#EFE9D7] flex items-center justify-center mb-2 text-[#6B8F56]">
          <svg
            className="w-5 h-5 opacity-80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a10 10 0 0 1 10 10c0 4.418-3.582 8-8 8H10c-4.418 0-8-3.582-8-8A10 10 0 0 1 12 2z" />
            <path d="M8 12c1.5 2 6.5 2 8 0" />
            <path d="M12 6v2" />
          </svg>
        </div>
        <span className="text-[12px] font-heading font-bold uppercase tracking-[0.06em] text-[#1E3A2E] line-clamp-2 max-w-[90%]">
          {productName || alt || "PLATTEROBE"}
        </span>
        <span className="text-[9px] font-body tracking-[0.1em] uppercase text-stone-500 mt-1">
          Fresh Platter
        </span>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        key={currentSrc}
        src={currentSrc}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        unoptimized={shouldBeUnoptimized}
        className={`${className} transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-90"
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      key={currentSrc}
      src={currentSrc}
      alt={alt}
      width={width || 400}
      height={height || 400}
      priority={priority}
      unoptimized={shouldBeUnoptimized}
      className={`${className} transition-opacity duration-300 ${
        isLoaded ? "opacity-100" : "opacity-90"
      }`}
      onLoad={() => setIsLoaded(true)}
      onError={handleError}
    />
  );
}
