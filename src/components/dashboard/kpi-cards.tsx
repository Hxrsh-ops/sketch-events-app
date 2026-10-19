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
      <div
        tabIndex={0}
        role="region"
        aria-label={`${title}: ${value}`}
        className="relative flex flex-col justify-between overflow-hidden rounded-[20px] bg-gradient-to-br from-[#32373E] via-[#25292F] to-[#1A1C20] dark:from-[#262B30] dark:via-[#1B1E21] dark:to-[#111315] border border-transparent dark:border-[#30353A] p-5 text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.18)] focus-visible:shadow-[0_8px_20px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 motion-reduce:transition-none motion-reduce:transform-none select-none cursor-default"
      >
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
    <div
      tabIndex={0}
      role="region"
      aria-label={`${title}: ${value}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm transition-all duration-200 ease-out hover:bg-[#25292F] dark:hover:bg-[#25292F] focus-visible:bg-[#25292F] dark:focus-visible:bg-[#25292F] hover:border-[#3A3F46] dark:hover:border-[#3A3F46] focus-visible:border-[#3A3F46] dark:focus-visible:border-[#3A3F46] hover:-translate-y-0.5 focus-visible:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.14)] focus-visible:shadow-[0_8px_20px_rgba(0,0,0,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] motion-reduce:transition-none motion-reduce:transform-none select-none cursor-default"
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#656B73] dark:text-[#A6ADB5] group-hover:text-white/75 group-focus-visible:text-white/75 transition-colors duration-200">
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-[#F0F1F2] dark:bg-[#25292F] px-2 py-0.5 text-[10px] font-medium text-[#25292F] dark:text-[#F1F2F3] group-hover:bg-white/10 group-hover:text-white/90 group-focus-visible:bg-white/10 group-focus-visible:text-white/90 transition-colors duration-200">
              {badge}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-baseline">
          <span className="text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3] group-hover:text-white group-focus-visible:text-white tabular-nums transition-colors duration-200">
            {value}
          </span>
        </div>
      </div>

      {subtext && (
        <div className="mt-4 border-t border-[#F4F5F6] dark:border-[#262A2E] group-hover:border-white/10 group-focus-visible:border-white/10 pt-2.5 transition-colors duration-200">
          <span className="text-[11px] text-[#8A9098] dark:text-[#7D858F] group-hover:text-white/70 group-focus-visible:text-white/70 transition-colors duration-200">
            {subtext}
          </span>
        </div>
      )}
    </div>
  );
}

export interface DashboardKpiMetrics {
  totalRegistrations?: number;
  totalCapacity?: number;
  checkInConversion?: number;
  activeEventsCount?: number;
  certificatesIssued?: number;
}

export function DashboardKpiRow({ metrics }: { metrics?: DashboardKpiMetrics } = {}) {
  const totalReg = metrics?.totalRegistrations ?? 1842;
  const totalCap = metrics?.totalCapacity ?? 2200;
  const progressPercent = totalCap > 0 ? Math.min(100, Math.round((totalReg / totalCap) * 100)) : 84;
  const conversionRate = metrics?.checkInConversion !== undefined ? `${metrics.checkInConversion}%` : "82.4%";
  const activeEvents = metrics?.activeEventsCount ?? 4;
  const certsIssued = metrics?.certificatesIssued ?? 620;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Registrations"
        value={totalReg.toLocaleString()}
        subtext="Campus capacity fill"
        badge="Live"
        isFeatured
        progressPercent={progressPercent}
      />
      <KpiCard
        title="Check-in Conversion"
        value={conversionRate}
        subtext="Across active sessions"
        badge="Verified"
      />
      <KpiCard
        title="Active Events"
        value={activeEvents.toLocaleString()}
        subtext="Published & in-progress"
      />
      <KpiCard
        title="Certificates Issued"
        value={certsIssued.toLocaleString()}
        subtext="Cryptographically verified"
        badge="Ready"
      />
    </div>
  );
}
