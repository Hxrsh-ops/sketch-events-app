"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Users,
  ArrowUpRight,
  Filter,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { getStoredEvents } from "@/lib/registration-store";
import { formatDate } from "@/lib/utils";
import { EventItem } from "@/types";

interface EventsDirectoryClientProps {
  initialEvents: EventItem[];
  initialError?: string | null;
  isPreview: boolean;
}

const CATEGORIES = [
  "all",
  "Design",
  "Workshop",
  "Hackathon",
  "Conference",
  "Exhibition",
  "Social",
] as const;

export default function EventsDirectoryClient({
  initialEvents,
  initialError = null,
  isPreview,
}: EventsDirectoryClientProps) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(initialError);

  // In Preview Mode, sync with local store updates
  useEffect(() => {
    if (isPreview) {
      const handleStoreUpdate = () => {
        setEvents(getStoredEvents());
      };
      window.addEventListener("sketch_store_updated", handleStoreUpdate);
      return () => window.removeEventListener("sketch_store_updated", handleStoreUpdate);
    }
  }, [isPreview]);

  // Dynamic counts for lifecycle tabs based on active category & search
  const filterTabs = useMemo(() => {
    const baseList = events.filter((e) => {
      const matchCat =
        selectedCategory === "all" ||
        e.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    return [
      { id: "all", label: "All Events", count: baseList.length },
      {
        id: "published",
        label: "Published",
        count: baseList.filter((e) => e.lifecycle === "published" || e.lifecycle === "live").length,
      },
      {
        id: "completed",
        label: "Completed",
        count: baseList.filter((e) => e.lifecycle === "completed").length,
      },
      {
        id: "draft",
        label: "Drafts",
        count: baseList.filter((e) => e.lifecycle === "draft").length,
      },
    ];
  }, [events, selectedCategory, searchQuery]);

  // Filtered event cards displayed in the grid
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "published" && (evt.lifecycle === "published" || evt.lifecycle === "live")) ||
        evt.lifecycle.toLowerCase() === activeTab.toLowerCase();

      const matchesCategory =
        selectedCategory === "all" ||
        evt.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSearch =
        !searchQuery.trim() ||
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesCategory && matchesSearch;
    });
  }, [events, activeTab, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto text-[#17191C] dark:text-[#F1F2F3]">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Event Directory
            </h1>
            {isPreview ? (
              <Badge variant="outline" className="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40">
                Preview Mode
              </Badge>
            ) : (
              <Badge className="text-[10px] uppercase font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Connected
              </Badge>
            )}
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

      {/* Production Database Error Banner (Never silently hides) */}
      {error && (
        <div
          role="alert"
          className="rounded-[20px] border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-5 shadow-sm text-rose-900 dark:text-rose-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs space-y-1">
              <h3 className="font-bold text-sm">Database Connection Error</h3>
              <p className="text-rose-800 dark:text-rose-300">
                Unable to load events from the persistent database: <code className="bg-rose-100 dark:bg-rose-900/60 px-1 py-0.5 rounded font-mono">{error}</code>
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 pt-1">
                Notice: Mock events are strictly not substituted in production to preserve data integrity.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="rounded-full text-xs font-semibold gap-1.5 border-rose-300 dark:border-rose-800"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs, Category Selector & Search Bar */}
      <div className="flex flex-col gap-3 rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Lifecycle Tabs */}
          <AnimatedTabs
            tabs={filterTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            layoutId="eventsFilterPill"
          />

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098] dark:text-[#7D858F]" />
            <input
              type="text"
              placeholder="Search events, venues, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-full border border-[#E5E7EA] dark:border-[#363C46] bg-[#F4F5F6] dark:bg-[#181B1F] pl-9 pr-4 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] dark:placeholder:text-[#7D858F] transition-all focus:bg-white dark:focus:bg-[#20252C] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED] focus:border-[#25292F] dark:focus:border-[#E8EAED]"
            />
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#F4F5F6] dark:border-white/10 text-xs">
          <span className="text-[#8A9098] dark:text-white/60 text-[11px] font-semibold pr-1 shrink-0">Category:</span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all shrink-0 ${
                  isSelected
                    ? "bg-[#25292F] dark:bg-white text-white dark:text-[#17191C]"
                    : "bg-[#F4F5F6] dark:bg-[#181B1F] border border-transparent dark:border-[#363C46] text-[#5E646E] dark:text-white/70 hover:text-[#17191C] dark:hover:text-white"
                }`}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            );
          })}
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
              Try adjusting your search query, clearing category selection, or switching the active lifecycle filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveTab("all");
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="mt-4 rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold"
            >
              Reset Filters
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab + selectedCategory + (searchQuery ? `_q_${searchQuery}` : "")}
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
                  className="group flex flex-col justify-between overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 ease-out hover:border-[#CBD0D6] dark:hover:border-[#48515E] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] motion-reduce:transition-none motion-reduce:transform-none"
                >
                  {/* Poster / Artwork Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-[#EAECEF] dark:bg-[#2A2F35]">
                    <img
                      src={event.directoryImage || event.posterUrl || event.heroImage || "/sketch-logo.png"}
                      alt={event.title}
                      style={{ objectPosition: event.directoryImageFocalPoint || event.focalPoint || "center center" }}
                      className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transform-none"
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
                    <p className="text-xs text-[#5E646E] dark:text-white/75 line-clamp-2 leading-relaxed">
                      {event.shortDescription || event.description}
                    </p>

                    {/* Meta info */}
                    <div className="mt-4 space-y-2 border-t border-[#F4F5F6] dark:border-white/10 pt-3 text-xs text-[#5E646E] dark:text-white/70">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-[#8A9098] dark:text-white/60" />
                        <span>{formatDate(event.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#8A9098] dark:text-white/60" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#5E646E] dark:text-white/70 flex items-center gap-1">
                          <Users className="h-3 w-3 text-[#8A9098] dark:text-white/60" />
                          <strong className="text-[#17191C] dark:text-white font-semibold font-mono tabular-nums">{event.registeredCount}</strong> / <span className="font-mono tabular-nums">{event.capacity}</span>
                        </span>
                        <span className="text-[#8A9098] dark:text-white/60 font-medium font-mono tabular-nums">{percentFilled}% Filled</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EAECEF] dark:bg-white/10">
                        <div
                          style={{ width: `${percentFilled}%` }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            percentFilled >= 90
                              ? "bg-[#25292F] dark:bg-white"
                              : "bg-[#71767F] dark:bg-white/80"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between border-t border-[#F4F5F6] dark:border-white/10 bg-[#F9FAFB] dark:bg-[#181B1F] px-4 py-2.5">
                    {event.lifecycle === "published" || event.lifecycle === "live" ? (
                      <Link
                        href={`/e/${event.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#17191C] dark:text-white hover:underline"
                      >
                        <span>Public Page</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-[11px] font-medium text-[#8A9098] dark:text-white/60 italic">
                        Draft (Unpublished)
                      </span>
                    )}

                    <Link href={`/events/${event.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full border-[#E5E7EA] dark:border-[#363C46] px-3 text-xs font-semibold text-[#17191C] dark:text-white hover:bg-white dark:hover:bg-white/10 dark:hover:border-[#48515E]"
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
