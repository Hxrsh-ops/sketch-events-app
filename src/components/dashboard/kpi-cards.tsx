import { ArrowUpRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtext: string;
  trendText?: string;
  isFeatured?: boolean;
}

export function KpiCard({
  title,
  value,
  subtext,
  trendText,
  isFeatured = false,
}: KpiCardProps) {
  if (isFeatured) {
    return (
      <div className="relative overflow-hidden rounded-[22px] bg-[#1B4332] p-6 text-white shadow-lg transition-transform hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wide text-emerald-100">
            {title}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <ArrowUpRight className="h-4 w-4 text-emerald-200" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tracking-tight text-white">
            {value}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
            <TrendingUp className="h-3 w-3" />
            {trendText || "Active & live"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#65666A]">{title}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F4F1]">
          <ArrowUpRight className="h-4 w-4 text-[#929398]" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tracking-tight text-[#191A1C]">
          {value}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#65666A]">
          {trendText && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              {trendText}
            </span>
          )}
          <span className="text-[#929398]">{subtext}</span>
        </span>
      </div>
    </div>
  );
}

export function DashboardKpiRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Events"
        value={24}
        subtext="in academic term"
        trendText="5 added this month"
        isFeatured={true}
      />
      <KpiCard
        title="Completed Events"
        value={10}
        subtext="all records archived"
        trendText="6"
      />
      <KpiCard
        title="Running Events"
        value={12}
        subtext="registrations open"
        trendText="2"
      />
      <KpiCard
        title="Pending Drafts"
        value={2}
        subtext="require review & publishing"
      />
    </div>
  );
}
