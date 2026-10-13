"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { ExternalLink, LogOut, Shield, KeyRound } from "lucide-react";
import ChangePasswordModal from "./ChangePasswordModal";

export default function AdminHeader({ username }: { username?: string }) {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-stone-200/80 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Left */}
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="font-heading font-800 text-[16px] md:text-[17px] tracking-[0.08em] uppercase text-[#1E3A2E]"
              >
                PLATTEROBE
              </Link>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-[0.08em] bg-[#1E3A2E]/8 text-[#1E3A2E]">
                <Shield size={11} className="text-[#6B8F56]" />
                Console
              </span>
            </div>

            {/* Actions Right */}
            <div className="flex items-center gap-3 sm:gap-5">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-heading font-semibold uppercase tracking-[0.05em] text-[#1A1A1A]/70 hover:text-[#1E3A2E] transition-colors"
                title="Open public website in new tab"
              >
                <span className="hidden sm:inline">View Public Site</span>
                <ExternalLink size={13} />
              </Link>

              <div className="h-4 w-px bg-stone-200 hidden sm:block" />

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-[12px] font-heading font-medium text-[#1A1A1A]/60 hidden md:inline">
                  Signed in as <strong className="text-[#1E3A2E]">{username || "platterobe@gmail.com"}</strong>
                </span>

                {/* Change Password Button */}
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="
                    inline-flex items-center gap-1.5
                    text-[12px] font-heading font-semibold uppercase tracking-[0.06em]
                    text-stone-700 hover:text-[#1E3A2E] hover:bg-stone-100
                    px-2.5 sm:px-3 py-1.5 rounded-[6px] border border-stone-200
                    transition-all duration-150
                  "
                  title="Change administrator password"
                >
                  <KeyRound size={13} className="text-[#6B8F56]" />
                  <span className="hidden sm:inline">Password</span>
                </button>

                {/* Logout Form */}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="
                      inline-flex items-center gap-1.5
                      text-[12px] font-heading font-semibold uppercase tracking-[0.06em]
                      text-stone-600 hover:text-red-700 hover:bg-red-50/70
                      px-2.5 sm:px-3 py-1.5 rounded-[6px] border border-stone-200 hover:border-red-200
                      transition-all duration-150
                    "
                    title="Sign out of admin session"
                  >
                    <LogOut size={13} />
                    <span>Logout</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </header>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  );
}
