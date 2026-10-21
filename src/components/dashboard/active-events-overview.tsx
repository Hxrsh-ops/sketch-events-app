"use client";

import Link from "next/link";
import { ArrowUpRight, Calendar, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { EventItem } from "@/types";
import { formatDate } from "@/lib/utils";

interface ActiveEventsOverviewProps {
  events?: EventItem[];
  isPreview?: boolean;
}

export function ActiveEventsOverview({
  events,
  isPreview = false,
}: ActiveEventsOverviewProps) {
  const sourceEvents =
    events !== undefined ? events : isPreview ? MOCK_EVENTS : [];

  const activeEvents = sourceEvents
    .filter(
      (e) =>
        e.lifecycle === "published" ||
        e.lifecycle === "draft" ||
        e.lifecycle === "live"
    )
    .slice(0, 4);

  return (
    <div className="flex h-full flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#17191C] dark:text-white">
              Active & Upcoming Events
            </h3>
            <p className="mt-0.5 text-xs text-[#5E646E] dark:text-white/70">
              Real-time capacity tracking and event status
            </p>
          </div>

          <Link href="/events">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-[#E5E7EA] dark:border-[#363C46] px-3 text-xs font-medium text-[#17191C] dark:text-white/90 hover:bg-[#F4F5F6] dark:hover:bg-white/10 dark:hover:border-[#48515E]"
            >
              <span>View All</span>
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Events Table / List */}
        {activeEvents.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#E5E7EA] dark:border-[#363C46] p-8 text-center text-xs text-[#8A9098] dark:text-white/50">
            No active or upcoming events scheduled. Click &ldquo;Create Event&rdquo; to launch your first event.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#F4F5F6] dark:divide-white/10">
            {activeEvents.map((event) => {
              const capacity = event.capacity || 1;
              const registered = event.registeredCount || 0;
              const percentFilled = Math.min(
                100,
                Math.round((registered / capacity) * 100)
              );

              return (
                <div
                  key={event.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-[#F8F9FA] dark:hover:bg-white/[0.04] rounded-xl px-2"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#17191C] dark:text-white truncate">
                        {event.title}
                      </span>
                      <span className="rounded-full bg-[#F0F1F2] dark:bg-white/10 border border-[#E5E7EA] dark:border-white/15 px-2 py-0.2 text-[9px] font-semibold text-[#5E646E] dark:text-white/80 uppercase">
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
                          <strong className="text-[#17191C] dark:text-[#F1F2F3] font-semibold">
                            {registered}
                          </strong>
                          /{capacity}
                        </span>
                        <span className="text-[#8A9098] dark:text-[#7D858F] font-medium">
                          {percentFilled}%
                        </span>
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
        )}
      </div>
    </div>
  );
}
