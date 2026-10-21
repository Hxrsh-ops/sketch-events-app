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
  capacity?: number;
}

export function KpiCard({
  title,
  value,
  subtext,
  badge,
  isFeatured = false,
  progressPercent,
  capacity,
}: KpiCardProps) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${title}: ${value}`}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[20px] p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:-translate-y-0.5 motion-reduce:transition-none motion-reduce:transform-none select-none cursor-default focus-visible:outline-none",
        isFeatured
          ? "sketch-card-hero text-white focus-visible:ring-2 focus-visible:ring-[#E8EAED]"
          : "border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:via-[#1F2329] dark:to-[#171A1E] text-[#17191C] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] hover:border-[#CBD0D6] dark:hover:border-[#48515E] focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED]"
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[11px] font-semibold tracking-wider transition-colors duration-200",
              isFeatured
                ? "text-white/80"
                : "text-[#5E646E] dark:text-white/80"
            )}
          >
            {title}
          </span>
          {badge && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm transition-colors duration-200",
                isFeatured
                  ? "bg-white/10 border border-white/15 text-white/90"
                  : "bg-[#F0F1F2] dark:bg-white/10 border border-[#E5E7EA] dark:border-white/15 text-[#25292F] dark:text-white/90"
              )}
            >
              {badge}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-3xl font-bold tracking-tight tabular-nums transition-colors duration-200",
              isFeatured ? "text-white" : "text-[#17191C] dark:text-white"
            )}
          >
            {value}
          </span>
          {capacity !== undefined && (
            <span
              className={cn(
                "text-xs font-normal tabular-nums",
                isFeatured ? "text-white/60" : "text-[#828892] dark:text-white/60"
              )}
            >
              / {capacity > 0 ? `${capacity.toLocaleString()} cap` : "0 cap"}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar & Subtext */}
      {progressPercent !== undefined ? (
        <div
          className={cn(
            "mt-4 space-y-1.5 border-t pt-3",
            isFeatured ? "border-white/10" : "border-[#F4F5F6] dark:border-white/10"
          )}
        >
          <div
            className={cn(
              "h-1.5 w-full overflow-hidden rounded-full",
              isFeatured
                ? "bg-white/10 border border-white/5"
                : "bg-[#EAECEF] dark:bg-white/10 dark:border dark:border-white/5"
            )}
          >
            <div
              style={{ width: `${progressPercent}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isFeatured ? "bg-white" : "bg-[#25292F] dark:bg-white"
              )}
            />
          </div>
          {subtext && (
            <div
              className={cn(
                "flex items-center justify-between text-[11px]",
                isFeatured ? "text-white/65" : "text-[#828892] dark:text-white/65"
              )}
            >
              <span>{subtext}</span>
              <span
                className={cn(
                  "tabular-nums font-semibold",
                  isFeatured ? "text-white" : "text-[#17191C] dark:text-white"
                )}
              >
                {progressPercent}%
              </span>
            </div>
          )}
        </div>
      ) : subtext ? (
        <div
          className={cn(
            "mt-4 border-t pt-2.5 transition-colors duration-200",
            isFeatured ? "border-white/10" : "border-[#F4F5F6] dark:border-white/10"
          )}
        >
          <span
            className={cn(
              "text-[11px] transition-colors duration-200",
              isFeatured ? "text-white/65" : "text-[#828892] dark:text-white/65"
            )}
          >
            {subtext}
          </span>
        </div>
      ) : null}
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

export function DashboardKpiRow({
  metrics,
  isPreview = false,
}: {
  metrics?: DashboardKpiMetrics;
  isPreview?: boolean;
} = {}) {
  const totalReg = metrics?.totalRegistrations ?? (isPreview ? 1842 : 0);
  const totalCap = metrics?.totalCapacity ?? (isPreview ? 2200 : 0);
  const progressPercent = totalCap > 0 ? Math.min(100, Math.round((totalReg / totalCap) * 100)) : 0;
  const conversionRate =
    metrics?.checkInConversion !== undefined
      ? `${metrics.checkInConversion}%`
      : isPreview
      ? "82.4%"
      : "0%";
  const activeEvents = metrics?.activeEventsCount ?? (isPreview ? 4 : 0);
  const certsIssued = metrics?.certificatesIssued ?? (isPreview ? 620 : 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Registrations"
        value={totalReg.toLocaleString()}
        subtext="Campus capacity fill"
        badge={totalReg > 0 ? "Live" : undefined}
        isFeatured
        progressPercent={progressPercent}
        capacity={totalCap}
      />
      <KpiCard
        title="Check-in Conversion"
        value={conversionRate}
        subtext="Across active sessions"
        badge={metrics?.checkInConversion !== undefined && metrics.checkInConversion > 0 ? "Verified" : undefined}
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
        badge={certsIssued > 0 ? "Ready" : undefined}
      />
    </div>
  );
}
