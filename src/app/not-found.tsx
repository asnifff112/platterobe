import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main
        id="main-content"
        className="pt-20 md:pt-24 flex items-center justify-center min-h-[75vh]"
      >
        <div className="text-center px-5 py-16">
          <span className="block text-[72px] md:text-[100px] font-heading font-800 text-[#1E3A2E]/10 leading-none mb-4 tracking-[-0.04em]">
            404
          </span>
          <h1 className="text-[28px] md:text-[34px] font-heading font-800 text-[#1E3A2E] tracking-[-0.02em] mb-3">
            Page not found.
          </h1>
          <p className="text-[15px] text-[#1A1A1A]/60 font-body mb-8 max-w-sm mx-auto">
            The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="
              inline-flex items-center justify-center gap-2
              bg-[#1E3A2E] text-white text-[13px] tracking-[0.06em] uppercase font-heading font-semibold
              px-7 min-h-[48px] rounded-[8px]
              hover:bg-[#162d22] hover:-translate-y-0.5 active:translate-y-0
              transition-all duration-200
            "
          >
            <span>Back to Home</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
