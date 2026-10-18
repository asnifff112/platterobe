export const instant = false;

import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import IndexClient from "./IndexClient";
import { lookupSeriesAction, type LookupResult } from "./actions";

export const metadata: Metadata = {
  title: "THE PLATTEROBE INDEX — Platter Verification & Specifications",
  description:
    "Search any platter's unique series number to inspect authentic ingredients, verified kitchen macros, and genuine specifications.",
  robots: {
    index: true,
    follow: true,
  },
};

type PageProps = {
  searchParams: Promise<{ code?: string }>;
};

export default async function ProductIndexPage({ searchParams }: PageProps) {
  await connection();
  const resolvedParams = await searchParams;
  const initialCode = resolvedParams.code ? resolvedParams.code.trim() : "";

  let initialResult: LookupResult | null = null;
  if (initialCode) {
    initialResult = await lookupSeriesAction(initialCode);
  }

  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-20 md:pt-24 min-h-[calc(100vh-160px)] bg-[#FFFFFF]">
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex items-center justify-center p-6 text-stone-400 font-heading text-[13px] uppercase tracking-wider">
              Loading PLATTEROBE Index...
            </div>
          }
        >
          <IndexClient initialCode={initialCode} initialResult={initialResult} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
