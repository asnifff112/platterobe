"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { siteConfig } from "@/config/site";

import { useCountry } from "@/components/CountryProvider";
import { getCountryConfig } from "@/lib/country";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const { country, openSelector } = useCountry();
  const currentConfig = getCountryConfig(country);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navLinks = siteConfig.nav;

  const isLinkActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/index" && (pathname === "/index" || pathname === "/product-index")) return true;
    return false;
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 bg-white ${
          scrolled
            ? "border-b border-stone-200/80 shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
            : "border-b border-stone-200/50"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16 md:h-[64px]">
            {/* Brand Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 font-heading font-800 tracking-[0.08em] text-[16px] md:text-[17px] text-[#1E3A2E] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E] rounded-[4px] group"
              aria-label="PLATTEROBE — Home"
            >
              <Image
                src="/images/logo.png"
                alt="PLATTEROBE Logo"
                width={36}
                height={36}
                className="w-[30px] h-[30px] md:w-[34px] md:h-[34px] object-contain rounded-[7px] shrink-0"
                priority
              />
              <span>PLATTEROBE</span>
            </Link>

            {/* Desktop Navigation + Country Selector */}
            <div className="hidden md:flex items-center gap-8 lg:gap-10">
              <nav className="flex items-center gap-8 lg:gap-10" aria-label="Main navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-[12px] lg:text-[13px] tracking-[0.08em] uppercase font-heading font-semibold transition-colors duration-150 hover:text-[#6B8F56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E] rounded-[4px] py-1 ${
                      isLinkActive(link.href)
                        ? "text-[#1E3A2E] font-bold"
                        : "text-[#1A1A1A]/70"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <button
                type="button"
                onClick={openSelector}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-stone-200 hover:border-[#1E3A2E] text-[11px] lg:text-[12px] font-heading font-semibold text-[#1E3A2E] transition-colors bg-[#F8F5E9]/60 hover:bg-[#F8F5E9] cursor-pointer"
                aria-label={`Country: ${currentConfig.name}. Click to change.`}
                title="Change country"
              >
                <span className="text-[13px]">{currentConfig.flag}</span>
                <span className="uppercase tracking-wider font-bold">{currentConfig.code}</span>
              </button>
            </div>

            {/* Mobile Actions: Country button + Menu Toggle */}
            <div className="md:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={openSelector}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] border border-stone-200 text-[11px] font-heading font-semibold text-[#1E3A2E] bg-[#F8F5E9]/60"
                aria-label={`Country: ${currentConfig.name}. Click to change.`}
              >
                <span>{currentConfig.flag}</span>
                <span className="uppercase tracking-wider font-bold">{currentConfig.code}</span>
              </button>

              <button
                className="flex items-center justify-center w-10 h-10 text-[#1E3A2E] rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E]"
                onClick={() => setOpen(!open)}
                aria-label={open ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={open}
                aria-controls="mobile-menu"
              >
                {open ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer (No WhatsApp button here) */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`fixed inset-0 z-40 bg-white md:hidden transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="flex flex-col h-full pt-20 pb-10 px-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-200/60">
            <Image
              src="/images/logo.png"
              alt="PLATTEROBE Logo"
              width={38}
              height={38}
              className="w-[38px] h-[38px] object-contain rounded-[8px] shrink-0"
            />
            <span className="font-heading font-800 tracking-[0.08em] text-[18px] text-[#1E3A2E] uppercase">
              PLATTEROBE
            </span>
          </div>
          <nav className="flex flex-col" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[24px] font-heading font-700 tracking-[-0.02em] py-4 border-b border-stone-200/60 transition-colors ${
                  isLinkActive(link.href)
                    ? "text-[#1E3A2E] font-bold"
                    : "text-[#1A1A1A]/80"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-stone-200/60 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openSelector();
              }}
              className="flex items-center justify-between p-3 rounded-[8px] bg-[#F8F5E9] border border-stone-200 text-[#1E3A2E]"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[22px]">{currentConfig.flag}</span>
                <div className="text-left">
                  <p className="text-[13px] font-heading font-bold uppercase">{currentConfig.name}</p>
                  <p className="text-[11px] text-stone-500 font-body">
                    Currency: {currentConfig.currency} ({currentConfig.currencySymbol})
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-heading font-semibold text-[#6B8F56] uppercase tracking-wide">
                Change →
              </span>
            </button>

            <div>
              <p className="text-[11px] tracking-[0.14em] uppercase text-[#6B8F56] font-heading font-semibold mb-1">
                Everyday Food, Made Better
              </p>
              <p className="text-[13px] text-[#1A1A1A]/50 font-body">
                {siteConfig.location.display}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
