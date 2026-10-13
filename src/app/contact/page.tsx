import type { Metadata } from "next";
import { MessageCircle, Phone, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { siteConfig } from "@/config/site";
import { generalWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact — Order on WhatsApp",
  description:
    "Get in touch with PLATTEROBE in Parappanangadi, Malappuram — order on WhatsApp or follow us on Instagram.",
};

function InstagramIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-20 md:pt-24 lg:pt-28">
        {/* Header */}
        <section className="bg-[#F8F5E9] border-b border-stone-200/80">
          <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-14 md:py-20">
            <span className="inline-block text-[11px] tracking-[0.16em] uppercase text-[#6B8F56] font-heading font-semibold mb-3">
              Contact
            </span>
            <h1 className="text-[38px] md:text-[54px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-[1.05] max-w-xl">
              LET&apos;S TALK<br />FOOD.
            </h1>
            <p className="text-[15px] md:text-[16px] text-[#1A1A1A]/70 font-body mt-3 max-w-md leading-relaxed">
              The easiest way to order is through WhatsApp. We&rsquo;re also on Instagram.
            </p>
          </div>
        </section>

        {/* Contact Items */}
        <section className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-12 md:py-16">
          <div className="divide-y divide-stone-200/80 max-w-3xl">
            {/* WhatsApp */}
            <a
              href={siteConfig.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Order on WhatsApp"
              className="group block py-6 hover:bg-[#F8F5E9]/60 px-4 -mx-4 rounded-[8px] transition-colors duration-150"
            >
              <div className="flex items-center gap-5">
                <div className="w-11 h-11 rounded-[8px] flex items-center justify-center shrink-0 border border-stone-300 group-hover:border-[#1E3A2E] group-hover:bg-[#1E3A2E] group-hover:text-white transition-all duration-200 text-[#1E3A2E]">
                  <MessageCircle size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] tracking-[0.12em] uppercase text-[#1A1A1A]/40 font-heading font-bold mb-0.5">
                    WhatsApp (Fastest Order)
                  </p>
                  <p className="text-[18px] md:text-[20px] font-heading font-700 text-[#1E3A2E]">
                    {siteConfig.whatsapp.displayNumber}
                  </p>
                  <p className="text-[12px] text-[#1A1A1A]/50 font-body mt-0.5">
                    Order directly &amp; confirm delivery
                  </p>
                </div>
                <div className="ml-auto shrink-0">
                  <span className="text-[12px] tracking-[0.08em] uppercase text-[#1E3A2E]/60 group-hover:text-[#1E3A2E] transition-colors font-heading font-semibold">
                    Open →
                  </span>
                </div>
              </div>
            </a>

            {/* Phone */}
            <a
              href={siteConfig.phone.url}
              aria-label={`Call PLATTEROBE: ${siteConfig.phone.display}`}
              className="group block py-6 hover:bg-[#F8F5E9]/60 px-4 -mx-4 rounded-[8px] transition-colors duration-150"
            >
              <div className="flex items-center gap-5">
                <div className="w-11 h-11 rounded-[8px] flex items-center justify-center shrink-0 border border-stone-300 group-hover:border-[#1E3A2E] group-hover:bg-[#1E3A2E] group-hover:text-white transition-all duration-200 text-[#1E3A2E]">
                  <Phone size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] tracking-[0.12em] uppercase text-[#1A1A1A]/40 font-heading font-bold mb-0.5">
                    Phone
                  </p>
                  <p className="text-[18px] md:text-[20px] font-heading font-700 text-[#1E3A2E]">
                    {siteConfig.phone.display}
                  </p>
                  <p className="text-[12px] text-[#1A1A1A]/50 font-body mt-0.5">
                    Call us directly for enquiries
                  </p>
                </div>
                <div className="ml-auto shrink-0">
                  <span className="text-[12px] tracking-[0.08em] uppercase text-[#1E3A2E]/60 group-hover:text-[#1E3A2E] transition-colors font-heading font-semibold">
                    Call →
                  </span>
                </div>
              </div>
            </a>

            {/* Instagram */}
            <a
              href={siteConfig.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="PLATTEROBE on Instagram"
              className="group block py-6 hover:bg-[#F8F5E9]/60 px-4 -mx-4 rounded-[8px] transition-colors duration-150"
            >
              <div className="flex items-center gap-5">
                <div className="w-11 h-11 rounded-[8px] flex items-center justify-center shrink-0 border border-stone-300 group-hover:border-[#1E3A2E] group-hover:bg-[#1E3A2E] group-hover:text-white transition-all duration-200 text-[#1E3A2E]">
                  <InstagramIcon />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] tracking-[0.12em] uppercase text-[#1A1A1A]/40 font-heading font-bold mb-0.5">
                    Instagram
                  </p>
                  <p className="text-[18px] md:text-[20px] font-heading font-700 text-[#1E3A2E]">
                    {siteConfig.instagram.handle}
                  </p>
                  <p className="text-[12px] text-[#1A1A1A]/50 font-body mt-0.5">
                    Follow daily platters and updates
                  </p>
                </div>
                <div className="ml-auto shrink-0">
                  <span className="text-[12px] tracking-[0.08em] uppercase text-[#1E3A2E]/60 group-hover:text-[#1E3A2E] transition-colors font-heading font-semibold">
                    Visit →
                  </span>
                </div>
              </div>
            </a>

            {/* Location */}
            <div className="py-6 px-4 -mx-4">
              <div className="flex items-center gap-5">
                <div className="w-11 h-11 rounded-[8px] flex items-center justify-center shrink-0 border border-stone-300 text-[#1E3A2E]">
                  <MapPin size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] tracking-[0.12em] uppercase text-[#1A1A1A]/40 font-heading font-bold mb-0.5">
                    Location
                  </p>
                  <p className="text-[18px] md:text-[20px] font-heading font-700 text-[#1E3A2E]">
                    {siteConfig.location.display}
                  </p>
                  <p className="text-[12px] text-[#1A1A1A]/50 font-body mt-0.5">
                    Local kitchen &amp; delivery coverage
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WhatsApp Banner */}
        <section className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 pb-20">
          <div className="bg-[#1E3A2E] px-8 py-10 rounded-[8px] text-center max-w-3xl">
            <p className="text-[12px] tracking-[0.12em] uppercase text-[#D4B789] font-heading font-semibold mb-2">
              Fastest way to order
            </p>
            <p className="text-[22px] md:text-[26px] font-heading font-800 text-white tracking-[-0.02em] mb-5">
              Message us directly on WhatsApp
            </p>
            <a
              href={generalWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group inline-flex items-center justify-center gap-2
                bg-white text-[#1E3A2E] text-[13px] tracking-[0.06em] uppercase font-heading font-semibold
                px-8 min-h-[48px] rounded-[8px]
                transition-all duration-200 ease-out
                hover:bg-[#F8F5E9] hover:-translate-y-0.5 active:translate-y-0
              "
              aria-label="Order on WhatsApp"
            >
              <span>Open WhatsApp</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
