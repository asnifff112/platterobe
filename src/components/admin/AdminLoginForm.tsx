"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/app/admin/actions";
import Link from "next/link";
import Image from "next/image";
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-md bg-white border border-stone-200/90 rounded-[12px] p-7 sm:p-10 shadow-[0_8px_30px_rgba(30,58,46,0.06)]">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link
          href="/"
          className="inline-flex flex-col items-center gap-2 mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E] rounded group"
        >
          <Image
            src="/images/logo.png"
            alt="PLATTEROBE Logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain rounded-[10px] shadow-sm"
          />
          <span className="font-heading font-800 text-[19px] tracking-[0.1em] uppercase text-[#1E3A2E]">
            PLATTEROBE
          </span>
        </Link>
        <p className="text-[11px] tracking-[0.16em] uppercase text-[#6B8F56] font-heading font-semibold">
          Admin Console
        </p>
        <h1 className="text-[20px] font-heading font-700 text-[#1E3A2E] mt-3 tracking-[-0.01em]">
          Sign In
        </h1>
        <p className="text-[13px] text-[#1A1A1A]/60 font-body mt-1">
          Enter your authorized credentials to manage the platter catalog.
        </p>
      </div>

      {/* Error alert */}
      {state?.error && (
        <div
          role="alert"
          className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-900 text-[13px] rounded-[8px] font-body flex items-start gap-2.5 animate-fadeIn"
        >
          <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{state.error}</span>
        </div>
      )}

      {/* Login Form */}
      <form action={formAction} className="space-y-4">
        {/* Email Field */}
        <div>
          <label
            htmlFor="identifier"
            className="block text-[11px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E] mb-1.5"
          >
            Email Address
          </label>
          <div className="relative">
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              placeholder="platterobe@gmail.com"
              disabled={isPending}
              className="w-full pl-10 pr-4 py-3 text-[14px] font-body bg-[#F8F5E9]/30 border border-stone-300 rounded-[8px] text-[#1A1A1A] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A2E] focus:border-transparent transition-all disabled:opacity-60"
            />
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Password Field with Show/Hide Toggle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-[11px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E]"
            >
              Password
            </label>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              disabled={isPending}
              className="w-full pl-10 pr-11 py-3 text-[14px] font-body bg-[#F8F5E9]/30 border border-stone-300 rounded-[8px] text-[#1A1A1A] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A2E] focus:border-transparent transition-all disabled:opacity-60"
            />
            <Lock
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isPending}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#1E3A2E] p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E]"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="
            group w-full flex items-center justify-center gap-2
            bg-[#1E3A2E] text-white text-[13px] tracking-[0.08em] uppercase font-heading font-semibold
            px-6 py-3.5 min-h-[48px] rounded-[8px] mt-3
            hover:bg-[#162d22] active:bg-[#0f1f17] transition-all duration-200
            disabled:opacity-60 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2E] focus-visible:ring-offset-2
          "
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <ArrowRight
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </>
          )}
        </button>
      </form>

      {/* Security note */}
      <div className="mt-8 pt-5 border-t border-stone-200/80 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#1A1A1A]/50 font-body">
          <ShieldCheck size={14} className="text-[#6B8F56]" />
          <span>Server-verified encrypted admin session</span>
        </div>
      </div>
    </div>
  );
}

