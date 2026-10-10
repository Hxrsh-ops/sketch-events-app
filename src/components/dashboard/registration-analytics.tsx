"use client";

import { useState } from "react";
import { Users, QrCode } from "lucide-react";

interface AnalyticsBar {
  day: string;
  count: number;
  heightPercent: number;
  isPeak?: boolean;
}

const REGISTRATION_SERIES: AnalyticsBar[] = [
  { day: "Sun", count: 45, heightPercent: 40 },
  { day: "Mon", count: 110, heightPercent: 75 },
  { day: "Tue", count: 85, heightPercent: 60 },
  { day: "Wed", count: 145, heightPercent: 88 },
  { day: "Thu", count: 180, heightPercent: 100, isPeak: true },
  { day: "Fri", count: 90, heightPercent: 65 },
  { day: "Sat", count: 125, heightPercent: 80 },
];

const CHECKIN_SERIES: AnalyticsBar[] = [
  { day: "Sun", count: 20, heightPercent: 25 },
  { day: "Mon", count: 45, heightPercent: 42 },
  { day: "Tue", count: 95, heightPercent: 75 },
  { day: "Wed", count: 160, heightPercent: 92 },
  { day: "Thu", count: 195, heightPercent: 100, isPeak: true },
  { day: "Fri", count: 140, heightPercent: 80 },
  { day: "Sat", count: 85, heightPercent: 60 },
];

export function RegistrationAnalytics() {
  const [activeTab, setActiveTab] = useState<"registrations" | "checkins">("registrations");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeSeries = activeTab === "registrations" ? REGISTRATION_SERIES : CHECKIN_SERIES;
  const totalInSeries = activeSeries.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Registration & Check-in Trajectory
            </h3>
            <span className="rounded-full bg-[#F0F1F2] dark:bg-[#25292F] px-2 py-0.5 text-[10px] font-medium text-[#656B73] dark:text-[#A6ADB5]">
              Preview Data
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#656B73] dark:text-[#A6ADB5]">
            {totalInSeries.toLocaleString()} total {activeTab === "registrations" ? "registrations" : "check-ins"} across 7 days
          </p>
        </div>

        {/* Compact Tab Switcher */}
        <div className="flex items-center rounded-full bg-[#F4F5F6] dark:bg-[#151719] p-0.5 border border-[#E5E7EA] dark:border-[#30353A] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("registrations")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              activeTab === "registrations"
                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-sm"
                : "text-[#656B73] dark:text-[#A6ADB5] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
            }`}
          >
            <Users className="h-3 w-3" />
            <span>Registrations</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checkins")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              activeTab === "checkins"
                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-sm"
                : "text-[#656B73] dark:text-[#A6ADB5] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
            }`}
          >
            <QrCode className="h-3 w-3" />
            <span>Check-ins</span>
          </button>
        </div>
      </div>

      {/* Proportional Monochrome Pill Bar Chart */}
      <div className="mt-5">
        <div className="relative flex h-32 items-end justify-between gap-2 border-b border-[#E5E7EA] dark:border-[#30353A] pb-2 px-2 sm:px-4">
          {activeSeries.map((bar, idx) => (
            <div
              key={`${activeTab}-${bar.day}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group relative flex flex-1 flex-col items-center justify-end h-full"
            >
              {/* Tooltip on hover */}
              {hoveredIdx === idx && (
                <div className="absolute -top-8 z-20 whitespace-nowrap rounded-full bg-[#17191C] dark:bg-[#E8EAED] px-2.5 py-0.5 text-[10px] font-semibold text-white dark:text-[#111315] shadow-sm pointer-events-none">
                  {bar.count} {activeTab === "registrations" ? "registered" : "checked in"}
                </div>
              )}

              {/* Pill Shaped Bar */}
              <div
                style={{ height: `${bar.heightPercent}%` }}
                className={`w-full max-w-[28px] rounded-full transition-all duration-300 cursor-pointer ${
                  bar.isPeak
                    ? "bg-[#25292F] dark:bg-[#E8EAED]"
                    : "bg-[#989EA7]/70 dark:bg-[#7D858F]/50 hover:bg-[#25292F]/80 dark:hover:bg-[#E8EAED]/80"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Day Labels below the baseline */}
        <div className="flex items-center justify-between gap-2 px-2 sm:px-4 pt-2">
          {activeSeries.map((bar, idx) => (
            <div key={`label-${bar.day}`} className="flex-1 text-center">
              <span
                className={`text-[11px] font-medium transition-colors ${
                  hoveredIdx === idx ? "text-[#17191C] dark:text-[#F1F2F3] font-semibold" : "text-[#8A9098] dark:text-[#7D858F]"
                }`}
              >
                {bar.day}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
