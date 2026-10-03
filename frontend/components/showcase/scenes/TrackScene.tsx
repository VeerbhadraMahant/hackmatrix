"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TRACK_TRANSACTIONS } from "../showcaseData";
import { Check, X, ChevronDown, Calendar, CreditCard, ShoppingBag, Laptop, FileText, Briefcase } from "lucide-react";

export function TrackScene() {
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [transitionState, setTransitionState] = useState<"idle" | "reviewing">("idle");

  const currentTx = TRACK_TRANSACTIONS[index];

  useEffect(() => {
    if (shouldReduceMotion) return;

    const interval = setInterval(() => {
      // Trigger review swipe overlay
      setTransitionState("reviewing");

      const timeout = setTimeout(() => {
        setIndex((prev) => (prev + 1) % TRACK_TRANSACTIONS.length);
        setTransitionState("idle");
      }, 700);

      return () => clearTimeout(timeout);
    }, 2800);

    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  const categories = [
    { label: "Shopping", icon: ShoppingBag },
    { label: "Electronics", icon: Laptop },
    { label: "Miscellaneous", icon: FileText },
    { label: "Business", icon: Briefcase },
  ] as const;

  const tags = [
    { label: "Subscription", dotColor: "bg-rose-500" },
    { label: "Home", dotColor: "bg-teal-500" },
    { label: "Tax", dotColor: "bg-amber-500" },
    { label: "Other", dotColor: "bg-indigo-500" },
  ] as const;

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[340px] select-none">
      {/* Phone-style Container */}
      <div className="relative w-full bg-white rounded-[22px] shadow-[0_18px_45px_rgba(26,24,20,0.09)] border border-[#E9E4DC] p-5 sm:p-6 overflow-hidden">
        {/* Header: Merchant + Amount */}
        <div className="flex items-start justify-between pb-4 border-b border-black/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-[#EA5B14]/20 flex items-center justify-center text-[#EA5B14] shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm sm:text-base text-[#1c1b18] tracking-tight leading-snug">
                {currentTx.merchant}
              </div>
              <div className="text-[11px] text-[#78756d] font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {currentTx.account}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-tabular font-bold text-base sm:text-lg text-[#1c1b18]">
              {currentTx.amount}
            </div>
            <div className="text-[10px] text-[#938f87] uppercase tracking-wider font-medium">
              Cleared
            </div>
          </div>
        </div>

        {/* Section: Category */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold tracking-wider text-[#8b877f] uppercase block mb-2">
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => {
              const isSelected = currentTx.category === cat.label;
              const Icon = cat.icon;
              return (
                <div
                  key={cat.label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-200 border ${
                    isSelected
                      ? "bg-[#FDECE2] text-[#EA5B14] border-[#EA5B14] shadow-xs font-semibold"
                      : "bg-[#F7F5F0] text-[#5c5850] border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 opacity-80" />
                  <span>{cat.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Tags */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold tracking-wider text-[#8b877f] uppercase block mb-2">
            Tags
          </label>
          <div className="grid grid-cols-2 gap-2">
            {tags.map((t) => {
              const isSelected = currentTx.tag === t.label;
              return (
                <div
                  key={t.label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-200 border ${
                    isSelected
                      ? "bg-[#FDECE2] text-[#EA5B14] border-[#EA5B14] shadow-xs font-semibold"
                      : "bg-[#F7F5F0] text-[#5c5850] border-transparent"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${t.dotColor}`} />
                  <span>{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Date */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold tracking-wider text-[#8b877f] uppercase block mb-1.5">
            Date
          </label>
          <div className="flex items-center justify-between px-3 py-2 bg-[#F7F5F0] rounded-xl text-xs text-[#3d3a33] font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#8b877f]" />
              <span>{currentTx.date}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#8b877f]" />
          </div>
        </div>

        {/* Section: Notes */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold tracking-wider text-[#8b877f] uppercase block mb-1.5">
            Notes
          </label>
          <div className="px-3 py-2 bg-[#F7F5F0] rounded-xl text-xs text-[#6e6a61] italic">
            {currentTx.notePlaceholder}
          </div>
        </div>

        {/* Dynamic Swipe Card Overlay: Cyan (Skip) or Orange (Reviewed) */}
        <AnimatePresence>
          {transitionState === "reviewing" && (
            <motion.div
              key={`overlay-${index}`}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 rounded-[22px] ${
                currentTx.swipeType === "skip"
                  ? "bg-[#D9F7F6] text-[#0A5F5B]"
                  : "bg-[#EA5B14] text-white"
              } shadow-lg`}
            >
              {currentTx.swipeType === "skip" ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-white/70 flex items-center justify-center mb-2 shadow-sm">
                    <X className="w-8 h-8 text-[#0A5F5B] stroke-[2.5]" />
                  </div>
                  <span className="font-display text-xl font-bold tracking-tight">Skip</span>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center mb-2 shadow-sm">
                    <Check className="w-8 h-8 text-white stroke-[2.5]" />
                  </div>
                  <span className="font-display text-xl font-bold tracking-tight">Reviewed</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tactile Pedestal / Base Slab (Frame 01 & 13) */}
      <div className="w-44 h-3.5 bg-[#DDD7CB] rounded-full -mt-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.06)] z-0 opacity-80" />
    </div>
  );
}
