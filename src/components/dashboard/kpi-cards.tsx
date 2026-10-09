import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  isFeatured?: boolean;
}

export function KpiCard({
  title,
  value,
  subtext,
  isFeatured = false,
}: KpiCardProps) {
  if (isFeatured) {
    return (
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#454B54] via-[#2F343B] to-[#212429] p-6 text-white shadow-card transition-transform hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/80">
            {title}
          </span>
        </div>

        <div className="mt-3 flex items-baseline">
          <span className="text-4xl font-extrabold tracking-tight text-white">
            {value}
          </span>
        </div>

        {subtext && (
          <div className="mt-4">
            <span className="text-[11px] font-normal text-white/70">
              {subtext}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#656B73]">{title}</span>
      </div>

      <div className="mt-3 flex items-baseline">
        <span className="text-4xl font-extrabold tracking-tight text-[#17191C]">
          {value}
        </span>
      </div>

      {subtext && (
        <div className="mt-4">
          <span className="text-[11px] font-normal text-[#8A9098]">
            {subtext}
          </span>
        </div>
      )}
    </div>
  );
}

export function DashboardKpiRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Events"
        value={24}
        subtext="5% increased from last month"
        isFeatured={true}
      />
      <KpiCard
        title="Completed Events"
        value={12}
      />
      <KpiCard
        title="Events In Progress"
        value={12}
      />
      <KpiCard
        title="Draft / Delayed"
        value={2}
      />
    </div>
  );
}
