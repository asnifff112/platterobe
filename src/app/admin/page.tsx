export const instant = false;

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAllProducts } from "@/lib/db";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard - Platter Management",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminDashboardPage() {
  await connection();
  const session = await getAdminSession();

  // Server-side route protection: redirect unauthenticated users to /admin/login immediately
  if (!session.isAuthenticated || session.role !== "admin") {
    redirect("/admin/login");
  }

  const products = await getAllProducts();

  return (
    <div className="min-h-screen bg-[#F8F5E9]/40 text-[#1A1A1A]">
      <AdminHeader username={session.username} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Top page title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[26px] md:text-[32px] font-heading font-800 text-[#1E3A2E] tracking-[-0.02em]">
              Platter Catalog Management
            </h1>
            <p className="text-[14px] text-[#1A1A1A]/60 font-body mt-1">
              Add, update categories, adjust prices, manage ingredients, and toggle availability.
            </p>
          </div>
        </div>

        {/* Interactive Dashboard */}
        <AdminDashboardClient initialProducts={products} />
      </main>
    </div>
  );
}
