"use client";

import { useState } from "react";
import { QrCode, Search, CheckCircle2, AlertCircle, Camera, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_PARTICIPANTS } from "@/lib/mock-data";

export default function AttendancePage() {
  const [selectedEvent, setSelectedEvent] = useState("evt-01");
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<{
    status: "idle" | "accepted" | "already_checked_in" | "not_found";
    message: string;
    participant?: (typeof MOCK_PARTICIPANTS)[0];
  }>({
    status: "idle",
    message: "Point scanner at participant QR code or enter Registration ID manually.",
  });

  const handleManualCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const found = MOCK_PARTICIPANTS.find(
      (p) =>
        p.registrationId.toLowerCase() === manualCode.trim().toLowerCase() ||
        p.email.toLowerCase() === manualCode.trim().toLowerCase()
    );

    if (!found) {
      setScanResult({
        status: "not_found",
        message: `No participant matching "${manualCode}" was found for this event.`,
      });
      return;
    }

    if (found.attendanceStatus === "checked_in") {
      setScanResult({
        status: "already_checked_in",
        message: `Already checked in at ${found.checkedInAt || "earlier today"}`,
        participant: found,
      });
    } else {
      setScanResult({
        status: "accepted",
        message: `Valid Ticket! Checked in successfully.`,
        participant: found,
      });
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#17191C]">
          Attendance & Check-in
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#65666B]">
          Fast camera QR scanner and audited manual verification fallback for event staff.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Camera Scanner Interface */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EA]">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-[#17191C]" />
              <span className="text-xs font-bold text-[#17191C]">Active Event Session:</span>
            </div>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="text-xs font-semibold rounded-full border border-[#E5E7EA] bg-[#F4F5F6] px-3.5 py-1.5 text-[#17191C]"
            >
              <option value="evt-01">Sketch Design Sprint 2026</option>
              <option value="evt-02">Prompt to Prototype Hackathon</option>
              <option value="evt-03">Visual Storytelling Masterclass</option>
            </select>
          </div>

          {/* Scanner Viewfinder Box - Pure Dark Monochrome */}
          <div className="my-6 relative flex flex-col items-center justify-center rounded-2xl bg-[#17191C] p-8 text-white min-h-[300px] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_70%)]" />

            {/* Target Reticle */}
            <div className="relative flex h-52 w-52 items-center justify-center rounded-3xl border-2 border-dashed border-white/40 bg-black/40 p-4">
              <QrCode className="h-16 w-16 text-white/30" />
              <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-white rounded-tl" />
              <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-white rounded-tr" />
              <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-white rounded-bl" />
              <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-white rounded-br" />
              <div className="absolute h-0.5 w-44 bg-white/80 animate-bounce" />
            </div>

            <p className="mt-4 text-xs font-medium text-white/70 text-center">
              Align participant pass QR code within the frame
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-[#656B73]">
            <span>Camera: <strong>Rear 1080p (Active)</strong></span>
            <button
              type="button"
              onClick={() => alert("Simulating camera toggle")}
              className="inline-flex items-center gap-1 font-semibold text-[#17191C] hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Switch Camera</span>
            </button>
          </div>
        </div>

        {/* Right: Manual Verification & Scan Outcome */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Manual Input Fallback */}
          <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-bold text-[#17191C]">
              Manual Lookup Fallback
            </h3>
            <p className="text-xs text-[#656B73] mt-1">
              Search by Registration ID or Email address if the camera cannot read the screen.
            </p>

            <form onSubmit={handleManualCheckIn} className="mt-4 flex gap-2">
              <Input
                placeholder="e.g., REG-2026-8812"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="h-10 text-xs font-mono"
              />
              <Button type="submit" variant="charcoal" className="rounded-full shrink-0">
                Check In
              </Button>
            </form>
          </div>

          {/* Outcome Card */}
          <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A9098]">
              Scan Outcome
            </h3>

            <div className="mt-4">
              {scanResult.status === "accepted" && (
                <div className="rounded-2xl bg-[#F0F1F2] border border-[#E5E7EA] p-4 text-[#17191C] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4 text-[#17191C]" />
                    <span>{scanResult.message}</span>
                  </div>
                  {scanResult.participant && (
                    <div className="text-xs border-t border-[#E5E7EA] pt-2 space-y-1 text-[#656B73]">
                      <div>Name: <strong className="text-[#17191C]">{scanResult.participant.name}</strong></div>
                      <div>Reg ID: <strong className="text-[#17191C]">{scanResult.participant.registrationId}</strong></div>
                      <div>Team: <strong className="text-[#17191C]">{scanResult.participant.teamName || "Individual"}</strong></div>
                    </div>
                  )}
                </div>
              )}

              {scanResult.status === "already_checked_in" && (
                <div className="rounded-2xl bg-[#F0F1F2] border border-[#E5E7EA] p-4 text-[#17191C] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="h-4 w-4 text-[#656B73]" />
                    <span>Already Checked In</span>
                  </div>
                  <p className="text-xs text-[#656B73]">{scanResult.message}</p>
                </div>
              )}

              {scanResult.status === "not_found" && (
                <div className="rounded-2xl bg-[#F0F1F2] border border-[#E5E7EA] p-4 text-[#17191C] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="h-4 w-4 text-[#17191C]" />
                    <span>Invalid Ticket / Not Found</span>
                  </div>
                  <p className="text-xs text-[#656B73]">{scanResult.message}</p>
                </div>
              )}

              {scanResult.status === "idle" && (
                <div className="rounded-2xl bg-[#F4F5F6] p-6 text-center text-xs text-[#8A9098]">
                  <Clock className="mx-auto h-8 w-8 text-[#D4D7DC] mb-2" />
                  <span>Waiting for scan or manual entry...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
