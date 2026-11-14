"use client";

import React, { useState } from "react";
import {
  Calendar,
  MapPin,
  QrCode,
  RefreshCw,
  Ticket as TicketIcon,
  Users,
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
    type: "synthetic" | "live" | "static";
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

  const accentColor = design.theme.accent || "#E2B857";
  const bgColor = design.theme.background || "#111315";
  const borderColor = design.theme.borderColor || "#2C3136";

  const admissionLabel = event.venueMode
    ? event.venueMode === "in-person"
      ? "IN-PERSON"
      : event.venueMode.toUpperCase()
    : "CONFIRMED";

  const hasCustomElements = design.elements && design.elements.length > 0;

  const getCustomElementValue = (el: any) => {
    if (showVariableKeys && el.bindingKey && el.bindingKey !== "custom") {
      return `{{${el.bindingKey}}}`;
    }
    switch (el.bindingKey) {
      case "event_title":
        return event.title ? displayTitle : (el.sampleValue !== undefined && el.sampleValue !== null ? el.sampleValue : displayTitle);
      case "attendee_name":
        return attendee.name ? displayAttendee : (el.sampleValue !== undefined && el.sampleValue !== null ? el.sampleValue : displayAttendee);
      case "ticket_number":
        return attendee.ticketNumber ? displayTicketNumber : (el.sampleValue !== undefined && el.sampleValue !== null ? el.sampleValue : displayTicketNumber);
      case "venue":
        return event.venue ? displayVenue : (el.sampleValue !== undefined && el.sampleValue !== null ? el.sampleValue : displayVenue);
      case "start_date":
        return event.startDate ? displayDate : (el.sampleValue !== undefined && el.sampleValue !== null ? el.sampleValue : displayDate);
      case "team_name":
        return attendee.teamName !== undefined && attendee.teamName !== null ? (displayTeam || "") : (el.sampleValue !== undefined && el.sampleValue !== null ? el.sampleValue : (displayTeam || ""));
      case "category":
        return event.category || el.sampleValue || "ADMIT ONE";
      case "status":
        return admissionLabel || el.sampleValue || "CONFIRMED";
      case "custom":
      default:
        return el.text !== undefined && el.text !== null ? el.text : "";
    }
  };

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
        className="unified-ticket-root w-full h-full rounded-2xl border flex overflow-hidden shadow-[0_24px_60px_-15px_rgba(0,0,0,0.45)] relative text-white print:border-neutral-300 print:shadow-none"
        style={{
          backgroundColor: bgColor,
          borderColor,
        }}
      >
        {/* Subtle Architectural Texture & Accent Spotlight (when no custom image) */}
        {!hasBgImage && (
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 12% 18%, ${accentColor}1c 0%, transparent 48%), radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)`,
              backgroundSize: "100% 100%, 18px 18px",
            }}
          />
        )}

        {/* Inner Hairline Frame */}
        <div className="absolute inset-[1px] rounded-[15px] ring-1 ring-inset ring-white/10 pointer-events-none z-20" />

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

        {/* Layer 1: MAIN PASS (Custom Elements or Starter Pass Layout) */}
        {hasCustomElements ? (
          <div className="custom-elements-container flex-1 relative z-10 overflow-hidden">
            {design.elements.map((el) => {
              const val = getCustomElementValue(el);
              return (
                <div
                  key={el.id}
                  style={{
                    position: "absolute",
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width}px`,
                    height: `${el.height}px`,
                    zIndex: el.zIndex,
                    color: el.color || design.theme.textColor || "#F3F4F6",
                    fontSize: `${el.fontSize || 14}px`,
                    fontWeight: el.fontWeight || "normal",
                    textAlign: el.alignment || "left",
                    letterSpacing: el.letterSpacing !== undefined ? `${el.letterSpacing}px` : undefined,
                    lineHeight: el.lineHeight !== undefined ? `${el.lineHeight}` : undefined,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      el.alignment === "center"
                        ? "center"
                        : el.alignment === "right"
                        ? "flex-end"
                        : "flex-start",
                  }}
                >
                  <span className="truncate w-full">{val}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={`main-pass flex-1 p-7 sm:p-8 flex flex-col justify-between relative z-10 ${
              hasBgImage
                ? "bg-gradient-to-r from-black/65 via-black/45 to-black/55 backdrop-blur-[1px]"
                : "bg-transparent"
            }`}
          >
            {/* Header Row: Official Club Mark + Pass Serial */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/sketch-isometric-mark.png"
                    alt="SKETCH"
                    className="h-6 w-6 rounded-md object-contain bg-white/10 p-0.5 border border-white/15"
                  />
                  <span className="text-xs font-extrabold tracking-[0.22em] uppercase text-white">
                    {event.organizerName || "SKETCH"}
                  </span>
                </div>

                {event.category && (
                  <>
                    <span className="h-3.5 w-[1px] bg-white/20" />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-[0.16em] truncate"
                      style={{ color: accentColor }}
                    >
                      {event.category}
                    </span>
                  </>
                )}
              </div>

              <div className="font-mono text-[11px] font-semibold tracking-wider text-white/75 bg-white/[0.06] px-2.5 py-1 rounded-md border border-white/10 shrink-0">
                {displayTicketNumber}
              </div>
            </div>

            {/* Event Title & Schedule/Venue Row */}
            <div className="my-auto py-4 space-y-3">
              <h1
                className="text-2xl sm:text-[30px] font-extrabold tracking-tight leading-[1.12] line-clamp-2 text-white"
                style={{
                  fontFamily:
                    design.theme.fontFamily === "serif"
                      ? "Georgia, serif"
                      : design.theme.fontFamily === "mono"
                      ? "monospace"
                      : "inherit",
                }}
              >
                {displayTitle}
              </h1>

              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-5 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: accentColor }}
                  />
                  <span className="font-medium tracking-tight">{displayDate}</span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: accentColor }}
                  />
                  <span className="font-medium tracking-tight truncate max-w-[270px]">
                    {displayVenue}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Attendee & Meta Row */}
            <div className="pt-3.5 border-t border-white/15 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-white/50 block mb-0.5">
                  Holder
                </span>
                <span className="font-bold text-sm sm:text-base text-white tracking-tight truncate block">
                  {displayAttendee}
                </span>
              </div>

              {hasTeam && (
                <div className="min-w-0">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-white/50 block mb-0.5">
                    Team
                  </span>
                  <span className="font-semibold text-xs sm:text-sm text-white/90 truncate flex items-center gap-1.5">
                    <Users className="h-3 w-3 shrink-0 text-white/50" />
                    {displayTeam}
                  </span>
                </div>
              )}

              <div className="text-right shrink-0">
                <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-white/50 block mb-0.5">
                  Access
                </span>
                <span
                  className="font-bold text-[11px] tracking-[0.14em] uppercase"
                  style={{ color: accentColor }}
                >
                  {admissionLabel}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Layer 2: Perforated Divider (Notches & Vertical Line) */}
        {design.stub.perforationPosition === "right" && (
          <div className="perforated-divider relative w-0 flex flex-col justify-between items-center py-0 z-20">
            {/* Top semicircular notch */}
            <div className="w-5 h-5 -mt-2.5 bg-[#0A0B0D] rounded-full border border-white/15 print:bg-white print:border-neutral-400" />
            {/* Vertical perforation line */}
            <div className="h-full border-r border-dashed border-white/25 my-1 print:border-neutral-400" />
            {/* Bottom semicircular notch */}
            <div className="w-5 h-5 -mb-2.5 bg-[#0A0B0D] rounded-full border border-white/15 print:bg-white print:border-neutral-400" />
          </div>
        )}

        {/* Layer 3: DETACHABLE VERIFICATION STUB (Approx 28% width) */}
        {design.stub.perforationPosition === "right" && (
          <div
            className={`verification-stub p-5 sm:p-6 flex flex-col items-center justify-between text-center relative z-10 border-l border-white/10 ${
              hasBgImage
                ? "bg-black/70 backdrop-blur-md"
                : "bg-black/25"
            }`}
            style={{
              width: `${design.stub.stubWidth || 240}px`,
            }}
          >
            {/* Stub Header */}
            <div className="space-y-1 w-full">
              <div className="flex items-center justify-center gap-1.5">
                <TicketIcon
                  className="h-3 w-3"
                  style={{ color: accentColor }}
                />
                <span
                  style={{ color: accentColor }}
                  className="text-[10px] font-extrabold uppercase tracking-[0.18em] block"
                >
                  {design.stub.badgeText || "ADMIT ONE"}
                </span>
              </div>
              <span className="text-[9px] text-white/45 block font-mono tracking-widest uppercase">
                Check-In Pass
              </span>
            </div>

            {/* High-Contrast Crisp White QR Card Container */}
            <div className="p-3 bg-white rounded-xl shadow-xl border border-white/80 flex flex-col items-center justify-center relative">
              {(qr.type === "live" || qr.type === "static") && qr.qrDataUrl ? (
                <div className="relative">
                  <img
                    src={qr.qrDataUrl}
                    alt="Ticket QR Code"
                    className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                  />
                  {isCheckedIn && (
                    <div className="absolute inset-0 bg-emerald-600/95 rounded-lg flex flex-col items-center justify-center text-white p-1 text-center font-bold text-xs">
                      <CheckCircle2 className="h-6 w-6 mb-0.5" />
                      <span>CHECKED IN</span>
                    </div>
                  )}
                </div>
              ) : qr.isLoading ? (
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
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-white/85">
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-ping"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span>
                    Refreshes in{" "}
                    <strong className="text-white">
                      {qr.secondsRemaining ?? 30}s
                    </strong>
                  </span>
                </div>
              ) : (
                <span className="text-[9px] text-white/60 block font-medium">
                  Present at venue desk
                </span>
              )}

              <span className="text-[8.5px] text-white/40 block font-mono truncate">
                {displayTicketNumber}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
