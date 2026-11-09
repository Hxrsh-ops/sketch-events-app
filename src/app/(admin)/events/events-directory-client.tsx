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
  Copy,
  Check,
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
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const handleCopyEventLink = async (e: React.MouseEvent, item: EventItem) => {
    e.preventDefault();
    e.stopPropagation();
    const publicUrl = `${window.location.origin}/e/${item.slug || item.id}`;

    if (typeof navigator !== "undefined" && navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: item.title,
          url: publicUrl,
        });
        setCopiedEventId(item.id);
        setTimeout(() => setCopiedEventId(null), 2500);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedEventId(item.id);
      setTimeout(() => setCopiedEventId(null), 2500);
    } catch {
      // Fallback
    }
  };

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
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto text-[#17191C]">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-[#858B93] uppercase">
            SKETCHHUB WORKSPACE / EVENTS
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C]">
              Event Directory
            </h1>
            {isPreview ? (
              <Badge variant="outline" className="text-[10px] uppercase font-semibold bg-white border-[#E5E7E9] text-[#777E86]">
                Preview Mode
              </Badge>
            ) : (
              <Badge className="text-[10px] uppercase font-semibold bg-white border-[#E5E7E9] text-[#17191C]">
                Connected
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#858B93]">
            Create, configure, and monitor every SKETCH experience through its complete lifecycle.
          </p>
        </div>

        <Link href="/events/new">
          <Button variant="default" className="rounded-lg gap-2 font-semibold shadow-xs text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-5 bg-[#17191C] text-white hover:bg-[#25292F]">
            <Plus className="h-4 w-4 text-white/80" />
            <span>Create Event</span>
          </Button>
        </Link>
      </div>

      {/* Production Database Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs space-y-1">
              <h3 className="font-semibold text-sm text-rose-900">Database Connection Alert</h3>
              <p className="text-rose-700">
                Unable to load events from the persistent database: <code className="bg-rose-100 px-1 py-0.5 rounded font-mono text-rose-800">{error}</code>
              </p>
              <p className="text-[11px] text-rose-600 pt-1">
                Notice: Mock events are strictly not substituted in production to preserve data integrity.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="rounded-lg text-xs font-semibold gap-1.5 border-rose-200 bg-white hover:bg-rose-50 text-rose-800"
            >
              <RefreshCw className="h-3 w-3 text-rose-700" />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs, Category Selector & Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E5E7E9] bg-white p-3.5 shadow-xs">
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
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777E86]" />
            <input
              type="text"
              placeholder="Search events, venues, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#E5E7E9] bg-[#F6F7F8] pl-9 pr-4 text-xs text-[#17191C] placeholder:text-[#858B93] transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#858B93] focus:border-[#858B93]"
            />
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#E5E7E9] text-xs">
          <span className="text-[#858B93] text-[11px] font-semibold pr-1 shrink-0">Category:</span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all shrink-0 ${
                  isSelected
                    ? "bg-[#17191C] text-white shadow-xs"
                    : "bg-[#F6F7F8] border border-[#E5E7E9] text-[#777E86] hover:text-[#17191C] hover:bg-[#EAECEF]"
                }`}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Grid */}
      <AnimatePresence mode="wait" initial={false}>
        {filteredEvents.length === 0 ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="rounded-xl border border-dashed border-[#E5E7E9] bg-white p-12 text-center shadow-xs flex flex-col items-center justify-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F6F7F8] border border-[#E5E7E9] text-[#777E86] mb-3.5">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#17191C]">No events match your filter</h3>
            <p className="mt-1 text-xs text-[#858B93] max-w-sm leading-relaxed">
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
              className="mt-4 rounded-lg border-[#E5E7E9] text-xs font-semibold text-[#17191C] bg-white hover:bg-[#F6F7F8]"
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
                  className="group flex flex-col justify-between overflow-hidden rounded-xl border border-[#E5E7E9] bg-white shadow-xs transition-all duration-150 hover:border-[#D9DCE0] hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:transform-none"
                >
                  {/* Poster / Artwork Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-[#F6F7F8]">
                    <img
                      src={event.directoryImage || event.posterUrl || event.heroImage || "/sketch-logo.png"}
                      alt={event.title}
                      style={{ objectPosition: event.directoryImageFocalPoint || event.focalPoint || "center center" }}
                      className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transform-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#34383D]/70 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="rounded-md bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold text-[#34383D] shadow-xs">
                        {event.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="rounded-md bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#34383D] border border-[#E5E7E9]">
                        {event.lifecycle}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-base font-bold text-white drop-shadow-xs line-clamp-1">
                        {event.title}
                      </h3>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-xs text-[#858B93] line-clamp-2 leading-relaxed">
                      {event.shortDescription || event.description}
                    </p>

                    {/* Meta info */}
                    <div className="mt-4 space-y-2 border-t border-[#E5E7E9] pt-3 text-xs text-[#858B93]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-[#777E86]" />
                        <span>{formatDate(event.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#777E86]" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#858B93] flex items-center gap-1">
                          <Users className="h-3 w-3 text-[#777E86]" />
                          <strong className="text-[#34383D] font-semibold font-mono tabular-nums">{event.registeredCount}</strong> / <span className="font-mono tabular-nums">{event.capacity}</span>
                        </span>
                        <span className="text-[#858B93] font-medium font-mono tabular-nums">{percentFilled}% Filled</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EAECEF]">
                        <div
                          style={{ width: `${percentFilled}%` }}
                          className="h-full rounded-full bg-[#34383D] transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between border-t border-[#E5E7E9] bg-[#F6F7F8] px-4 py-2.5">
                    {event.lifecycle === "published" || event.lifecycle === "live" ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleCopyEventLink(e, event)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#656B73] hover:text-[#17191C] transition-colors"
                          title="Copy public event link"
                        >
                          {copiedEventId === event.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                        <span className="text-[#D0D3D6]">•</span>
                        <Link
                          href={`/e/${event.slug || event.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#34383D] hover:underline"
                        >
                          <span>Public Page</span>
                          <ArrowUpRight className="h-3 w-3 text-[#777E86]" />
                        </Link>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-[#858B93] italic">
                        Draft (Unpublished)
                      </span>
                    )}

                    <Link href={`/events/${event.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-lg border-[#E5E7E9] px-3 text-xs font-semibold text-[#34383D] bg-white hover:bg-[#EAECEF]"
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
