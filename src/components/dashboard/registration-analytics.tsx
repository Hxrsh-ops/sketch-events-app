"use client";

import { useState, useMemo } from "react";
import { Users, QrCode } from "lucide-react";
import { Participant } from "@/types";

interface AnalyticsBar {
  day: string;
  count: number;
  heightPercent: number;
  isPeak?: boolean;
}

const PREVIEW_REGISTRATION_SERIES: AnalyticsBar[] = [
  { day: "Sun", count: 45, heightPercent: 40 },
  { day: "Mon", count: 110, heightPercent: 75 },
  { day: "Tue", count: 85, heightPercent: 60 },
  { day: "Wed", count: 145, heightPercent: 88 },
  { day: "Thu", count: 180, heightPercent: 100, isPeak: true },
  { day: "Fri", count: 90, heightPercent: 65 },
  { day: "Sat", count: 125, heightPercent: 80 },
];

const PREVIEW_CHECKIN_SERIES: AnalyticsBar[] = [
  { day: "Sun", count: 20, heightPercent: 25 },
  { day: "Mon", count: 45, heightPercent: 42 },
  { day: "Tue", count: 95, heightPercent: 75 },
  { day: "Wed", count: 160, heightPercent: 92 },
  { day: "Thu", count: 195, heightPercent: 100, isPeak: true },
  { day: "Fri", count: 140, heightPercent: 80 },
  { day: "Sat", count: 85, heightPercent: 60 },
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface RegistrationAnalyticsProps {
  participants?: Participant[];
  isPreview?: boolean;
}

export function RegistrationAnalytics({
  participants,
  isPreview = false,
}: RegistrationAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<"registrations" | "checkins">(
    "registrations"
  );
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { registrationSeries, checkinSeries } = useMemo(() => {
    if (isPreview && (!participants || participants.length === 0)) {
      return {
        registrationSeries: PREVIEW_REGISTRATION_SERIES,
        checkinSeries: PREVIEW_CHECKIN_SERIES,
      };
    }

    if (!participants || participants.length === 0) {
      const emptySeries: AnalyticsBar[] = DAYS_OF_WEEK.map((day) => ({
        day,
        count: 0,
        heightPercent: 10,
        isPeak: false,
      }));
      return { registrationSeries: emptySeries, checkinSeries: emptySeries };
    }

    // Build real 7-day distribution from actual participant timestamps
    const regDayCounts = new Array(7).fill(0);
    const checkinDayCounts = new Array(7).fill(0);

    participants.forEach((p) => {
      if (p.registeredAt) {
        const d = new Date(p.registeredAt);
        if (!isNaN(d.getTime())) {
          regDayCounts[d.getDay()] += 1;
        }
      }
      if (p.checkedInAt && p.attendanceStatus === "checked_in") {
        const d = new Date(p.checkedInAt);
        if (!isNaN(d.getTime())) {
          checkinDayCounts[d.getDay()] += 1;
        }
      }
    });

    const maxReg = Math.max(...regDayCounts, 0);
    const maxCheckin = Math.max(...checkinDayCounts, 0);

    const regSeries: AnalyticsBar[] = DAYS_OF_WEEK.map((day, idx) => {
      const count = regDayCounts[idx];
      return {
        day,
        count,
        heightPercent: maxReg > 0 ? Math.max(10, Math.round((count / maxReg) * 100)) : 10,
        isPeak: count === maxReg && count > 0,
      };
    });

    const chkSeries: AnalyticsBar[] = DAYS_OF_WEEK.map((day, idx) => {
      const count = checkinDayCounts[idx];
      return {
        day,
        count,
        heightPercent: maxCheckin > 0 ? Math.max(10, Math.round((count / maxCheckin) * 100)) : 10,
        isPeak: count === maxCheckin && count > 0,
      };
    });

    return { registrationSeries: regSeries, checkinSeries: chkSeries };
  }, [participants, isPreview]);

  const activeSeries =
    activeTab === "registrations" ? registrationSeries : checkinSeries;
  const totalInSeries = activeSeries.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#17191C] dark:text-white">
              Registration &amp; Check-in Trajectory
            </h3>
            <span className="rounded-full bg-[#F0F1F2] dark:bg-white/10 border border-[#E5E7EA] dark:border-white/15 px-2 py-0.5 text-[10px] font-medium text-[#5E646E] dark:text-white/80">
              {isPreview ? "Preview Data" : "Live Trajectory"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#5E646E] dark:text-white/70">
            {totalInSeries.toLocaleString()} total{" "}
            {activeTab === "registrations" ? "registrations" : "check-ins"}{" "}
            across 7 days
          </p>
        </div>

        {/* Compact Tab Switcher */}
        <div className="flex items-center rounded-full bg-[#F4F5F6] dark:bg-[#181B1F] p-0.5 border border-[#E5E7EA] dark:border-[#363C46] self-start sm:self-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab("registrations")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] ${
              activeTab === "registrations"
                ? "bg-[#25292F] dark:bg-white text-white dark:text-[#111315] shadow-sm"
                : "text-[#656B73] dark:text-white/70 hover:text-[#17191C] dark:hover:text-white"
            }`}
          >
            <Users className="h-3 w-3" />
            <span>Registrations</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checkins")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] ${
              activeTab === "checkins"
                ? "bg-[#25292F] dark:bg-white text-white dark:text-[#111315] shadow-sm"
                : "text-[#656B73] dark:text-white/70 hover:text-[#17191C] dark:hover:text-white"
            }`}
          >
            <QrCode className="h-3 w-3" />
            <span>Check-ins</span>
          </button>
        </div>
      </div>

      {/* Proportional Monochrome Pill Bar Chart */}
      <div className="mt-5">
        <div className="relative flex h-32 items-end justify-between gap-2 border-b border-[#E5E7EA] dark:border-[#363C46] pb-2 px-2 sm:px-4">
          {activeSeries.map((bar, idx) => (
            <div
              key={`${activeTab}-${bar.day}`}
              tabIndex={0}
              role="graphics-symbol"
              aria-label={`${bar.day}: ${bar.count} ${
                activeTab === "registrations" ? "registrations" : "check-ins"
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx(null)}
              className="group relative flex flex-1 flex-col items-center justify-end h-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] rounded-t-xl"
            >
              {/* Tooltip on hover/focus */}
              {hoveredIdx === idx && (
                <div className="absolute -top-8 z-20 whitespace-nowrap rounded-full bg-[#17191C] dark:bg-[#E8EAED] px-2.5 py-0.5 text-[10px] font-semibold text-white dark:text-[#111315] shadow-sm pointer-events-none select-none">
                  {bar.count}{" "}
                  {activeTab === "registrations" ? "registered" : "checked in"}
                </div>
              )}

              {/* Pill Shaped Bar */}
              <div
                style={{ height: `${bar.heightPercent}%` }}
                className={`w-full max-w-[28px] rounded-full transition-all duration-300 cursor-pointer ${
                  bar.isPeak
                    ? "bg-[#25292F] dark:bg-[#E8EAED]"
                    : "bg-[#989EA7]/70 dark:bg-[#7D858F]/50 hover:bg-[#25292F]/80 dark:hover:bg-[#E8EAED]/80"
                } ${
                  hoveredIdx === idx
                    ? "opacity-100 ring-2 ring-black/10 dark:ring-white/20"
                    : ""
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
                  hoveredIdx === idx
                    ? "text-[#17191C] dark:text-[#F1F2F3] font-semibold"
                    : "text-[#8A9098] dark:text-[#7D858F]"
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
