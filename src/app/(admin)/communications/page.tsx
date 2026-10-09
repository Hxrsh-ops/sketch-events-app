"use client";

import { Mail, CheckCircle2, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_COMMUNICATIONS } from "@/lib/mock-data";

export default function CommunicationsPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17191C]">
            Communications & Outbox
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73]">
            Provider-neutral transactional email dispatch, outbox queue state, and reminder delivery telemetry.
          </p>
        </div>

        <Button
          variant="charcoal"
          className="rounded-full gap-2 font-medium shadow-sm"
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
            className="flex flex-col sm:flex-row sm:items-center justify-between rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] gap-4 hover:shadow-card transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4F5F6] text-[#17191C]">
                <Mail className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#17191C]">
                  {job.subject}
                </h3>
                <span className="text-xs font-semibold text-[#656B73]">
                  Event: {job.eventTitle}
                </span>
                <div className="flex items-center gap-3 text-xs text-[#8A9098] pt-1">
                  <span>Audience: <strong>{job.recipientCount}</strong> recipients</span>
                  <span>•</span>
                  <span>Type: <strong className="capitalize">{job.type}</strong></span>
                  {job.deliveredAt && (
                    <>
                      <span>•</span>
                      <span className="text-[#17191C] font-semibold">{job.deliveredAt}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {job.status === "sent" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#17191C] bg-[#EAECEF] px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3 text-[#25292F]" />
                  Sent
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#656B73] bg-[#F0F1F2] px-2.5 py-1 rounded-full">
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
