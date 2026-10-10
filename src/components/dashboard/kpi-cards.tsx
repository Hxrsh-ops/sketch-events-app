"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  isFeatured?: boolean;
  progressPercent?: number;
}

export function KpiCard({
  title,
  value,
  subtext,
  badge,
  isFeatured = false,
  progressPercent,
}: KpiCardProps) {
  if (isFeatured) {
    return (
      <div className="relative flex flex-col justify-between overflow-hidden rounded-[20px] bg-gradient-to-br from-[#32373E] via-[#25292F] to-[#1A1C20] dark:from-[#262B30] dark:via-[#1B1E21] dark:to-[#111315] border border-transparent dark:border-[#30353A] p-5 text-white shadow-sm transition-all">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/75">
              {title}
            </span>
            {badge && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/90">
                {badge}
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-white tabular-nums">
              {value}
            </span>
            <span className="text-xs font-normal text-white/60">/ 2,200 cap</span>
          </div>
        </div>

        {/* Capacity fill progress bar */}
        <div className="mt-4 space-y-1">
          {progressPercent !== undefined && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full rounded-full bg-white transition-all duration-500"
              />
            </div>
          )}
          {subtext && (
            <div className="flex items-center justify-between text-[11px] text-white/70">
              <span>{subtext}</span>
              <span className="tabular-nums font-medium">{progressPercent}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm transition-all">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#656B73] dark:text-[#A6ADB5]">
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-[#F0F1F2] dark:bg-[#25292F] px-2 py-0.5 text-[10px] font-medium text-[#25292F] dark:text-[#F1F2F3]">
              {badge}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-baseline">
          <span className="text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3] tabular-nums">
            {value}
          </span>
        </div>
      </div>

      {subtext && (
        <div className="mt-4 border-t border-[#F4F5F6] dark:border-[#262A2E] pt-2.5">
          <span className="text-[11px] text-[#8A9098] dark:text-[#7D858F]">
            {subtext}
          </span>
        </div>
      )}
    </div>
  );
}

export function DashboardKpiRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Registrations"
        value="1,842"
        subtext="Campus capacity fill"
        badge="Live"
        isFeatured
        progressPercent={84}
      />
      <KpiCard
        title="Check-in Conversion"
        value="82.4%"
        subtext="Across 6 active sessions"
        badge="Verified"
      />
      <KpiCard
        title="Active Events"
        value="4"
        subtext="2 published, 2 in-progress"
      />
      <KpiCard
        title="Certificates Issued"
        value="620"
        subtext="99.4% cryptographic valid"
        badge="Ready"
      />
    </div>
  );
}
