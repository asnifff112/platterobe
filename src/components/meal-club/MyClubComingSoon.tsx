import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * PLATTEROBE / MY CLUB — Temporary Coming Soon Experience
 * 
 * Elegant, minimal, brand-aligned placeholder for the upcoming My Club membership packages.
 * Adheres strictly to PLATTEROBE's warm cream and forest green visual identity.
 */
export default function MyClubComingSoon() {
  return (
    <section className="relative min-h-[75vh] flex items-center justify-center bg-[#FDFBF7] px-6 md:px-12 py-24 md:py-36 overflow-hidden">
      {/* Subtle organic background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-[#F5EEDC]/60 blur-3xl pointer-events-none -z-0"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F3ECE0] border border-[#E5DCBE]/60 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B8F56] animate-pulse" />
          <span className="text-[10px] sm:text-[11px] font-heading font-bold uppercase tracking-[0.2em] text-[#1E3A2E]">
            Coming Soon
          </span>
        </div>

        {/* Small Eyebrow Label */}
        <p className="text-[11px] sm:text-[12px] font-heading font-semibold uppercase tracking-[0.22em] text-[#1E3A2E]/60 mb-4">
          PLATTEROBE / MY CLUB
        </p>

        {/* Main Heading */}
        <h1 className="text-[38px] sm:text-[52px] md:text-[64px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-[1.08] mb-6">
          Something Good Is Coming.
        </h1>

        {/* Subtle decorative divider */}
        <div className="w-12 h-[2px] bg-[#6B8F56]/40 mx-auto mb-7" />

        {/* Supporting Text */}
        <div className="space-y-3 text-[15px] sm:text-[17px] md:text-[18px] text-[#1A1A1A]/75 font-body leading-relaxed max-w-lg mx-auto mb-10">
          <p>
            We’re preparing something special for your everyday nourishment. A little more care, thoughtfully brought together.
          </p>
          <p className="font-heading font-semibold text-[#1E3A2E]">
            My Club is coming soon.
          </p>
        </div>

        {/* Gentle Navigation Action */}
        <div className="pt-2">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[6px] bg-[#1E3A2E] text-[#F8F5E9] hover:bg-[#162C22] text-[12px] sm:text-[13px] font-heading font-semibold uppercase tracking-[0.08em] transition-all shadow-sm group"
          >
            <span>Explore Current Platters</span>
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
