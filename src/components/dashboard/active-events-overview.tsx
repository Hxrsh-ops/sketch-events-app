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
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#E5E7E9] bg-white p-5 shadow-xs">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#34383D]">
              Active &amp; Upcoming Events
            </h3>
            <p className="mt-0.5 text-xs text-[#858B93]">
              Real-time capacity tracking and event status
            </p>
          </div>

          <Link href="/events">
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-lg border-[#E5E7E9] px-2.5 text-xs font-medium text-[#34383D] bg-white hover:bg-[#F6F7F8]"
            >
              <span>View All</span>
              <ChevronRight className="ml-1 h-3 w-3 text-[#777E86]" />
            </Button>
          </Link>
        </div>

        {/* Events Table / List */}
        {activeEvents.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[#E5E7E9] p-8 text-center text-xs text-[#858B93]">
            No active or upcoming events scheduled. Click &ldquo;Create Event&rdquo; to launch your first event.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#E5E7E9]">
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
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-[#F8F9FA] rounded-lg px-2"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#34383D] truncate">
                        {event.title}
                      </span>
                      <span className="rounded-md bg-[#F6F7F8] border border-[#E5E7E9] px-2 py-0.5 text-[9px] font-medium text-[#858B93] uppercase">
                        {event.category}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[#858B93]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-[#777E86]" />
                        {formatDate(event.startDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-[#777E86]" />
                        {event.venue}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Progress & Actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-28 sm:w-32 flex flex-col gap-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#858B93]">
                          <strong className="text-[#34383D] font-semibold">
                            {registered}
                          </strong>
                          /{capacity}
                        </span>
                        <span className="text-[#858B93] font-medium">
                          {percentFilled}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EAECEF]">
                        <div
                          style={{ width: `${percentFilled}%` }}
                          className="h-full rounded-full bg-[#34383D]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link href={`/events/${event.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-lg border-[#E5E7E9] px-2.5 text-[11px] font-medium text-[#34383D] bg-white hover:bg-[#F6F7F8]"
                        >
                          Manage
                        </Button>
                      </Link>
                      <Link
                        href={`/e/${event.slug}`}
                        target="_blank"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E7E9] text-[#777E86] bg-white hover:bg-[#F6F7F8] hover:text-[#34383D] transition-colors"
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
