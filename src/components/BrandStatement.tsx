export default function BrandStatement() {
  return (
    <section
      className="bg-[#F8F5E9] border-y border-stone-200/80 py-16 md:py-24"
      aria-labelledby="brand-statement-heading"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
        <div className="max-w-3xl">
          <p className="text-[11px] tracking-[0.16em] uppercase text-[#6B8F56] font-heading font-semibold mb-4">
            Our Philosophy
          </p>
          <h2
            id="brand-statement-heading"
            className="text-[34px] sm:text-[46px] md:text-[56px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-[1.05] mb-6"
          >
            NOT A DIET.
            <br />
            JUST BETTER FOOD.
          </h2>
          <p className="text-[16px] md:text-[18px] text-[#1A1A1A]/70 leading-[1.7] max-w-xl font-body">
            Real food with the nutrition your body needs — balanced calories,
            quality protein, and wholesome ingredients, made for everyday living.
          </p>
        </div>
      </div>
    </section>
  );
}
