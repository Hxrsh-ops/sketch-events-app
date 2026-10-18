import { TableSkeleton } from "@/components/feedback/skeletons";
import { Skeleton } from "@/components/feedback/skeletons";

export default function ParticipantsLoading() {
  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 shadow-sm">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-44 rounded-xl" />
        </div>
        <Skeleton className="h-9 w-full lg:w-72 rounded-full" />
      </div>

      {/* Table Skeleton */}
      <TableSkeleton rows={8} columns={7} />
    </div>
  );
}
