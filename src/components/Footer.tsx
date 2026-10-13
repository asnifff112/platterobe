import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";

function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
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

const CURRENT_YEAR = 2026;

export default function Footer() {
  const year = CURRENT_YEAR;

  return (
    <footer className="bg-[#F8F5E9] border-t border-stone-200/80" aria-label="Footer">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <Link
              href="/"
              className="font-heading font-800 tracking-[0.08em] text-[16px] text-[#1E3A2E] uppercase block mb-3"
            >
              PLATTEROBE
            </Link>
            <p className="text-[14px] text-[#1A1A1A]/70 font-body leading-relaxed max-w-sm mb-3">
              MORE THAN A MEAL.
              <br />
              A DAILY ESSENTIAL.
            </p>
            <p className="text-[13px] text-[#1A1A1A]/50 font-body">
              {siteConfig.location.display}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3">
            <p className="text-[11px] tracking-[0.14em] uppercase text-[#1E3A2E] font-heading font-bold mb-4">
              Explore
            </p>
            <nav aria-label="Footer navigation">
              <ul className="space-y-2.5">
                {siteConfig.nav.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-[#1A1A1A]/70 hover:text-[#1E3A2E] font-body transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Contact Details */}
          <div className="md:col-span-4">
            <p className="text-[11px] tracking-[0.14em] uppercase text-[#1E3A2E] font-heading font-bold mb-4">
              Connect &amp; Order
            </p>
            <ul className="space-y-3 font-body">
              <li>
                <a
                  href={siteConfig.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[14px] text-[#1A1A1A]/70 hover:text-[#1E3A2E] transition-colors duration-150"
                  aria-label="Order on WhatsApp"
                >
                  <MessageCircle size={15} strokeWidth={1.75} className="text-[#1E3A2E]" />
                  <span>WhatsApp: {siteConfig.whatsapp.displayNumber}</span>
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.phone.url}
                  className="inline-flex items-center gap-2 text-[14px] text-[#1A1A1A]/70 hover:text-[#1E3A2E] transition-colors duration-150"
                  aria-label={`Call PLATTEROBE at ${siteConfig.phone.display}`}
                >
                  <Phone size={15} strokeWidth={1.75} className="text-[#1E3A2E]" />
                  <span>Phone: {siteConfig.phone.display}</span>
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[14px] text-[#1A1A1A]/70 hover:text-[#1E3A2E] transition-colors duration-150"
                  aria-label="PLATTEROBE on Instagram"
                >
                  <InstagramIcon size={15} />
                  <span>Instagram: {siteConfig.instagram.handle}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-stone-200/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#1A1A1A]/45 font-body">
          <p>© {year} PLATTEROBE. All rights reserved.</p>
          <p>Everyday food, made better.</p>
        </div>
      </div>
    </footer>
  );
}
