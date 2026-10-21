import { Skeleton, TableSkeleton } from "@/components/feedback/skeletons";

export default function CertificatesLoading() {
  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sketch-card-hero rounded-[20px] p-5">
          <Skeleton className="h-4 w-32 rounded-md bg-white/10 dark:bg-white/10" />
          <Skeleton className="h-8 w-20 rounded-lg bg-white/10 dark:bg-white/10 mt-2" />
          <Skeleton className="h-3 w-48 rounded-md bg-white/10 dark:bg-white/10 mt-2" />
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-lg mt-2" />
          <Skeleton className="h-3 w-36 rounded-md mt-2" />
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-lg mt-2" />
          <Skeleton className="h-3 w-40 rounded-md mt-2" />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-3.5 shadow-sm">
        <Skeleton className="h-9 w-full sm:w-80 rounded-full" />
        <Skeleton className="h-9 w-full sm:w-72 rounded-full" />
      </div>

      {/* Table Skeleton */}
      <TableSkeleton rows={7} columns={6} />
    </div>
  );
}
