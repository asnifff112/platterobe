import Image from "next/image";
import Link from "next/link";

export default function EditorialShowcase() {
  return (
    <section
      className="border-y border-stone-200/80 bg-[#F8F5E9] py-16 md:py-24"
      aria-label="Editorial Showcase"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left: Large Editorial Image */}
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-[8px] overflow-hidden bg-white">
              <Image
                src="/images/chia-banana-pudding.jpg"
                alt="PLATTEROBE fresh preparation — whole wholesome ingredients"
                fill
                className="object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 600px"
              />
            </div>
          </div>

          {/* Right: Short Editorial Text Block */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <span className="text-[11px] tracking-[0.16em] uppercase text-[#6B8F56] font-heading font-semibold mb-3">
              Made Fresh Daily
            </span>

            <h2 className="text-[34px] sm:text-[42px] lg:text-[48px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-[1.08] mb-5">
              HONEST FOOD.
              <br />
              NOTHING ARTIFICIAL.
            </h2>

            <p className="text-[15px] md:text-[17px] text-[#1A1A1A]/70 font-body leading-[1.68] mb-8 max-w-lg">
              We keep our recipes straightforward: whole rolled oats, fresh
              bananas, farm-fresh eggs, pure honey, and real milk or curd. Every
              platter is prepared fresh to deliver steady morning fuel with zero
              compromises.
            </p>

            <div>
              <Link
                href="/menu"
                className="
                  group inline-flex items-center gap-2
                  text-[13px] tracking-[0.08em] uppercase font-heading font-semibold text-[#1E3A2E]
                  hover:text-[#6B8F56] transition-colors duration-150
                "
              >
                <span>Browse The Collection</span>
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
