"use client";

import { useState } from "react";
import { changePasswordAction } from "@/app/admin/actions";
import { X, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setIsPending(true);
    const formData = new FormData();
    formData.set("currentPassword", currentPassword);
    formData.set("newPassword", newPassword);
    formData.set("confirmPassword", confirmPassword);

    try {
      const res = await changePasswordAction(null, formData);
      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        setSuccess(res.message || "Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 2000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      setError(msg);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-[12px] shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#F8F5E9]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1E3A2E]/10 flex items-center justify-center text-[#1E3A2E]">
              <KeyRound size={16} />
            </div>
            <div>
              <h2 className="text-[16px] font-heading font-bold text-[#1E3A2E]">
                Change Admin Password
              </h2>
              <p className="text-[12px] text-[#1A1A1A]/60 font-body">
                Update credentials for PLATTEROBE admin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-[6px] hover:bg-stone-100 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 text-red-900 text-[13px] rounded-[6px] font-body flex items-start gap-2"
            >
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="alert"
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-[13px] rounded-[6px] font-body flex items-start gap-2"
            >
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-[11px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E] mb-1.5">
              Current Password *
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={isPending}
                className="w-full pl-9 pr-10 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[11px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E] mb-1.5">
              New Password * (Min 8 characters)
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                disabled={isPending}
                className="w-full pl-9 pr-10 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[11px] font-heading font-bold uppercase tracking-[0.08em] text-[#1E3A2E] mb-1.5">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isPending}
                className="w-full pl-9 pr-4 py-2.5 text-[14px] font-body bg-white border border-stone-300 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[#1E3A2E]"
              />
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-[13px] font-heading font-semibold text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 rounded-[6px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="
                inline-flex items-center gap-2 px-5 py-2
                bg-[#1E3A2E] text-white text-[13px] font-heading font-semibold uppercase tracking-[0.04em]
                hover:bg-[#162d22] rounded-[6px] transition-colors disabled:opacity-50
              "
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              <span>{isPending ? "Updating..." : "Update Password"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
