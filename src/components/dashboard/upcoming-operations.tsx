"use client";

import Link from "next/link";
import { Clock, ArrowRight, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventItem } from "@/types";

interface OperationItem {
  id: string;
  event: string;
  action: string;
  dueTime: string;
  priority: "High" | "Medium" | "Low";
  href: string;
  actionLabel?: string;
}

const PREVIEW_OPERATIONS_QUEUE: OperationItem[] = [
  {
    id: "op-1",
    event: "Design Sprint '26",
    action: "Round 1 Submissions & Jury Review",
    dueTime: "Today • 6:00 PM",
    priority: "High",
    href: "/rounds",
    actionLabel: "Execute",
  },
  {
    id: "op-2",
    event: "Prompt to Prototype",
    action: "Desk Gate Setup & Pass Verification",
    dueTime: "Tomorrow • 8:30 AM",
    priority: "High",
    href: "/attendance",
    actionLabel: "Launch Desk",
  },
  {
    id: "op-3",
    event: "Visual Storytelling",
    action: "Batch Certificate Generation (42)",
    dueTime: "Oct 8 • 2:00 PM",
    priority: "Medium",
    href: "/certificates",
    actionLabel: "Issue",
  },
];

interface UpcomingOperationsProps {
  events?: EventItem[];
  isPreview?: boolean;
}

export function UpcomingOperations({
  events,
  isPreview = false,
}: UpcomingOperationsProps) {
  let operations: OperationItem[] = [];

  if (events && events.length > 0) {
    events.slice(0, 3).forEach((ev) => {
      if (ev.lifecycle === "draft") {
        operations.push({
          id: `op-draft-${ev.id}`,
          event: ev.title,
          action: "Review Settings & Publish Event",
          dueTime: "Draft Stage",
          priority: "Medium",
          href: `/events/${ev.id}`,
          actionLabel: "Review",
        });
      } else if (ev.hasRounds) {
        operations.push({
          id: `op-round-${ev.id}`,
          event: ev.title,
          action: "Round Stages & Progression Review",
          dueTime: "Active Competition",
          priority: "High",
          href: `/rounds?eventId=${ev.id}`,
          actionLabel: "Rounds",
        });
      } else if (ev.lifecycle === "published" || ev.lifecycle === "live") {
        operations.push({
          id: `op-desk-${ev.id}`,
          event: ev.title,
          action: "Desk Gate Setup & Pass Verification",
          dueTime: "Terminal Open",
          priority: "High",
          href: `/attendance?eventId=${ev.id}`,
          actionLabel: "Launch Desk",
        });
      } else if (ev.lifecycle === "completed" && ev.checkedInCount > 0) {
        operations.push({
          id: `op-cert-${ev.id}`,
          event: ev.title,
          action: `Batch Certificate Generation (${ev.checkedInCount} checked-in)`,
          dueTime: "Ready for Issuance",
          priority: "Medium",
          href: `/certificates?eventId=${ev.id}`,
          actionLabel: "Issue",
        });
      }
    });
  }

  if (operations.length === 0 && isPreview) {
    operations = PREVIEW_OPERATIONS_QUEUE;
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-[#25292F] dark:text-white/90" />
            <h3 className="text-sm font-bold text-[#17191C] dark:text-white">
              Operations Dispatch
            </h3>
          </div>
          <span className="rounded-full bg-[#F0F1F2] dark:bg-white/10 border border-[#E5E7EA] dark:border-white/15 px-2 py-0.5 text-[10px] font-medium text-[#5E646E] dark:text-white/80">
            {operations.length} {operations.length === 1 ? "Pending" : "Pending"}
          </span>
        </div>

        {/* Dispatch Items List */}
        {operations.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#E5E7EA] dark:border-[#363C46] p-6 text-center text-xs text-[#8A9098] dark:text-white/50">
            All operational queues clear. No immediate dispatches required.
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {operations.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#F0F1F2] dark:border-[#363C46] bg-[#F8F9FA] dark:bg-[#181B1F] p-3 transition-colors hover:border-[#CBD0D6] dark:hover:border-[#48515E] hover:bg-white dark:hover:bg-[#20252C]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E646E] dark:text-white/70">
                    {item.event}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      item.priority === "High"
                        ? "bg-[#EA4F3C]/10 text-[#EA4F3C]"
                        : "bg-[#F0F1F2] dark:bg-white/10 border border-[#E5E7EA] dark:border-white/15 text-[#5E646E] dark:text-white/80"
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>

                <p className="mt-1 text-xs font-semibold text-[#17191C] dark:text-white">
                  {item.action}
                </p>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[#828892] dark:text-white/60">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.dueTime}
                  </span>
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 font-semibold text-[#17191C] dark:text-white hover:underline"
                  >
                    <span>{item.actionLabel || "Execute"}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-[#F0F1F2] dark:border-[#262A2E] pt-3">
        <Link href="/attendance">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-8 text-xs font-semibold text-[#656B73] dark:text-[#A6ADB5] hover:text-[#17191C] dark:hover:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] rounded-xl px-2"
          >
            <span>View All Operational Queues</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
