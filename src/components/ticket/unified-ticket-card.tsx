"use client";

import React, { useState } from "react";
import {
  Calendar,
  MapPin,
  QrCode,
  RefreshCw,
  Sparkles,
  Ticket as TicketIcon,
  Users,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { TicketDesignData } from "@/lib/validations/ticket-schemas";

export interface UnifiedTicketCardProps {
  design: TicketDesignData;
  event: {
    title: string;
    category?: string;
    venue?: string;
    venueMode?: string;
    startDate?: string;
    endDate?: string;
    organizerName?: string;
  };
  attendee: {
    name: string;
    email?: string;
    teamName?: string | null;
    ticketNumber: string;
    ticketStatus?: "active" | "revoked" | "cancelled";
    attendanceStatus?: "not_attended" | "checked_in" | "not_checked_in" | string;
  };
  qr: {
    type: "synthetic" | "live";
    qrDataUrl?: string | null;
    secondsRemaining?: number;
    isLoading?: boolean;
    error?: string | null;
    onRefresh?: () => void;
  };
  showVariableKeys?: boolean;
  className?: string;
}

export function UnifiedTicketCard({
  design,
  event,
  attendee,
  qr,
  showVariableKeys = false,
  className = "",
}: UnifiedTicketCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  // Position mapping to CSS background-position
  const positionMap: Record<string, string> = {
    center: "center center",
    top: "center top",
    bottom: "center bottom",
    left: "left center",
    right: "right center",
    "top-left": "left top",
    "top-right": "right top",
    "bottom-left": "left bottom",
    "bottom-right": "right bottom",
  };

  const bgPosition = positionMap[design.backgroundImage?.position || "center"] || "center center";
  const bgFit = design.backgroundImage?.fit || "cover";
  const hasBgImage = Boolean(design.backgroundImage?.url && !imageFailed);

  // Formatted date string
  const displayDate = showVariableKeys
    ? "{{start_date}}"
    : event.startDate
    ? new Date(event.startDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Saturday, Nov 21 • 10:00 AM";

  const displayTitle = showVariableKeys
    ? "{{event_title}}"
    : event.title || "Sample Event Name";

  const displayVenue = showVariableKeys
    ? "{{venue}}"
    : event.venue || "Campus Auditorium, Zone 1";

  const displayAttendee = showVariableKeys
    ? "{{attendee_name}}"
    : attendee.name || "Participant Name";

  const displayTicketNumber = showVariableKeys
    ? "{{ticket_number}}"
    : attendee.ticketNumber || "TKT-2026-0001";

  const hasTeam = !showVariableKeys && Boolean(attendee.teamName && attendee.teamName.trim().length > 0);
  const displayTeam = showVariableKeys ? "{{team_name}}" : attendee.teamName;

  const isCheckedIn = attendee.attendanceStatus === "checked_in";
  const isRevoked = attendee.ticketStatus === "revoked";

  return (
    <div
      className={`unified-ticket-wrapper relative select-none shrink-0 print:m-0 print:p-0 ${className}`}
      style={{
        width: `${design.canvas.width || 800}px`,
        height: `${design.canvas.height || 380}px`,
      }}
    >
      {/* Container Ticket Card */}
      <div
        className="unified-ticket-root w-full h-full rounded-2xl border flex overflow-hidden shadow-2xl relative text-white print:border-neutral-300 print:shadow-none"
        style={{
          backgroundColor: design.theme.background || "#111315",
          borderColor: design.theme.borderColor || "#2C3136",
        }}
      >
        {/* Layer 0: Background Artwork if present */}
        {hasBgImage && (
          <div
            className="ticket-bg-layer absolute inset-0 z-0 pointer-events-none overflow-hidden print:opacity-100"
            style={{
              backgroundImage: `url(${design.backgroundImage!.url})`,
              backgroundSize: bgFit,
              backgroundPosition: bgPosition,
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Hidden image element to detect network/URL load failures safely */}
            <img
              src={design.backgroundImage!.url}
              alt=""
              className="hidden"
              onError={() => setImageFailed(true)}
            />

            {/* Configurable Readability Contrast Overlay */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: design.backgroundImage!.overlayColor || "#000000",
                opacity: design.backgroundImage!.overlayOpacity ?? 0.25,
              }}
            />
          </div>
        )}

        {/* Fallback pattern when background image was attempted but failed to load */}
        {imageFailed && (
          <div className="absolute inset-0 z-0 bg-neutral-900 flex items-center justify-center text-neutral-600 text-xs">
            <span>[Background Image Unavailable - Using Neutral Theme]</span>
          </div>
        )}

        {/* Layer 1: MAIN PASS (Approx 72% width) */}
        <div
          className={`main-pass flex-1 p-6 sm:p-7 flex flex-col justify-between relative z-10 ${
            hasBgImage
              ? "bg-gradient-to-r from-black/55 via-black/40 to-black/50 backdrop-blur-[0.5px]"
              : "bg-transparent"
          }`}
        >
          {/* Header Row: Branding, Admission Label, and Ticket Reference */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: design.theme.accent || "#E2B857" }}
                />
                <span className="text-[10px] font-black tracking-widest uppercase text-white/90">
                  SKETCHHUB
                </span>
              </div>

              <span
                style={{
                  color: design.theme.accent || "#E2B857",
                  borderColor: `${design.theme.accent || "#E2B857"}50`,
                  backgroundColor: `${design.theme.accent || "#E2B857"}15`,
                }}
                className="text-[10px] font-bold tracking-wider uppercase border px-2.5 py-0.5 rounded-full"
              >
                {design.stub.badgeText || "GENERAL ADMISSION"}
              </span>

              {event.category && (
                <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider hidden sm:inline">
                  • {event.category}
                </span>
              )}
            </div>

            <div className="font-mono text-xs font-bold text-white/80 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
              {displayTicketNumber}
            </div>
          </div>

          {/* Event Title & Location Row */}
          <div className="my-auto py-3 space-y-2">
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight leading-tight line-clamp-2 text-white drop-shadow-md"
              style={{
                fontFamily:
                  design.theme.fontFamily === "serif"
                    ? "serif"
                    : design.theme.fontFamily === "mono"
                    ? "monospace"
                    : "inherit",
              }}
            >
              {displayTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-white/85 pt-1">
              <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                <Calendar
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: design.theme.accent || "#E2B857" }}
                />
                <span className="font-medium">{displayDate}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                <MapPin
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: design.theme.accent || "#E2B857" }}
                />
                <span className="font-medium truncate max-w-[260px]">{displayVenue}</span>
              </div>
            </div>
          </div>

          {/* Bottom Attendee & Meta Row */}
          <div className="pt-3 border-t border-white/15 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-widest font-bold text-white/60 block mb-0.5">
                Pass Holder
              </span>
              <span className="font-black text-sm sm:text-base text-white tracking-tight truncate block drop-shadow-sm">
                {displayAttendee}
              </span>
            </div>

            {hasTeam && (
              <div className="min-w-0">
                <span className="text-[9px] uppercase tracking-widest font-bold text-white/60 block mb-0.5">
                  Team
                </span>
                <span className="font-semibold text-xs sm:text-sm text-white/90 truncate block flex items-center gap-1">
                  <Users className="h-3 w-3 inline text-white/60" />
                  {displayTeam}
                </span>
              </div>
            )}

            <div className="text-right">
              <span className="text-[9px] uppercase tracking-widest font-bold text-white/60 block mb-0.5">
                Admission
              </span>
              <span
                className="font-bold text-xs uppercase"
                style={{ color: design.theme.accent || "#E2B857" }}
              >
                {event.venueMode ? `${event.venueMode.toUpperCase()} PASS` : "CONFIRMED ENTRY"}
              </span>
            </div>
          </div>
        </div>

        {/* Layer 2: Perforated Divider (Notches & Vertical Line) */}
        {design.stub.perforationPosition === "right" && (
          <div className="perforated-divider relative w-0 flex flex-col justify-between items-center py-0 z-20">
            {/* Top semicircular notch */}
            <div className="w-5 h-5 -mt-2.5 bg-[#0A0B0D] dark:bg-[#0A0B0D] rounded-full border border-neutral-700/60 print:bg-white print:border-neutral-400" />
            {/* Vertical perforation line */}
            <div className="h-full border-r-2 border-dashed border-white/30 my-1 print:border-neutral-400" />
            {/* Bottom semicircular notch */}
            <div className="w-5 h-5 -mb-2.5 bg-[#0A0B0D] dark:bg-[#0A0B0D] rounded-full border border-neutral-700/60 print:bg-white print:border-neutral-400" />
          </div>
        )}

        {/* Layer 3: DETACHABLE VERIFICATION STUB (Approx 28% width) */}
        {design.stub.perforationPosition === "right" && (
          <div
            className={`verification-stub p-5 sm:p-6 flex flex-col items-center justify-between text-center relative z-10 border-l border-white/10 ${
              hasBgImage
                ? "bg-black/60 backdrop-blur-md"
                : "bg-neutral-900/90"
            }`}
            style={{
              width: `${design.stub.stubWidth || 240}px`,
            }}
          >
            {/* Stub Header */}
            <div className="space-y-0.5 w-full">
              <div className="flex items-center justify-center gap-1">
                <TicketIcon
                  className="h-3 w-3"
                  style={{ color: design.theme.accent || "#E2B857" }}
                />
                <span
                  style={{ color: design.theme.accent || "#E2B857" }}
                  className="text-[9px] font-black uppercase tracking-widest block"
                >
                  {design.stub.badgeText || "ADMIT ONE"}
                </span>
              </div>
              <span className="text-[9px] text-white/60 block font-mono">
                GATE VERIFICATION
              </span>
            </div>

            {/* High-Contrast Crisp White QR Card Container */}
            <div className="p-3 bg-white rounded-2xl shadow-xl border border-neutral-200 flex flex-col items-center justify-center">
              {qr.type === "live" && qr.qrDataUrl ? (
                <div className="relative">
                  <img
                    src={qr.qrDataUrl}
                    alt="Ticket QR Code"
                    className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                  />
                  {isCheckedIn && (
                    <div className="absolute inset-0 bg-emerald-500/90 rounded-lg flex flex-col items-center justify-center text-white p-1 text-center font-bold text-xs">
                      <CheckCircle2 className="h-6 w-6 mb-0.5" />
                      <span>CHECKED IN</span>
                    </div>
                  )}
                </div>
              ) : qr.type === "live" && qr.isLoading ? (
                <div className="w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center text-neutral-400">
                  <RefreshCw className="h-6 w-6 animate-spin mb-1 text-neutral-600" />
                  <span className="text-[9px] font-mono">Generating...</span>
                </div>
              ) : (
                /* Synthetic Preview QR Code */
                <div className="flex flex-col items-center justify-center">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white flex items-center justify-center p-1">
                    <QrCode className="h-full w-full text-neutral-900" />
                  </div>
                  <span className="text-[7.5px] font-mono font-black text-neutral-500 uppercase tracking-tighter mt-1 bg-neutral-100 px-1.5 py-0.5 rounded">
                    SAMPLE PREVIEW • NOT VALID
                  </span>
                </div>
              )}
            </div>

            {/* Stub Footer: Timer or Gate Instructions */}
            <div className="w-full space-y-1">
              {qr.type === "live" && !isCheckedIn && !isRevoked ? (
                <div className="flex items-center justify-center gap-1.5 text-[9px] font-mono text-white/80">
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-ping"
                    style={{ backgroundColor: design.theme.accent || "#E2B857" }}
                  />
                  <span>
                    Refreshes in{" "}
                    <strong className="text-white">
                      {qr.secondsRemaining ?? 30}s
                    </strong>
                  </span>
                </div>
              ) : (
                <span className="text-[9px] text-white/70 block font-medium">
                  Scan at entrance gate
                </span>
              )}

              <span className="text-[8.5px] text-white/50 block font-mono truncate">
                REF: {displayTicketNumber}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
