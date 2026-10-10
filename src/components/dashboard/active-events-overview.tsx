"use client";

import Link from "next/link";
import { ArrowUpRight, Calendar, MapPin, Users, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export function ActiveEventsOverview() {
  const activeEvents = MOCK_EVENTS.filter(
    (e) => e.lifecycle === "published" || e.lifecycle === "draft"
  ).slice(0, 4);

  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Active & Upcoming Events
            </h3>
            <p className="mt-0.5 text-xs text-[#656B73] dark:text-[#A6ADB5]">
              Real-time capacity tracking and event status
            </p>
          </div>

          <Link href="/events">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-[#E5E7EA] dark:border-[#30353A] px-3 text-xs font-medium text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F]"
            >
              <span>View All</span>
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Events Table / List */}
        <div className="mt-4 divide-y divide-[#F4F5F6] dark:divide-[#262A2E]">
          {activeEvents.map((event) => {
            const percentFilled = Math.min(
              100,
              Math.round((event.registeredCount / event.capacity) * 100)
            );

            return (
              <div
                key={event.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#22262A] rounded-xl px-2"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3] truncate">
                      {event.title}
                    </span>
                    <span className="rounded-full bg-[#F0F1F2] dark:bg-[#25292F] px-2 py-0.2 text-[9px] font-semibold text-[#656B73] dark:text-[#A6ADB5] uppercase">
                      {event.category}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[#8A9098] dark:text-[#7D858F]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.startDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.venue}
                    </span>
                  </div>
                </div>

                {/* Capacity Progress & Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-28 sm:w-32 flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#656B73] dark:text-[#A6ADB5]">
                        <strong className="text-[#17191C] dark:text-[#F1F2F3] font-semibold">{event.registeredCount}</strong>/{event.capacity}
                      </span>
                      <span className="text-[#8A9098] dark:text-[#7D858F] font-medium">{percentFilled}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1F2] dark:bg-[#2A2F35]">
                      <div
                        style={{ width: `${percentFilled}%` }}
                        className={`h-full rounded-full ${
                          percentFilled >= 90
                            ? "bg-[#25292F] dark:bg-[#E8EAED]"
                            : "bg-[#989EA7] dark:bg-[#7D858F]"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link href={`/events/${event.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full border-[#E5E7EA] dark:border-[#30353A] px-2.5 text-[11px] font-medium text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F]"
                      >
                        Manage
                      </Button>
                    </Link>
                    <Link
                      href={`/e/${event.slug}`}
                      target="_blank"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E5E7EA] dark:border-[#30353A] text-[#656B73] dark:text-[#A6ADB5] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
                      title="Open Public Page"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
