import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FinalCTA from "@/components/FinalCTA";

export const metadata: Metadata = {
  title: "About — More Than a Meal. A Daily Essential.",
  description:
    "PLATTEROBE makes fresh, nutritious and affordable meal platters for everyday living in Parappanangadi, Malappuram.",
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-20 md:pt-24 lg:pt-28">
        {/* Hero */}
        <section className="bg-[#F8F5E9] border-b border-stone-200/80">
          <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
            <span className="inline-block text-[11px] tracking-[0.16em] uppercase text-[#6B8F56] font-heading font-semibold mb-4">
              Our Story
            </span>
            <h1 className="text-[38px] sm:text-[52px] md:text-[66px] font-heading font-800 text-[#1E3A2E] tracking-[-0.03em] leading-[1.04] max-w-2xl">
              MORE THAN A MEAL.
              <br />
              A DAILY ESSENTIAL.
            </h1>
          </div>
        </section>

        {/* Narrative */}
        <section className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-14 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
            <div className="border-t border-stone-200/80 pt-8">
              <p className="text-[11px] tracking-[0.14em] uppercase text-[#6B8F56] font-heading font-bold mb-4">
                The Brand
              </p>
              <p className="text-[16px] md:text-[18px] text-[#1A1A1A]/75 font-body leading-[1.75]">
                PLATTEROBE makes fresh, nutritious and affordable meal platters
                for everyday life. We believe healthy eating shouldn’t feel like
                a strict diet or a luxury indulgence.
              </p>
            </div>

            <div className="border-t border-stone-200/80 pt-8">
              <p className="text-[11px] tracking-[0.14em] uppercase text-[#6B8F56] font-heading font-bold mb-4">
                The Philosophy
              </p>
              <p className="text-[16px] md:text-[18px] text-[#1A1A1A]/75 font-body leading-[1.75]">
                Built around simple whole ingredients, balanced macros, and
                frictionless WhatsApp ordering. Honest nutrition made for
                everyday living right here in Parappanangadi.
              </p>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="bg-white border-y border-stone-200/80">
          <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-12 py-14 md:py-20">
            <p className="text-[11px] tracking-[0.16em] uppercase text-[#6B8F56] font-heading font-semibold mb-8">
              What We Stand For
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {[
                {
                  label: "Real Ingredients",
                  desc: "Whole rolled oats, fresh fruit, farm eggs, natural honey. No artificial fillers or syrups.",
                },
                {
                  label: "Everyday Affordable",
                  desc: "Wholesome meal platters priced accessibly starting from ₹49 so good food is sustainable daily.",
                },
                {
                  label: "Balanced Nutrition",
                  desc: "Transparent protein and calorie profiles crafted to keep you energized and genuinely full.",
                },
                {
                  label: "Fresh & Local",
                  desc: "Freshly prepared daily in Parappanangadi and delivered promptly to our local community.",
                },
                {
                  label: "Frictionless WhatsApp Ordering",
                  desc: "No apps to download or complex checkout forms. One tap on WhatsApp and your order is placed.",
                },
                {
                  label: "Friendly & Approachable",
                  desc: "A warm, personal food brand that feels like a dependable daily staple.",
                },
              ].map((item) => (
                <div key={item.label} className="border-t border-stone-200/80 pt-6">
                  <h3 className="font-heading font-700 text-[16px] md:text-[17px] text-[#1E3A2E] mb-2 tracking-[-0.01em]">
                    {item.label}
                  </h3>
                  <p className="text-[14px] text-[#1A1A1A]/65 font-body leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
