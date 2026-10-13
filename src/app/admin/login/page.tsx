import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: {
    index: false,
    follow: false,
  },
};

async function LoginContent() {
  const session = await getAdminSession();
  if (session.isAuthenticated) {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#F8F5E9] flex flex-col justify-center items-center px-4 py-12">
      <Suspense
        fallback={
          <div className="text-stone-400 font-heading text-[13px]">
            Loading console...
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}
