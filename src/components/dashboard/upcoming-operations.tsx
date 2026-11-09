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
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#E5E7E9] bg-white p-5 shadow-xs">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-[#777E86]" />
            <h3 className="text-sm font-semibold text-[#34383D]">
              Operations Dispatch
            </h3>
          </div>
          <span className="rounded-md bg-[#F6F7F8] border border-[#E5E7E9] px-2 py-0.5 text-[10px] font-medium text-[#858B93]">
            {operations.length} Pending
          </span>
        </div>

        {/* Dispatch Items List */}
        {operations.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[#E5E7E9] p-6 text-center text-xs text-[#858B93]">
            All operational queues clear. No immediate dispatches required.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {operations.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[#E5E7E9] bg-[#F6F7F8] p-3 transition-colors hover:bg-[#EAECEF]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#858B93]">
                    {item.event}
                  </span>
                  <span className="rounded-md border border-[#E5E7E9] bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#34383D]">
                    {item.priority}
                  </span>
                </div>

                <p className="mt-1 text-xs font-semibold text-[#34383D]">
                  {item.action}
                </p>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[#858B93]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-[#777E86]" />
                    {item.dueTime}
                  </span>
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 font-medium text-[#34383D] hover:underline"
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

      <div className="mt-4 border-t border-[#E5E7E9] pt-3">
        <Link href="/attendance">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-8 text-xs font-medium text-[#858B93] hover:text-[#34383D] hover:bg-[#F6F7F8] rounded-lg px-2"
          >
            <span>View All Operational Queues</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#777E86]" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
