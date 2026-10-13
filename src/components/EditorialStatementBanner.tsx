export default function EditorialStatementBanner() {
  return (
    <section
      className="border-y border-stone-200/80 bg-[#F8F5E9]/50 py-5 overflow-hidden"
      aria-label="Brand Highlights"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 flex flex-wrap items-center justify-between gap-4 text-[11px] sm:text-[12px] font-heading font-semibold tracking-[0.16em] uppercase text-[#1E3A2E]/80">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B8F56]" aria-hidden="true" />
          Fresh Daily Platters
        </span>
        <span className="hidden sm:inline text-stone-300" aria-hidden="true">•</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B8F56]" aria-hidden="true" />
          100% Real Ingredients
        </span>
        <span className="hidden md:inline text-stone-300" aria-hidden="true">•</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B8F56]" aria-hidden="true" />
          Transparent Nutrition
        </span>
        <span className="hidden lg:inline text-stone-300" aria-hidden="true">•</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B8F56]" aria-hidden="true" />
          Parappanangadi | Malappuram
        </span>
      </div>
    </section>
  );
}
