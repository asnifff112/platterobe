export const instant = false;

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAllProducts } from "@/lib/db";
import {
  getAllMealPlans,
  getMealCategories,
  getAllSubscriptions,
  getMealClubOverviewStats,
  seedStarterMealPlansIfEmpty,
} from "@/lib/meal-club-db";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard — Platter & Meal Club Management",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: Props) {
  await connection();
  const session = await getAdminSession();

  // Server-side route protection: redirect unauthenticated users to /admin/login immediately
  if (!session.isAuthenticated || session.role !== "admin") {
    redirect("/admin/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const activeTabParam = resolvedParams.tab;

  // Ensure starter plans if fresh
  try {
    await seedStarterMealPlansIfEmpty();
  } catch (err) {
    console.error("Error ensuring starter meal plans in admin:", err);
  }

  const [products, mealPlans, mealCategories, mealSubscriptions, mealOverviewStats] =
    await Promise.all([
      getAllProducts(),
      getAllMealPlans(true),
      getMealCategories(),
      getAllSubscriptions(),
      getMealClubOverviewStats(),
    ]);

  return (
    <div className="min-h-screen bg-[#F8F5E9]/40 text-[#1A1A1A]">
      <AdminHeader username={session.username} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <AdminDashboardClient
          initialProducts={products}
          defaultTab={activeTabParam === "meal-club" ? "meal-club" : "catalog"}
          mealClubData={{
            initialPlans: mealPlans,
            initialCategories: mealCategories,
            initialSubscriptions: mealSubscriptions,
            stats: mealOverviewStats,
          }}
        />
      </main>
    </div>
  );
}

