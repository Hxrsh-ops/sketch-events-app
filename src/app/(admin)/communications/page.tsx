"use client";

import { Mail, Send, CheckCircle2, Clock, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_COMMUNICATIONS } from "@/lib/mock-data";

export default function CommunicationsPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#191A1C]">
            Communications & Outbox
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
            Provider-neutral transactional email dispatch, outbox queue state, and reminder delivery telemetry.
          </p>
        </div>

        <Button
          variant="forest"
          className="rounded-2xl gap-2 font-semibold shadow-md shadow-[#1B4332]/10"
          onClick={() => alert("Compose announcement modal")}
        >
          <Plus className="h-4 w-4" />
          <span>New Message</span>
        </Button>
      </div>

      {/* Outbox Status Cards */}
      <div className="space-y-4">
        {MOCK_COMMUNICATIONS.map((job) => (
          <div
            key={job.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm gap-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F4F1] text-[#8F2635]">
                <Mail className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#191A1C]">
                  {job.subject}
                </h3>
                <span className="text-xs font-semibold text-[#65666A]">
                  Event: {job.eventTitle}
                </span>
                <div className="flex items-center gap-3 text-xs text-[#929398] pt-1">
                  <span>Audience: <strong>{job.recipientCount}</strong> recipients</span>
                  <span>•</span>
                  <span>Type: <strong className="capitalize">{job.type}</strong></span>
                  {job.deliveredAt && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{job.deliveredAt}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {job.status === "sent" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Sent
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Clock className="h-3 w-3" />
                  Queued for Delivery
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
