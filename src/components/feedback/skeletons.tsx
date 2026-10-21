import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-md bg-[#E2E5E9] dark:bg-[#1E2228] transition-colors",
        className
      )}
      {...props}
    />
  );
}

/**
 * Layout-matched skeleton for KPI metric cards
 */
export function KpiCardSkeleton({ isFeatured = false }: { isFeatured?: boolean } = {}) {
  return (
    <div
      className={cn(
        "rounded-[20px] p-5 space-y-3 transition-all",
        isFeatured
          ? "sketch-card-hero text-white"
          : "border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]"
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className={cn("h-4 w-28 rounded-lg", isFeatured && "bg-white/10 dark:bg-white/10")} />
        <Skeleton className={cn("h-8 w-8 rounded-full", isFeatured && "bg-white/10 dark:bg-white/10")} />
      </div>
      <div className="flex items-baseline gap-2 pt-1">
        <Skeleton className={cn("h-8 w-24 rounded-lg", isFeatured && "bg-white/10 dark:bg-white/10")} />
        <Skeleton className={cn("h-4 w-12 rounded-md", isFeatured && "bg-white/10 dark:bg-white/10")} />
      </div>
      <Skeleton className={cn("h-3 w-36 rounded-md", isFeatured && "bg-white/10 dark:bg-white/10")} />
    </div>
  );
}

/**
 * Layout-matched skeleton for Event directory cards
 */
export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4 pb-5">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="px-5 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-md" />
        <div className="pt-2 flex justify-between items-center border-t border-[#E5E7EA]/60 dark:border-[#363C46]/60">
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
    <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EA] dark:border-[#363C46]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24 rounded-md" />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center justify-between py-2.5 border-b border-[#F0F1F2] dark:border-[#2C3136] last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 w-20 rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}
