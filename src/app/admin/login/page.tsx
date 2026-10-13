import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import type { Metadata } from "next";

export const instant = false;

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: {
    index: false,
  },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session.isAuthenticated && session.role === "admin") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-[#F8F5E9] flex flex-col justify-center items-center px-4 py-12">
      <AdminLoginForm />
    </div>
  );
}
