export const instant = false;

import { Metadata } from "next";
import { connection } from "next/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MealClubClient from "./MealClubClient";
import { getPublishedMealPlans, seedStarterMealPlansIfEmpty } from "@/lib/meal-club-db";
import { getAllProducts } from "@/lib/db";

export const metadata: Metadata = {
  title: "The Meal Club — Thoughtfully Planned Everyday Meals | PLATTEROBE",
  description:
    "Curated 7-day, 14-day, and 30-day meal plans crafted with fresh ingredients, clean nutrition, and seamless meal swaps. Subscribe to everyday nourishment.",
  keywords: [
    "meal club",
    "meal subscription",
    "breakfast subscription",
    "healthy meal plans",
    "platterobe",
    "clean eating",
  ],
  openGraph: {
    title: "The Meal Club | PLATTEROBE",
    description: "Thoughtfully planned meal packages for your everyday. Flexible durations, transparent nutrition, and easy swaps.",
    type: "website",
  },
};

export default async function MealClubPage() {
  await connection();

  // Ensure starter plans exist if catalog was initialized fresh
  try {
    await seedStarterMealPlansIfEmpty();
  } catch (err) {
    console.error("Error ensuring starter plans:", err);
  }

  const [publishedPlans, allProducts] = await Promise.all([
    getPublishedMealPlans(),
    getAllProducts(),
  ]);

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-[#FDFBF7]">
        <MealClubClient
          initialPlans={publishedPlans}
          allProducts={allProducts}
        />
      </main>
      <Footer />
    </>
  );
}
