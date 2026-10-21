"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sun,
  Printer,
  ShieldCheck,
  Check,
  Copy,
  RefreshCw,
  Clock,
} from "lucide-react";
import { LiveTicketData } from "@/types";
import { requestRotatingQrTokenAction } from "@/app/actions/ticket-actions";
import { UnifiedTicketCard } from "@/components/ticket/unified-ticket-card";
import { TicketDesignData } from "@/lib/validations/ticket-schemas";

interface LiveTicketClientProps {
  ticket: LiveTicketData;
  bearerToken: string;
}

const DEFAULT_TICKET_DESIGN: TicketDesignData = {
  layout: "cinematic-horizontal",
  canvas: { width: 800, height: 380, unit: "px" },
  theme: {
    background: "#111315",
    surface: "#181B1E",
    accent: "#E2B857",
    textColor: "#F3F4F6",
    secondaryTextColor: "#9CA3AF",
    borderColor: "#2C3136",
    fontFamily: "cinematic",
  },
  stub: {
    perforationPosition: "right",
    stubWidth: 240,
    badgeText: "GENERAL ADMISSION",
    showPerforationDots: true,
  },
  qr: {
    size: 180,
    label: "SCAN TO VERIFY",
    rotating: true,
    refreshIntervalSec: 30,
  },
  elements: [],
};

export default function LiveTicketClient({ ticket, bearerToken }: LiveTicketClientProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isLoadingQr, setIsLoadingQr] = useState<boolean>(true);
  const [qrError, setQrError] = useState<string | null>(null);
  const [maxBrightnessMode, setMaxBrightnessMode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Fetch a fresh rotating QR token
  const fetchFreshQrToken = async () => {
    if (ticket.ticketStatus !== "active" || ticket.attendanceStatus === "checked_in") {
      setIsLoadingQr(false);
      return;
    }

    setIsLoadingQr(true);
    setQrError(null);

    try {
      const res = await requestRotatingQrTokenAction(bearerToken);
      if (res.success && res.data) {
        setQrDataUrl(res.data.qrDataUrl);
        setExpiresAt(res.data.expiresAt);
        const rem = Math.max(0, res.data.expiresAt - Math.floor(Date.now() / 1000));
        setSecondsRemaining(rem);
      } else {
        setQrError(res.message || "Failed to generate security QR token.");
      }
    } catch {
      setQrError("Connection interrupted. Please tap to retry.");
    } finally {
      setIsLoadingQr(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFreshQrToken();
  }, [bearerToken, ticket.ticketStatus, ticket.attendanceStatus]);

  // Countdown and auto-refresh timer loop
  useEffect(() => {
    if (ticket.ticketStatus !== "active" || ticket.attendanceStatus === "checked_in") return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const rem = Math.max(0, expiresAt - now);
      setSecondsRemaining(rem);

      if (rem <= 2 && !isLoadingQr) {
        fetchFreshQrToken();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isLoadingQr, ticket.ticketStatus, ticket.attendanceStatus]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const isCheckedIn = ticket.attendanceStatus === "checked_in";
  const isRevoked = ticket.ticketStatus === "revoked";

  const resolvedDesign: TicketDesignData = ticket.templateDesign || DEFAULT_TICKET_DESIGN;

  return (
    <main
      className={`min-h-screen py-8 px-4 transition-colors duration-200 flex flex-col items-center justify-center ${
        maxBrightnessMode ? "bg-white text-black" : "bg-[#0A0B0D] text-[#F3F4F6]"
      }`}
    >
      <div className="max-w-[840px] w-full space-y-4">
        {/* Top Utility Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-2 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-black tracking-widest text-xs text-amber-500 uppercase">
              SKETCHHUB
            </span>
            <span className="text-[#8E95A0]">•</span>
            <span className="text-[#8E95A0] font-medium">Verified Admission Pass</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMaxBrightnessMode(!maxBrightnessMode)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
                maxBrightnessMode
                  ? "bg-neutral-100 border-neutral-300 text-black font-semibold"
                  : "bg-[#181B1E] border-[#2C3136] text-[#A6ADB5] hover:text-white"
              }`}
              title="Boost contrast for terminal camera scanning"
            >
              <Sun className="h-3.5 w-3.5" />
              <span className="text-[11px] hidden sm:inline">Boost Contrast</span>
            </button>

            <button
              onClick={handlePrint}
              className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
                maxBrightnessMode
                  ? "bg-neutral-100 border-neutral-300 text-black font-semibold"
                  : "bg-[#181B1E] border-[#2C3136] text-[#A6ADB5] hover:text-white"
              }`}
              title="Print Landscape Pass"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="text-[11px] hidden sm:inline">Print Pass</span>
            </button>
          </div>
        </div>

        {/* Central High-Fidelity Ticket Pass */}
        <div className="w-full flex justify-center overflow-x-auto py-2">
          <UnifiedTicketCard
            design={resolvedDesign}
            event={{
              title: ticket.eventTitle,
              category: ticket.venueMode?.toUpperCase(),
              venue: ticket.venue,
              venueMode: ticket.venueMode,
              startDate: ticket.startDate,
            }}
            attendee={{
              name: ticket.attendeeName,
              ticketNumber: ticket.ticketNumber,
              teamName: ticket.teamName,
              ticketStatus: ticket.ticketStatus,
              attendanceStatus: ticket.attendanceStatus,
            }}
            qr={{
              type: "live",
              qrDataUrl: qrDataUrl,
              secondsRemaining: secondsRemaining,
              isLoading: isLoadingQr,
              error: qrError,
              onRefresh: fetchFreshQrToken,
            }}
          />
        </div>

        {/* Anti-Replay Security Explanation Banner (Hidden when printing) */}
        {!isCheckedIn && !isRevoked && (
          <div className="p-4 rounded-2xl bg-[#14171A] border border-[#23272C] flex items-start gap-3 text-xs text-[#8A9098] print:hidden">
            <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong className="text-white block mb-0.5">Live Rotating Security Pass</strong>
              Your admission QR code rotates automatically every 30 seconds with an active cryptographic signature. Present this live screen directly at the gate terminal for express check-in.
            </div>
          </div>
        )}

        {/* Footer Actions (Hidden when printing) */}
        <div className="flex items-center justify-between text-xs text-[#8E95A0] px-2 pt-2 print:hidden">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedLink ? "Link Copied" : "Copy Pass Link"}</span>
          </button>

          <Link href="/" className="hover:text-white transition-colors">
            SKETCHHUB Campus Operations
          </Link>
        </div>
      </div>
    </main>
  );
}
