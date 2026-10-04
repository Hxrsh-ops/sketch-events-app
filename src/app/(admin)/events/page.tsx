"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Calendar, MapPin, Users, ArrowUpRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

const FILTER_TABS = ["All", "Published", "Live", "Completed", "Draft"] as const;

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = MOCK_EVENTS.filter((evt) => {
    const matchesTab =
      activeTab === "All" ||
      evt.lifecycle.toLowerCase() === activeTab.toLowerCase();
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#191A1C]">
            Events
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
            Create, configure, and monitor every SKETCH experience through its complete lifecycle.
          </p>
        </div>

        <Link href="/events/new">
          <Button variant="forest" className="rounded-2xl gap-2 font-semibold shadow-md shadow-[#1B4332]/10">
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </Button>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#EAE8E3] bg-white p-4 shadow-sm">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "bg-[#1B4332] text-white shadow-sm"
                  : "bg-[#F9F8F6] text-[#65666A] hover:bg-[#EFEEEA] hover:text-[#191A1C]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#929398]" />
          <input
            type="text"
            placeholder="Search events by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#EAE8E3] bg-[#F9F8F6] pl-9 pr-4 text-xs text-[#191A1C] placeholder:text-[#929398] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
          />
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="group flex flex-col justify-between overflow-hidden rounded-[22px] border border-[#EAE8E3] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            {/* Poster / Thumbnail Header */}
            <div className="relative h-44 w-full overflow-hidden bg-[#EFEEEA]">
              <img
                src={event.posterUrl}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge variant="secondary" className="bg-white/90 text-[#191A1C] font-semibold text-[10px]">
                  {event.category}
                </Badge>
              </div>
              <div className="absolute top-3 right-3">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    event.registrationState === "open"
                      ? "bg-emerald-500 text-white"
                      : event.registrationState === "full"
                      ? "bg-amber-500 text-white"
                      : "bg-[#191A1C]/70 text-white"
                  }`}
                >
                  {event.registrationState.toUpperCase()}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-base font-bold text-white drop-shadow-sm line-clamp-1">
                  {event.title}
                </h3>
              </div>
            </div>

            {/* Event Body Details */}
            <div className="flex flex-1 flex-col p-5">
              <p className="text-xs text-[#65666A] line-clamp-2 leading-relaxed">
                {event.shortDescription}
              </p>

              <div className="mt-4 space-y-2 border-t border-[#F5F4F1] pt-3 text-xs text-[#65666A]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#929398]" />
                  <span>{formatDate(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-[#929398]" />
                  <span className="line-clamp-1">{event.venue}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-[#929398]" />
                  <span>
                    <strong className="text-[#191A1C]">{event.registeredCount}</strong> / {event.capacity} Registered
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-[#F5F4F1] bg-[#FAF9F7] px-5 py-3">
              <Link
                href={`/e/${event.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#8F2635] hover:underline"
              >
                <span>Public Page</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>

              <Link href={`/events/${event.id}`}>
                <Button variant="outline" size="sm" className="rounded-xl border-[#E8E6E1] text-xs font-semibold">
                  Manage
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
