export const instant = false;

import { Metadata } from "next";
import { connection } from "next/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MyClubComingSoon from "@/components/meal-club/MyClubComingSoon";
import MealClubClient from "./MealClubClient";
import { getPublishedMealPlans, seedStarterMealPlansIfEmpty } from "@/lib/meal-club-db";
import { getAllProducts } from "@/lib/db";

/**
 * MY CLUB LAUNCH STATUS:
 * - When false: Displays the temporary, polished "Coming Soon" page as requested.
 * - When ready to launch: Set to true to activate the full interactive package system.
 * All underlying database tables, meal plans, and subscriptions remain intact.
 */
const IS_MY_CLUB_LIVE = false;

export const metadata: Metadata = {
  title: "My Club — Coming Soon | PLATTEROBE",
  description:
    "We’re preparing something special for your everyday nourishment. A little more care, thoughtfully brought together. My Club is coming soon.",
  keywords: [
    "my club",
    "meal club",
    "meal subscription",
    "breakfast subscription",
    "healthy meal plans",
    "platterobe",
    "clean eating",
  ],
  openGraph: {
    title: "My Club — Coming Soon | PLATTEROBE",
    description: "Something Good Is Coming. We’re preparing something special for your everyday nourishment.",
    type: "website",
  },
};

export default async function MealClubPage() {
  await connection();

  if (!IS_MY_CLUB_LIVE) {
    return (
      <>
        <Navbar />
        <main id="main-content" className="min-h-screen bg-[#FDFBF7] pt-16 md:pt-20">
          <MyClubComingSoon />
        </main>
        <Footer />
      </>
    );
  }

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
