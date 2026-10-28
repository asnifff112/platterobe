"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Lock,
  CheckCircle2,
  Phone,
  MessageSquare,
  ArrowLeft,
  Calendar,
  User,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { MealSubscription, ConfirmedMealSelection } from "@/data/meal-club-types";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/country";

interface ConfirmedOrderClientProps {
  subscription: MealSubscription;
}

export default function ConfirmedOrderClient({ subscription }: ConfirmedOrderClientProps) {
  const currency = subscription.currency || "INR";

  // Group confirmed meals by day
  const groupedDays = useMemo(() => {
    const map = new Map<number, ConfirmedMealSelection[]>();
    for (const item of subscription.dailySchedule) {
      const list = map.get(item.dayNumber) || [];
      list.push(item);
      map.set(item.dayNumber, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [subscription.dailySchedule]);

  // Calculate nutrition from historical snapshots
  const { totalCalories, totalProtein, avgDailyCalories, avgDailyProtein } = useMemo(() => {
    let cal = 0;
    let prot = 0;
    for (const item of subscription.dailySchedule) {
      if (item.calories) {
        cal += item.calories;
      }
      if (item.protein) {
        const p = parseFloat(item.protein.replace(/[^0-9.]/g, ""));
        if (!isNaN(p)) prot += p;
      }
    }
    const days = Math.max(1, subscription.planDuration || 1);
    return {
      totalCalories: cal,
      totalProtein: Math.round(prot * 10) / 10,
      avgDailyCalories: Math.round(cal / days),
      avgDailyProtein: Math.round((prot / days) * 10) / 10,
    };
  }, [subscription.dailySchedule, subscription.planDuration]);

  const formattedStartDate = new Date(subscription.startDate).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedEndDate = new Date(subscription.endDate).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const confirmedDate = subscription.confirmedAt
    ? new Date(subscription.confirmedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recently confirmed";

  const supportWhatsAppUrl = `${siteConfig.whatsapp.url}?text=${encodeURIComponent(
    `Hello PLATTEROBE Support, I am inquiring regarding my Meal Club Subscription ID: ${subscription.id} (${subscription.planName}).`
  )}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Top Back Link */}
      <div className="mb-6">
        <Link
          href="/meal-club"
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#1E3A2E]/70 hover:text-[#1E3A2E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Meal Club
        </Link>
      </div>

      {/* Hero Confirmation Card */}
      <div className="bg-[#1E3A2E] text-white rounded-3xl p-6 md:p-10 shadow-xl mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#6B8F56]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#6B8F56]/30 text-[#D4E7C5] px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-4 border border-[#6B8F56]/40">
              <CheckCircle2 className="w-4 h-4 text-[#A8D5BA]" />
              Order Confirmed & Active
            </div>
            <h1 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight text-white mb-2">
              YOUR MEALS ARE LOCKED.
            </h1>
            <p className="text-stone-300 text-sm md:text-base max-w-xl font-body leading-relaxed">
              Your selections for <span className="font-semibold text-white">{subscription.planName}</span> have been confirmed. Fresh, artisanal platters will be prepared according to your chosen schedule.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 md:min-w-[240px] text-right md:text-left">
            <span className="text-[11px] uppercase tracking-wider text-stone-300 block mb-1">
              Confirmed Total
            </span>
            <div className="text-3xl font-heading font-extrabold text-white">
              {formatPrice(subscription.totalAmount, currency === "AED" ? "AE" : "IN")}
            </div>
            <span className="text-xs text-stone-400 block mt-1">
              Subscription #{subscription.id.slice(0, 10).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Strict Order Locking Notice */}
        <div className="mt-8 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white tracking-wide">
                Selections Permanently Locked ({confirmedDate})
              </p>
              <p className="text-xs text-stone-300">
                To guarantee kitchen procurement and freshness, customer meal swaps are now closed.
              </p>
            </div>
          </div>

          <a
            href={supportWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-[#1E3A2E] hover:bg-[#F8F5E9] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
            Contact Kitchen Support
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Day-by-Day Locked Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <div>
              <h2 className="text-xl font-heading font-bold text-[#1E3A2E]">
                Confirmed Daily Menu ({groupedDays.length} Days)
              </h2>
              <p className="text-xs text-stone-500 font-body">
                Historical snapshot preserved. Kitchen will cook exactly this menu.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 bg-stone-100 px-3 py-1 rounded-full font-medium">
              <Lock className="w-3 h-3 text-stone-400" />
              Read-Only
            </span>
          </div>

          <div className="space-y-4">
            {groupedDays.map(([dayNumber, items]) => (
              <div
                key={dayNumber}
                className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs transition-all hover:border-stone-300"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#1E3A2E] text-white text-xs font-bold flex items-center justify-center">
                      {dayNumber}
                    </span>
                    <span className="text-sm font-bold text-[#1E3A2E] font-heading">
                      Day {dayNumber}
                    </span>
                  </div>
                  <span className="text-[11px] tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold">
                    Confirmed
                  </span>
                </div>

                <div className="space-y-3">
                  {items.map((slot) => (
                    <div
                      key={`${slot.dayNumber}-${slot.slotKey}`}
                      className="flex items-center gap-4 p-3 rounded-xl bg-stone-50/70 border border-stone-100"
                    >
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-stone-200 shrink-0">
                        {slot.productImage ? (
                          <Image
                            src={slot.productImage}
                            alt={slot.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-stone-400">
                            PLTR
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] tracking-wider uppercase font-bold text-[#6B8F56]">
                            {slot.slotName || slot.category}
                          </span>
                          {slot.isSwapped && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                              Swapped
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-[#1E3A2E] truncate font-heading">
                          {slot.productName}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                          {slot.calories !== null && slot.calories !== undefined && (
                            <span>{slot.calories} kcal</span>
                          )}
                          {slot.protein && (
                            <span>• {slot.protein} protein</span>
                          )}
                          {slot.productPrice !== undefined && (
                            <span className="text-stone-400">
                              • Snapshot Price: {formatPrice(slot.productPrice, currency === "AED" ? "AE" : "IN")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center text-stone-400">
                        <Lock className="w-4 h-4 text-stone-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Customer Details & Nutrition Card */}
        <div className="space-y-6">
          {/* Nutrition Summary */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#6B8F56]" />
              <h3 className="text-sm font-bold tracking-wider uppercase text-[#1E3A2E] font-heading">
                Nutrition Profile
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">
                  Daily Avg. Energy
                </span>
                <span className="text-lg font-heading font-extrabold text-[#1E3A2E]">
                  {avgDailyCalories}
                </span>
                <span className="text-xs text-stone-500 ml-1">kcal</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">
                  Daily Avg. Protein
                </span>
                <span className="text-lg font-heading font-extrabold text-[#1E3A2E]">
                  {avgDailyProtein}
                </span>
                <span className="text-xs text-stone-500 ml-1">g</span>
              </div>
            </div>

            <div className="text-xs text-stone-500 font-body leading-relaxed pt-3 border-t border-stone-100">
              Total Plan Energy: <strong className="text-stone-700">{totalCalories} kcal</strong> and{" "}
              <strong className="text-stone-700">{totalProtein}g protein</strong> across all {subscription.planDuration} days.
            </div>
          </div>

          {/* Delivery & Contact Details */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#1E3A2E] font-heading">
              Delivery Information
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <User className="w-4 h-4 text-[#6B8F56] shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">Customer</span>
                  <span className="font-semibold text-stone-800">{subscription.customerName}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#6B8F56] shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">Phone</span>
                  <span className="font-semibold text-stone-800">{subscription.customerPhone}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#6B8F56] shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">Schedule Duration</span>
                  <span className="font-semibold text-stone-800">
                    {formattedStartDate} — {formattedEndDate}
                  </span>
                  <span className="text-stone-500 block mt-0.5">
                    Country: {subscription.country === "AE" ? "United Arab Emirates 🇦🇪" : "India 🇮🇳"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#6B8F56] shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase">Delivery Address</span>
                  <span className="font-semibold text-stone-800 leading-snug block">
                    {subscription.deliveryAddress}, {subscription.city}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-500">Subscription Status</span>
              <span className="font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full">
                {subscription.status}
              </span>
            </div>
          </div>

          {/* Need help banner */}
          <div className="bg-[#F8F5E9] border border-stone-200 rounded-2xl p-5">
            <h4 className="text-xs font-bold tracking-wider uppercase text-[#1E3A2E] font-heading mb-1.5">
              Need exceptional adjustments?
            </h4>
            <p className="text-xs text-stone-600 font-body mb-3 leading-relaxed">
              If you have dietary emergencies or need to pause delivery for travel, contact our customer support team directly.
            </p>
            <a
              href={supportWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#1E3A2E] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#1E3A2E]/90 transition-all shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
              Chat with Support on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
