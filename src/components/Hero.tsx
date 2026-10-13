"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    let ctx: { revert: () => void } | null = null;

    import("gsap").then(({ gsap }) => {
      ctx = gsap.context(() => {
        gsap.set(
          [badgeRef.current, textRef.current, buttonRef.current, imageRef.current],
          {
            opacity: 0,
            y: 16,
          }
        );

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        tl.to(badgeRef.current, { opacity: 1, y: 0, duration: 0.45, delay: 0.05 })
          .to(textRef.current, { opacity: 1, y: 0, duration: 0.55 }, "-=0.2")
          .to(buttonRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.25")
          .to(imageRef.current, { opacity: 1, y: 0, duration: 0.6 }, "-=0.35");
      }, containerRef);
    });

    return () => {
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="pt-20 md:pt-24 lg:pt-28 pb-12 md:pb-16 bg-white"
      aria-label="Hero"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left: Editorial Text Block */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Eyebrow */}
            <span
              ref={badgeRef}
              className="inline-block text-[11px] md:text-[12px] tracking-[0.16em] uppercase text-[#6B8F56] font-heading font-semibold mb-4"
            >
              Fresh • Nutritious • Affordable
            </span>

            {/* Headline & Body */}
            <div ref={textRef}>
              <h1 className="text-[38px] sm:text-[48px] md:text-[58px] lg:text-[62px] font-heading font-800 leading-[1.05] tracking-[-0.03em] text-[#1E3A2E] mb-5">
                EVERYDAY FOOD,
                <br />
                MADE BETTER.
              </h1>

              <p className="text-[16px] md:text-[17px] text-[#1A1A1A]/70 leading-[1.65] max-w-md mb-8 font-body">
                Wholesome meals made with real ingredients,
                <br className="hidden sm:inline" /> for everyday living.
              </p>
            </div>

            {/* View Menu CTA Button */}
            <div ref={buttonRef} className="mb-8 lg:mb-0">
              <Link
                href="/menu"
                className="
                  group inline-flex items-center justify-center gap-2
                  bg-[#1E3A2E] text-white text-[13px] tracking-[0.06em] uppercase font-heading font-semibold
                  px-8 min-h-[50px] rounded-[8px]
                  transition-all duration-200 ease-out
                  hover:bg-[#162d22] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E] focus-visible:ring-offset-2
                  w-full sm:w-auto
                "
                aria-label="View our menu"
              >
                <span>View Our Menu</span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 ease-out group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </div>

          {/* Right: Authentic PLATTEROBE Image */}
          <div
            ref={imageRef}
            className="lg:col-span-5 w-full flex justify-center lg:justify-end"
          >
            <div className="relative w-full aspect-[4/3] sm:aspect-[1/1] lg:aspect-[4/5] max-h-[460px] lg:max-h-[500px] rounded-[8px] overflow-hidden bg-[#F8F5E9]">
              <Image
                src="/images/hero-food.jpg"
                alt="PLATTEROBE fresh meal platter — wholesome everyday food"
                fill
                priority
                className="object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 45vw, 500px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
