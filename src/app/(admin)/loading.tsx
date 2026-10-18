import { KpiCardSkeleton, EventCardSkeleton } from "@/components/feedback/skeletons";
import { Skeleton } from "@/components/feedback/skeletons";

export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col space-y-6 pb-8 max-w-[1400px] mx-auto">
      {/* Title Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>

      {/* Row 2: Analytics & Operations Content */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-3xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <div className="rounded-3xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-6 space-y-4">
            <Skeleton className="h-5 w-48 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EventCardSkeleton />
              <EventCardSkeleton />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-3xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-6 space-y-4">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
          <div className="rounded-3xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-6 space-y-4">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
