"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EventProgressGauge() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-[#8A9098]">
          Project Progress
        </h3>
        <span className="text-sm font-bold text-[#17191C]">
          Design Sprint &apos;26
        </span>
      </div>

      {/* Semicircular Arc Gauge matching Donezo monochrome reference */}
      <div className="relative my-4 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center h-36 w-60 overflow-hidden">
          <svg className="w-56 h-28" viewBox="0 0 200 100">
            {/* Background Arch (Pending / Gray) */}
            <path
              d="M 25 100 A 75 75 0 0 1 175 100"
              fill="none"
              stroke="#D4D7DC"
              strokeWidth="22"
              strokeLinecap="round"
            />
            {/* Completed Arch (Dark Charcoal #25292F - approx 61%) */}
            <path
              d="M 25 100 A 75 75 0 0 1 145 35"
              fill="none"
              stroke="#25292F"
              strokeWidth="22"
              strokeLinecap="round"
            />
          </svg>

          {/* Centered Value */}
          <div className="absolute bottom-1 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-[#17191C] leading-none">
              61 %
            </span>
            <span className="text-[11px] font-normal text-[#8A9098] mt-1">
              Completed
            </span>
          </div>
        </div>
      </div>

      {/* Action Button matching Donezo View Full Report */}
      <div className="mt-2 flex justify-center">
        <Link href="/events" className="w-full max-w-[200px]">
          <Button
            variant="outline"
            className="w-full rounded-full border-[#E5E7EA] text-xs font-semibold text-[#17191C] hover:bg-[#F4F5F6]"
          >
            View Full Report
          </Button>
        </Link>
      </div>
    </div>
  );
}
