const steps = [
  {
    number: "01",
    title: "CHOOSE",
    description: "Pick your platter.",
  },
  {
    number: "02",
    title: "ORDER",
    description: "Order through WhatsApp.",
  },
  {
    number: "03",
    title: "ENJOY",
    description: "Freshly prepared for everyday living.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24"
      aria-labelledby="how-it-works-heading"
    >
      <div className="border-b border-stone-200/80 pb-6 mb-12 md:mb-14">
        <p className="text-[11px] tracking-[0.16em] uppercase text-[#6B8F56] font-heading font-semibold mb-2">
          Simple Process
        </p>
        <h2
          id="how-it-works-heading"
          className="text-[32px] md:text-[44px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-tight"
        >
          HOW IT WORKS
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className={`${
              i < steps.length - 1 ? "md:border-r md:border-stone-200/80 md:pr-8" : ""
            }`}
          >
            <span className="block text-[44px] md:text-[56px] font-heading font-800 text-[#1E3A2E]/15 leading-none mb-3 tracking-[-0.03em]">
              {step.number}
            </span>
            <h3 className="text-[18px] md:text-[20px] font-heading font-700 text-[#1E3A2E] tracking-[0.02em] mb-2">
              {step.number} — {step.title}
            </h3>
            <p className="text-[15px] text-[#1A1A1A]/65 font-body leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
