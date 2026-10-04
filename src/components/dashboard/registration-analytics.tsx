"use client";

import { useState } from "react";
import { BarChart2, Calendar, TrendingUp } from "lucide-react";

interface AnalyticsBar {
  day: string;
  registrations: number;
  heightPercent: number;
  highlight?: boolean;
  tooltipText?: string;
  isStriped?: boolean;
}

const BARS_DATA: AnalyticsBar[] = [
  { day: "S", registrations: 45, heightPercent: 45, isStriped: true },
  { day: "M", registrations: 120, heightPercent: 75, highlight: true, tooltipText: "74%" },
  { day: "T", registrations: 85, heightPercent: 60, highlight: false },
  { day: "W", registrations: 140, heightPercent: 90, highlight: true },
  { day: "T", registrations: 95, heightPercent: 65, isStriped: true },
  { day: "F", registrations: 70, heightPercent: 50, isStriped: true },
  { day: "S", registrations: 55, heightPercent: 40, isStriped: true },
];

export function RegistrationAnalytics() {
  const [selectedRange, setSelectedRange] = useState("This Week");

  return (
    <div className="flex flex-col justify-between rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#191A1C]">
            Registration Analytics
          </h3>
          <p className="text-xs text-[#65666A]">
            Participant sign-ups across recent event cycles
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-[#EAE8E3] bg-[#F9F8F6] px-2.5 py-1 text-xs font-medium text-[#65666A]">
          <Calendar className="h-3.5 w-3.5 text-[#929398]" />
          <span>{selectedRange}</span>
        </div>
      </div>

      {/* Donezo-style Pill Bar Chart */}
      <div className="mt-8 flex h-48 items-end justify-between gap-3 px-2 sm:px-6">
        {BARS_DATA.map((bar, idx) => (
          <div key={idx} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-36 w-full max-w-[42px] items-end justify-center">
              {/* Tooltip bubble if highlighted */}
              {bar.tooltipText && (
                <div className="absolute -top-7 z-10 flex items-center justify-center rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#191A1C] shadow-md border border-[#E8E6E1]">
                  {bar.tooltipText}
                </div>
              )}

              {/* Pill Shaped Bar */}
              <div
                style={{ height: `${bar.heightPercent}%` }}
                className={`w-full rounded-full transition-all duration-500 ${
                  bar.highlight
                    ? "bg-[#1B4332] shadow-sm"
                    : bar.isStriped
                    ? "bg-[#EAE8E3] bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.7)_4px,rgba(255,255,255,0.7)_8px)]"
                    : "bg-[#74A690]"
                }`}
                title={`${bar.registrations} registrations`}
              />
            </div>
            {/* Day Label */}
            <span className="text-xs font-semibold text-[#929398]">
              {bar.day}
            </span>
          </div>
        ))}
      </div>

      {/* Legend / Metrics Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-[#F5F4F1] pt-3 text-[11px] text-[#65666A]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#1B4332]" />
          <span>Peak Registration Days</span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-emerald-700">
          <TrendingUp className="h-3 w-3" />
          <span>+24% vs prior cohort</span>
        </div>
      </div>
    </div>
  );
}
