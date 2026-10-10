"use client";

import Link from "next/link";
import { Clock, ArrowRight, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OperationItem {
  id: string;
  event: string;
  action: string;
  dueTime: string;
  priority: "High" | "Medium" | "Low";
}

const OPERATIONS_QUEUE: OperationItem[] = [
  {
    id: "op-1",
    event: "Design Sprint '26",
    action: "Round 1 Submissions & Jury Review",
    dueTime: "Today • 6:00 PM",
    priority: "High",
  },
  {
    id: "op-2",
    event: "Prompt to Prototype",
    action: "Desk Gate Setup & Pass Verification",
    dueTime: "Tomorrow • 8:30 AM",
    priority: "High",
  },
  {
    id: "op-3",
    event: "Visual Storytelling",
    action: "Batch Certificate Generation (42)",
    dueTime: "Oct 8 • 2:00 PM",
    priority: "Medium",
  },
];

export function UpcomingOperations() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Operations Dispatch
            </h3>
          </div>
          <span className="rounded-full bg-[#F0F1F2] dark:bg-[#25292F] px-2 py-0.5 text-[10px] font-medium text-[#656B73] dark:text-[#A6ADB5]">
            3 Pending
          </span>
        </div>

        {/* Dispatch Items List */}
        <div className="mt-4 space-y-2.5">
          {OPERATIONS_QUEUE.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[#F0F1F2] dark:border-[#262A2E] bg-[#F9FAFB] dark:bg-[#22262A] p-3 transition-colors hover:border-[#E5E7EA] dark:hover:border-[#30353A] hover:bg-white dark:hover:bg-[#2A2F35]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                  {item.event}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                    item.priority === "High"
                      ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                      : "bg-[#F0F1F2] dark:bg-[#25292F] text-[#656B73] dark:text-[#A6ADB5]"
                  }`}
                >
                  {item.priority}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#656B73] dark:text-[#A6ADB5] line-clamp-1">
                {item.action}
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#8A9098] dark:text-[#7D858F]">
                <Clock className="h-3 w-3" />
                <span>{item.dueTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-2">
        <Link href="/attendance">
          <Button
            variant="outline"
            className="w-full h-9 rounded-full text-xs font-medium border-[#E5E7EA] dark:border-[#30353A] text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] gap-1.5"
          >
            <span>Open Attendance Desk</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
