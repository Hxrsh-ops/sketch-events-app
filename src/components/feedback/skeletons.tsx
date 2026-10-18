import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[#E5E7EA] dark:bg-[#25292E] transition-colors",
        className
      )}
      {...props}
    />
  );
}

/**
 * Layout-matched skeleton for KPI metric cards
 */
export function KpiCardSkeleton() {
  return (
    <div className="rounded-3xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="flex items-baseline gap-2 pt-1">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-4 w-12 rounded-md" />
      </div>
      <Skeleton className="h-3 w-36 rounded-md" />
    </div>
  );
}

/**
 * Layout-matched skeleton for Event directory cards
 */
export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] shadow-sm space-y-4 pb-5">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="px-5 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-md" />
        <div className="pt-2 flex justify-between items-center border-t border-[#E5E7EA]/60 dark:border-[#30353A]/60">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Layout-matched skeleton for data tables (Participants, Attendance, Audit)
 */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-4 shadow-sm space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EA] dark:border-[#30353A]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24 rounded-md" />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center justify-between py-2.5 border-b border-[#F0F1F2] dark:border-[#22262B] last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 w-20 rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}
