"use client";

import { useState } from "react";
import type { Product } from "@/data/products";
import { removeProduct } from "@/app/admin/actions";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteConfirmModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedId?: string) => void;
}

export default function DeleteConfirmModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  async function handleConfirmDelete() {
    if (!product) return;
    setLoading(true);
    setError(null);

    try {
      const res = await removeProduct(product.id);
      if (res?.success) {
        setLoading(false);
        onSuccess(product.id);
      } else {
        setError(res?.error || "Failed to delete product from database.");
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-[10px] shadow-2xl border border-stone-200 p-6 overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-[17px] font-heading font-bold text-[#1E3A2E]">
              Delete Platter?
            </h3>
            <p className="text-[13px] text-[#1A1A1A]/70 font-body mt-1 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-[#1E3A2E]">{product.name}</strong> from the
              database? This action cannot be undone and will remove it from the
              public menu.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-[12px] rounded-[6px] font-body">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-heading font-semibold uppercase tracking-[0.05em] text-stone-600 hover:text-stone-900 border border-stone-200 rounded-[6px] hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={loading}
            className="
              inline-flex items-center gap-1.5
              px-5 py-2 text-[13px] font-heading font-semibold uppercase tracking-[0.05em]
              bg-red-600 hover:bg-red-700 text-white rounded-[6px]
              transition-colors disabled:opacity-60
            "
          >
            <Trash2 size={14} />
            <span>{loading ? "Deleting..." : "Confirm Delete"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
