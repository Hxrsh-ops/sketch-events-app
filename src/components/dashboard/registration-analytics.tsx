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
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#E5E7E9] bg-white p-5 shadow-xs">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#34383D]">
              Registration Trends
            </h3>
            <span className="rounded-md bg-[#F6F7F8] border border-[#E5E7E9] px-2 py-0.5 text-[10px] font-medium text-[#858B93]">
              {isPreview ? "Preview Data" : "Live Trajectory"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#858B93]">
            {totalInSeries.toLocaleString()} total{" "}
            {activeTab === "registrations" ? "registrations" : "check-ins"}{" "}
            across 7 days
          </p>
        </div>

        {/* Compact Tab Switcher */}
        <div className="flex items-center rounded-lg bg-[#F6F7F8] p-0.5 border border-[#E5E7E9] self-start sm:self-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab("registrations")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#858B93] ${
              activeTab === "registrations"
                ? "bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] shadow-xs"
                : "text-[#858B93] hover:text-[#34383D]"
            }`}
          >
            <Users className="h-3 w-3" />
            <span>Registrations</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checkins")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#858B93] ${
              activeTab === "checkins"
                ? "bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] shadow-xs"
                : "text-[#858B93] hover:text-[#34383D]"
            }`}
          >
            <QrCode className="h-3 w-3" />
            <span>Check-ins</span>
          </button>
        </div>
      </div>

      {/* Proportional Monochrome Pill Bar Chart */}
      <div className="mt-5">
        <div className="relative flex h-32 items-end justify-between gap-2 border-b border-[#E5E7E9] pb-2 px-2 sm:px-4">
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
              className="group relative flex flex-1 flex-col items-center justify-end h-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#858B93] rounded-t-md"
            >
              {/* Tooltip on hover/focus */}
              {hoveredIdx === idx && (
                <div className="absolute -top-8 z-20 whitespace-nowrap rounded-md bg-[#34383D] px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-xs pointer-events-none select-none">
                  {bar.count}{" "}
                  {activeTab === "registrations" ? "registered" : "checked in"}
                </div>
              )}

              {/* Pill Shaped Bar */}
              <div
                style={{ height: `${bar.heightPercent}%` }}
                className={`w-full max-w-[24px] rounded-t-md transition-all duration-200 cursor-pointer ${
                  bar.isPeak
                    ? "bg-[#34383D]"
                    : "bg-[#E5E7E9] hover:bg-[#858B93]"
                } ${
                  hoveredIdx === idx
                    ? "ring-2 ring-[#34383D]/20"
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
                    ? "text-[#34383D] font-semibold"
                    : "text-[#858B93]"
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
