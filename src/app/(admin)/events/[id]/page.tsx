"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  ArrowUpRight,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_EVENTS, MOCK_PARTICIPANTS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const event =
    MOCK_EVENTS.find((e) => e.id === id) || MOCK_EVENTS[0];

  const participants = MOCK_PARTICIPANTS.filter((p) => p.eventId === event.id);

  return (
    <div className="flex flex-col space-y-6">
      {/* Back button and Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#656B73] hover:text-[#17191C] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Events</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/e/${event.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="rounded-full border-[#E5E7EA] gap-1.5">
              <span>View Public Page</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/attendance">
            <Button variant="charcoal" size="sm" className="rounded-full gap-1.5">
              <QrCode className="h-3.5 w-3.5" />
              <span>Launch Check-in</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Event Overview Card */}
      <div className="overflow-hidden rounded-[24px] border border-[#E5E7EA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-[#EAECEF]">
          <img
            src={event.posterUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-white/95 text-[#17191C] font-bold text-xs backdrop-blur-sm">
              {event.category}
            </Badge>
          </div>
          <div className="absolute bottom-5 left-6 right-6 text-white space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              {event.lifecycle.toUpperCase()} EVENT
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {event.title}
            </h1>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#F4F5F6] border-b border-[#F4F5F6] bg-[#F4F5F6]/40 text-xs">
          <div className="p-4 space-y-1">
            <span className="text-[#8A9098] text-[10px] font-bold uppercase">Schedule</span>
            <div className="font-bold text-[#17191C]">{formatDate(event.startDate)}</div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[#8A9098] text-[10px] font-bold uppercase">Venue</span>
            <div className="font-bold text-[#17191C] truncate">{event.venue}</div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[#8A9098] text-[10px] font-bold uppercase">Registrations</span>
            <div className="font-bold text-[#17191C]">
              {event.registeredCount} / {event.capacity} seats
            </div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[#8A9098] text-[10px] font-bold uppercase">Attendance</span>
            <div className="font-bold text-[#17191C]">
              {event.checkedInCount} checked in
            </div>
          </div>
        </div>

        {/* Description & Overview */}
        <div className="p-6 space-y-3">
          <h2 className="text-sm font-bold text-[#17191C]">Description</h2>
          <p className="text-xs text-[#656B73] leading-relaxed">
            {event.description}
          </p>
        </div>
      </div>

      {/* Associated Participants Section */}
      <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#17191C]">
            Event Registrations ({participants.length})
          </h2>
          <Link href="/participants" className="text-xs font-semibold text-[#17191C] hover:underline">
            View all in Participants →
          </Link>
        </div>

        {participants.length > 0 ? (
          <div className="divide-y divide-[#F4F5F6]">
            {participants.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#17191C]">{p.name}</div>
                  <div className="text-[11px] text-[#8A9098]">{p.email} · {p.registrationId}</div>
                </div>
                <div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      p.attendanceStatus === "checked_in"
                        ? "bg-[#EAECEF] text-[#17191C]"
                        : "bg-[#F4F5F6] text-[#8A9098]"
                    }`}
                  >
                    {p.attendanceStatus === "checked_in" ? "CHECKED IN" : "PENDING"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#8A9098]">No participants registered for this event yet.</p>
        )}
      </div>
    </div>
  );
}
