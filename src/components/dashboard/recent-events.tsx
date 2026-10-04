import Link from "next/link";
import { Plus, ArrowUpRight, Palette, Code, PenTool, Layers, Compass } from "lucide-react";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  Design: { icon: Palette, color: "text-rose-600", bg: "bg-rose-50" },
  Hackathon: { icon: Code, color: "text-blue-600", bg: "bg-blue-50" },
  Workshop: { icon: PenTool, color: "text-amber-600", bg: "bg-amber-50" },
  Exhibition: { icon: Layers, color: "text-emerald-600", bg: "bg-emerald-50" },
  Conference: { icon: Compass, color: "text-purple-600", bg: "bg-purple-50" },
};

export function RecentEvents() {
  return (
    <div className="flex flex-col justify-between rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-base font-bold text-[#191A1C]">Events</h3>
        <Link
          href="/events"
          className="inline-flex items-center gap-1 rounded-full border border-[#E8E6E1] bg-white px-2.5 py-1 text-xs font-semibold text-[#191A1C] transition-colors hover:bg-[#F9F8F6]"
        >
          <Plus className="h-3 w-3" />
          <span>New</span>
        </Link>
      </div>

      {/* Events List (Donezo styled) */}
      <div className="mt-3 flex flex-col divide-y divide-[#F5F4F1]">
        {MOCK_EVENTS.slice(0, 5).map((event) => {
          const catConfig = CATEGORY_ICONS[event.category] || CATEGORY_ICONS.Design;
          const Icon = catConfig.icon;

          return (
            <Link
              key={event.id}
              href={`/events`}
              className="group flex items-center justify-between py-3 transition-colors hover:bg-[#FAF9F7] px-2 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${catConfig.bg}`}
                >
                  <Icon className={`h-4 w-4 ${catConfig.color}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#191A1C] group-hover:text-[#8F2635] transition-colors line-clamp-1">
                    {event.title}
                  </span>
                  <span className="text-[11px] text-[#929398]">
                    Date: {formatDate(event.startDate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFEEEA] text-[#65666A]">
                  {event.registeredCount}/{event.capacity}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#929398] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
