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
        <h1 className="text-3xl font-extrabold tracking-tight text-[#191A1C]">
          Attendance & Check-in
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
          Fast camera QR scanner and audited manual verification fallback for event staff.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Camera Scanner Interface */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE8E3]">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-[#1B4332]" />
              <span className="text-xs font-bold text-[#191A1C]">Active Event Session:</span>
            </div>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-[#E8E6E1] bg-[#F9F8F6] px-3 py-1 text-[#191A1C]"
            >
              <option value="evt-01">Sketch Design Sprint 2026</option>
              <option value="evt-02">Prompt to Prototype Hackathon</option>
              <option value="evt-03">Visual Storytelling Masterclass</option>
            </select>
          </div>

          {/* Scanner Viewfinder Box */}
          <div className="my-6 relative flex flex-col items-center justify-center rounded-2xl bg-[#0F281E] p-8 text-white min-h-[300px] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,167,69,0.1),transparent_70%)]" />

            {/* Target Reticle */}
            <div className="relative flex h-52 w-52 items-center justify-center rounded-3xl border-2 border-dashed border-emerald-400/60 bg-black/20 p-4">
              <QrCode className="h-16 w-16 text-emerald-300/40" />
              <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
              <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-emerald-400 rounded-br" />
              <div className="absolute h-0.5 w-44 bg-emerald-400/80 animate-bounce" />
            </div>

            <p className="mt-4 text-xs font-medium text-emerald-200/80 text-center">
              Align participant pass QR code within the frame
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-[#65666A]">
            <span>Camera: <strong>Rear 1080p (Active)</strong></span>
            <button
              type="button"
              onClick={() => alert("Simulating camera toggle")}
              className="inline-flex items-center gap-1 font-semibold text-[#8F2635] hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Switch Camera</span>
            </button>
          </div>
        </div>

        {/* Right: Manual Verification & Scan Outcome */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Manual Input Fallback */}
          <div className="rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#191A1C]">
              Manual Lookup Fallback
            </h3>
            <p className="text-xs text-[#65666A] mt-1">
              Search by Registration ID or Email address if the camera cannot read the screen.
            </p>

            <form onSubmit={handleManualCheckIn} className="mt-4 flex gap-2">
              <Input
                placeholder="e.g., REG-2026-8812"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="h-10 text-xs font-mono"
              />
              <Button type="submit" variant="forest" className="rounded-xl shrink-0">
                Check In
              </Button>
            </form>
          </div>

          {/* Outcome Card */}
          <div className="rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#929398]">
              Scan Outcome
            </h3>

            <div className="mt-4">
              {scanResult.status === "accepted" && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-4 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{scanResult.message}</span>
                  </div>
                  {scanResult.participant && (
                    <div className="text-xs border-t border-emerald-200/60 pt-2 space-y-1">
                      <div>Name: <strong>{scanResult.participant.name}</strong></div>
                      <div>Reg ID: <strong>{scanResult.participant.registrationId}</strong></div>
                      <div>Team: <strong>{scanResult.participant.teamName || "Individual"}</strong></div>
                    </div>
                  )}
                </div>
              )}

              {scanResult.status === "already_checked_in" && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200/60 p-4 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>Already Checked In</span>
                  </div>
                  <p className="text-xs">{scanResult.message}</p>
                </div>
              )}

              {scanResult.status === "not_found" && (
                <div className="rounded-2xl bg-rose-50 border border-rose-200/60 p-4 text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <span>Invalid Ticket / Not Found</span>
                  </div>
                  <p className="text-xs">{scanResult.message}</p>
                </div>
              )}

              {scanResult.status === "idle" && (
                <div className="rounded-2xl bg-[#F9F8F6] p-6 text-center text-xs text-[#929398]">
                  <Clock className="mx-auto h-8 w-8 text-[#D8D5CF] mb-2" />
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
