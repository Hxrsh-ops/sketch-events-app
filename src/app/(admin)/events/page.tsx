"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Calendar, MapPin, Users, ArrowUpRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { getStoredEvents } from "@/lib/registration-store";
import { formatDate } from "@/lib/utils";
import { EventItem } from "@/types";

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>(() => getStoredEvents());
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleUpdate = () => setEvents(getStoredEvents());
    window.addEventListener("sketch_store_updated", handleUpdate);
    return () => window.removeEventListener("sketch_store_updated", handleUpdate);
  }, []);

  const filterTabs = [
    { id: "all", label: "All Events", count: events.length },
    { id: "published", label: "Published", count: events.filter((e) => e.lifecycle === "published").length },
    { id: "completed", label: "Completed", count: events.filter((e) => e.lifecycle === "completed").length },
    { id: "draft", label: "Drafts", count: events.filter((e) => e.lifecycle === "draft").length },
  ];

  const filteredEvents = events.filter((evt) => {
    const matchesTab =
      activeTab === "all" ||
      evt.lifecycle.toLowerCase() === activeTab.toLowerCase();
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.venue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto text-[#17191C] dark:text-[#F1F2F3]">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Event Directory
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              Preview Mode
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#A6ADB5]">
            Create, configure, and monitor every SKETCH experience through its complete lifecycle.
          </p>
        </div>

        <Link href="/events/new">
          <Button variant="charcoal" className="rounded-full gap-2 font-semibold shadow-sm text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-5">
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </Button>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 shadow-sm">
        <AnimatedTabs
          tabs={filterTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          layoutId="eventsFilterPill"
        />

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098] dark:text-[#7D858F]" />
          <input
            type="text"
            placeholder="Search events, venues, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#151719] pl-9 pr-4 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] dark:placeholder:text-[#7D858F] transition-all focus:bg-white dark:focus:bg-[#1B1E21] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED] focus:border-[#25292F] dark:focus:border-[#E8EAED]"
          />
        </div>
      </div>

      {/* Events Grid with Stable, Flicker-Free Transition */}
      <AnimatePresence mode="wait" initial={false}>
        {filteredEvents.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-12 text-center shadow-sm"
          >
            <Filter className="mx-auto h-8 w-8 text-[#8A9098] dark:text-[#7D858F] mb-3 opacity-40" />
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">No events match your filter</h3>
            <p className="mt-1 text-xs text-[#656B73] dark:text-[#A6ADB5]">
              Try adjusting your search query or switching the active lifecycle filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveTab("all");
                setSearchQuery("");
              }}
              className="mt-4 rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold"
            >
              Reset Filters
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab + (searchQuery ? `_q_${searchQuery}` : "")}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredEvents.map((event) => {
              const percentFilled = Math.min(
                100,
                Math.round((event.registeredCount / event.capacity) * 100)
              );

              return (
                <div
                  key={event.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-sm transition-all hover:shadow-card dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
                >
                  {/* Poster / Artwork Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-[#EAECEF] dark:bg-[#2A2F35]">
                    <img
                      src={event.directoryImage || event.posterUrl}
                      alt={event.title}
                      style={{ objectPosition: event.directoryImageFocalPoint || event.focalPoint || "center center" }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="rounded-full bg-white/90 dark:bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-[#17191C] backdrop-blur-md shadow-xs">
                        {event.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/20">
                        {event.lifecycle}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-base font-bold text-white drop-shadow-sm line-clamp-1">
                        {event.title}
                      </h3>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] line-clamp-2 leading-relaxed">
                      {event.shortDescription}
                    </p>

                    {/* Meta info */}
                    <div className="mt-4 space-y-2 border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3 text-xs text-[#656B73] dark:text-[#A6ADB5]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-[#8A9098] dark:text-[#7D858F]" />
                        <span>{formatDate(event.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#8A9098] dark:text-[#7D858F]" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#656B73] dark:text-[#A6ADB5] flex items-center gap-1">
                          <Users className="h-3 w-3 text-[#8A9098] dark:text-[#7D858F]" />
                          <strong className="text-[#17191C] dark:text-[#F1F2F3] font-semibold font-mono tabular-nums">{event.registeredCount}</strong> / <span className="font-mono tabular-nums">{event.capacity}</span>
                        </span>
                        <span className="text-[#8A9098] dark:text-[#7D858F] font-medium font-mono tabular-nums">{percentFilled}% Filled</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1F2] dark:bg-[#2A2F35]">
                        <div
                          style={{ width: `${percentFilled}%` }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            percentFilled >= 90
                              ? "bg-[#25292F] dark:bg-[#E8EAED]"
                              : "bg-[#989EA7] dark:bg-[#7D858F]"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between border-t border-[#F4F5F6] dark:border-[#262A2E] bg-[#F9FAFB] dark:bg-[#151719] px-4 py-2.5">
                    <Link
                      href={`/e/${event.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] hover:underline"
                    >
                      <span>Public Page</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>

                    <Link href={`/events/${event.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full border-[#E5E7EA] dark:border-[#30353A] px-3 text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] hover:bg-white dark:hover:bg-[#25292F]"
                      >
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
