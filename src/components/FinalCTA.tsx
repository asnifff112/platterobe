import { generalWhatsAppUrl } from "@/lib/whatsapp";

export default function FinalCTA() {
  return (
    <section
      className="bg-[#1E3A2E] py-20 md:py-28"
      aria-labelledby="final-cta-heading"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 text-center">
        <p className="text-[11px] tracking-[0.16em] uppercase text-[#D4B789] font-heading font-semibold mb-4">
          Ready to Order?
        </p>
        <h2
          id="final-cta-heading"
          className="text-[36px] sm:text-[48px] md:text-[60px] font-heading font-800 text-white tracking-[-0.03em] leading-[1.06] mb-8"
        >
          READY FOR YOUR
          <br />
          EVERYDAY PLATTER?
        </h2>
        <a
          href={generalWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            group inline-flex items-center justify-center gap-2
            bg-white text-[#1E3A2E] text-[13px] tracking-[0.06em] uppercase font-heading font-semibold
            px-8 min-h-[50px] rounded-[8px]
            transition-all duration-200 ease-out
            hover:bg-[#F8F5E9] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E3A2E]
          "
          aria-label="Order on WhatsApp"
        >
          <span>Order on WhatsApp</span>
          <span
            aria-hidden="true"
            className="transition-transform duration-200 ease-out group-hover:translate-x-1"
          >
            →
          </span>
        </a>
      </div>
    </section>
  );
}
