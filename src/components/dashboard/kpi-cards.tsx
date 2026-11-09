"use client";

import { Users, CalendarDays, UserCheck, QrCode, FileBadge } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  isFeatured?: boolean;
  progressPercent?: number;
  capacity?: number;
  icon?: React.ComponentType<{ className?: string }>;
  isConnected?: boolean;
}

export function KpiCard({
  title,
  value,
  subtext,
  badge,
  isFeatured = false,
  progressPercent,
  capacity,
  icon: Icon,
  isConnected = true,
}: KpiCardProps) {
  const displayValue = !isConnected ? "—" : value;
  const displayBadge = !isConnected ? "Not connected" : badge;

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`${title}: ${displayValue}`}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl p-4 transition-all duration-150 motion-reduce:transition-none motion-reduce:transform-none select-none cursor-default focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#858B93]",
        isFeatured
          ? "sketch-card-hero text-white focus-visible:ring-1 focus-visible:ring-[#858B93]"
          : "border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:from-[#282D34] text-[#34383D] shadow-xs hover:-translate-y-0.5 hover:border-[#D9DCE0] dark:hover:border-[#48515E]"
      )}
    >
      <div>
        {/* Top Header: Label & Icon or Status Badge */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 text-[#777E86]" />}
            <span className="text-[10px] font-semibold tracking-wider uppercase text-[#858B93]">
              {title}
            </span>
          </div>
          {displayBadge && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-medium border tabular-nums",
                !isConnected
                  ? "bg-[#F6F7F8] border-[#E5E7E9] text-[#858B93]"
                  : "bg-[#F6F7F8] border-[#E5E7E9] text-[#34383D]"
              )}
            >
              {displayBadge}
            </span>
          )}
        </div>

        {/* Dynamic Statistic */}
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-[#34383D] tabular-nums">
            {displayValue}
          </span>
          {capacity !== undefined && isConnected && (
            <span className="text-[11px] font-normal text-[#858B93] tabular-nums">
              / {capacity.toLocaleString()} cap
            </span>
          )}
        </div>
      </div>

      {/* Progress or Contextual Description */}
      {progressPercent !== undefined && isConnected ? (
        <div className="mt-3 space-y-1 border-t border-[#E5E7E9] pt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-[#EAECEF]">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full rounded-full bg-[#34383D] transition-all duration-300"
            />
          </div>
          {subtext && (
            <div className="flex items-center justify-between text-[10px] text-[#858B93]">
              <span>{subtext}</span>
              <span className="tabular-nums font-medium text-[#34383D]">
                {progressPercent}%
              </span>
            </div>
          )}
        </div>
      ) : subtext ? (
        <div className="mt-3 border-t border-[#E5E7E9] pt-2">
          <span className="text-[10px] text-[#858B93] line-clamp-1">
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
  participantsCount?: number;
  attendanceCount?: number;
  upcomingEventsCount?: number;
  isConnected?: boolean;
}

export function DashboardKpiRow({
  metrics,
  isPreview = false,
}: {
  metrics?: DashboardKpiMetrics;
  isPreview?: boolean;
} = {}) {
  const isConnected = metrics?.isConnected !== false;

  const totalReg = metrics?.totalRegistrations ?? (isPreview ? 1842 : 0);
  const totalCap = metrics?.totalCapacity ?? (isPreview ? 2200 : 0);
  const progressPercent = totalCap > 0 ? Math.min(100, Math.round((totalReg / totalCap) * 100)) : 0;
  const participants = metrics?.participantsCount ?? totalReg;
  const upcomingEvents = metrics?.upcomingEventsCount ?? metrics?.activeEventsCount ?? (isPreview ? 4 : 0);
  const attendance = metrics?.attendanceCount ?? (metrics?.checkInConversion !== undefined ? `${metrics.checkInConversion}%` : isPreview ? "82.4%" : "0%");
  const certsIssued = metrics?.certificatesIssued ?? (isPreview ? 620 : 0);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Participants */}
      <KpiCard
        title="Participants"
        value={participants.toLocaleString()}
        subtext="Enrolled students & guests"
        icon={Users}
        badge={isConnected && participants > 0 ? "Roster" : undefined}
        isConnected={isConnected}
      />

      {/* 2. Upcoming Events */}
      <KpiCard
        title="Upcoming Events"
        value={upcomingEvents.toLocaleString()}
        subtext="Active Events schedule"
        icon={CalendarDays}
        badge={isConnected && upcomingEvents > 0 ? "Published" : undefined}
        isConnected={isConnected}
      />

      {/* 3. Registrations (with compatibility for Total Registrations & isFeatured) */}
      <KpiCard
        title="Registrations"
        value={totalReg.toLocaleString()}
        subtext="Total Registrations capacity"
        icon={UserCheck}
        isFeatured={true}
        progressPercent={isConnected && progressPercent > 0 ? progressPercent : undefined}
        capacity={totalCap}
        isConnected={isConnected}
      />

      {/* 4. Attendance (with compatibility for Check-in Conversion) */}
      <KpiCard
        title="Attendance"
        value={typeof attendance === "number" ? attendance.toLocaleString() : attendance}
        subtext="Check-in Conversion rate"
        icon={QrCode}
        badge={isConnected && (typeof attendance === "number" ? attendance > 0 : attendance !== "0%") ? "Verified" : undefined}
        isConnected={isConnected}
      />

      {/* 5. Certificates (with compatibility for Certificates Issued) */}
      <KpiCard
        title="Certificates"
        value={certsIssued.toLocaleString()}
        subtext="Certificates Issued ledger"
        icon={FileBadge}
        badge={isConnected && certsIssued > 0 ? "Issued" : undefined}
        isConnected={isConnected}
      />
    </div>
  );
}
