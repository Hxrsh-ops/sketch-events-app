import { Skeleton } from "@/components/feedback/skeletons";

export default function EventDetailLoading() {
  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto min-w-0">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      </div>

      {/* Main Banner Card Skeleton */}
      <div className="overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-sm">
        <Skeleton className="min-h-[220px] sm:min-h-[260px] w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#F4F5F6] dark:divide-[#262A2E] p-4 gap-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Nav Tabs Skeleton */}
      <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3 shadow-sm">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-9 w-40 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      </div>

      {/* Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-5">
          <Skeleton className="h-64 w-full rounded-[20px]" />
          <Skeleton className="h-32 w-full rounded-[20px]" />
        </div>
        <div className="lg:col-span-5 space-y-5">
          <Skeleton className="h-64 w-full rounded-[20px]" />
        </div>
      </div>
    </div>
  );
}
