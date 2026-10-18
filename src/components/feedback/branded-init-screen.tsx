"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface BrandedInitScreenProps {
  message?: string;
  subMessage?: string;
}

export function BrandedInitScreen({
  message = "Preparing your workspace",
  subMessage = "Verifying administrator session & environment",
}: BrandedInitScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F5F6] dark:bg-[#111315] text-[#17191C] dark:text-[#F1F2F3] select-none p-6">
      {/* Ambient background watermark */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.02] dark:opacity-[0.03] select-none overflow-hidden"
        aria-hidden="true"
      >
        <span className="text-[26vw] font-black tracking-tighter leading-none">
          SKETCH
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Animated Geometric Halo & Actual Sketch Logo */}
        <div className="relative flex items-center justify-center">
          {/* Subtle pulsating geometric outer ring */}
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.15, 0.35, 0.15],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute h-24 w-24 rounded-full border border-[#17191C] dark:border-[#F1F2F3]"
          />

          {/* Rotating dashed geometric orbit */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 16,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute h-20 w-20 rounded-full border border-dashed border-[#17191C]/30 dark:border-[#F1F2F3]/30"
          />

          {/* Actual Sketch Logo Mark Container */}
          <div className="relative h-14 w-14 rounded-2xl bg-white dark:bg-[#1A1D20] p-2.5 border border-[#E5E7EA] dark:border-[#30353A] shadow-md flex items-center justify-center">
            <Image
              src="/sketch-logo.png"
              alt="Sketch Mark"
              width={40}
              height={40}
              priority
              className="object-contain h-full w-full dark:invert"
            />
          </div>
        </div>

        {/* Brand Title */}
        <div className="mt-6 flex items-center gap-1.5">
          <span className="text-base font-extrabold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
            SketchHUB
          </span>
          <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#EAECEF] dark:bg-[#25292F] text-[#656B73] dark:text-[#9EA5AD]">
            Ops
          </span>
        </div>

        {/* Dynamic status messaging */}
        <h2 className="mt-3 text-sm font-semibold text-[#17191C] dark:text-[#F1F2F3] tracking-tight">
          {message}
        </h2>
        <p className="mt-1 text-xs text-[#8A9098] dark:text-[#7D858F] leading-relaxed">
          {subMessage}
        </p>

        {/* Minimalist indeterminate linear progress meter */}
        <div className="mt-5 w-44 h-1 rounded-full bg-[#E5E7EA] dark:bg-[#25292E] overflow-hidden">
          <motion.div
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-full w-1/2 rounded-full bg-[#25292F] dark:bg-[#E8EAED]"
          />
        </div>
      </div>
    </div>
  );
}
