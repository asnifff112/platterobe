export const instant = false;

import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import IndexClient from "./IndexClient";
import { lookupSeriesAction, type LookupResult } from "./actions";

export const metadata: Metadata = {
  title: "THE PLATTEROBE INDEX — Platter Verification & Specifications",
  description:
    "Verify PLATTEROBE platter authenticity, inspect fresh whole-food ingredients, and review kitchen nutritional macros.",
  robots: {
    index: false,
    follow: false,
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-6 text-stone-400 font-heading text-[13px] uppercase tracking-wider">
          Loading PLATTEROBE Index...
        </div>
      }
    >
      <IndexClient initialCode={initialCode} initialResult={initialResult} />
    </Suspense>
  );
}
