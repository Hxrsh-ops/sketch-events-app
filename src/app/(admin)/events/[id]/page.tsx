"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Share2,
  Edit,
  ArrowUpRight,
  Send,
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
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#65666A] hover:text-[#191A1C] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Events</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/e/${event.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="rounded-xl border-[#E8E6E1] gap-1.5">
              <span>View Public Page</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/attendance">
            <Button variant="forest" size="sm" className="rounded-xl gap-1.5">
              <QrCode className="h-3.5 w-3.5" />
              <span>Launch Check-in</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Event Overview Card */}
      <div className="overflow-hidden rounded-[22px] border border-[#EAE8E3] bg-white shadow-sm">
        <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-[#EFEEEA]">
          <img
            src={event.posterUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-white/95 text-[#191A1C] font-bold text-xs backdrop-blur-sm">
              {event.category}
            </Badge>
          </div>
          <div className="absolute bottom-5 left-6 right-6 text-white space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              {event.lifecycle.toUpperCase()} EVENT
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {event.title}
            </h1>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#F5F4F1] border-b border-[#F5F4F1] bg-[#FAF9F7] text-xs">
          <div className="p-4 space-y-1">
            <span className="text-[#929398] text-[10px] font-bold uppercase">Schedule</span>
            <div className="font-bold text-[#191A1C]">{formatDate(event.startDate)}</div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[#929398] text-[10px] font-bold uppercase">Venue</span>
            <div className="font-bold text-[#191A1C] truncate">{event.venue}</div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[#929398] text-[10px] font-bold uppercase">Registrations</span>
            <div className="font-bold text-[#191A1C]">
              {event.registeredCount} / {event.capacity} seats
            </div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[#929398] text-[10px] font-bold uppercase">Attendance</span>
            <div className="font-bold text-emerald-700">
              {event.checkedInCount} checked in
            </div>
          </div>
        </div>

        {/* Description & Overview */}
        <div className="p-6 space-y-3">
          <h2 className="text-sm font-bold text-[#191A1C]">Description</h2>
          <p className="text-xs text-[#65666A] leading-relaxed">
            {event.description}
          </p>
        </div>
      </div>

      {/* Associated Participants Section */}
      <div className="rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#191A1C]">
            Event Registrations ({participants.length})
          </h2>
          <Link href="/participants" className="text-xs font-semibold text-[#8F2635] hover:underline">
            View all in Participants →
          </Link>
        </div>

        {participants.length > 0 ? (
          <div className="divide-y divide-[#F5F4F1]">
            {participants.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#191A1C]">{p.name}</div>
                  <div className="text-[11px] text-[#929398]">{p.email} · {p.registrationId}</div>
                </div>
                <div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.attendanceStatus === "checked_in"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-[#F5F4F1] text-[#929398]"
                    }`}
                  >
                    {p.attendanceStatus === "checked_in" ? "CHECKED IN" : "PENDING"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#929398]">No participants registered for this event yet.</p>
        )}
      </div>
    </div>
  );
}
