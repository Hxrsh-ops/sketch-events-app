"use client";

import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_CERTIFICATES } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function CertificatesPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17191C]">
            Certificates
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73]">
            Generate and dispatch cryptographically verifiable attendance certificates to validated attendees.
          </p>
        </div>

        <Button
          variant="charcoal"
          className="rounded-full gap-2 font-medium shadow-sm"
          onClick={() => alert("Batch certificate generation job queued.")}
        >
          <Send className="h-4 w-4" />
          <span>Issue Eligible Batch</span>
        </Button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-xs text-[#8A9098]">Total Issued</span>
          <div className="text-3xl font-black text-[#17191C] mt-1">540</div>
          <span className="text-[11px] text-[#656B73] font-medium mt-1">Verified on record</span>
        </div>
        <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-xs text-[#8A9098]">Pending Issuance</span>
          <div className="text-3xl font-black text-[#17191C] mt-1">42</div>
          <span className="text-[11px] text-[#656B73] mt-1">Visual Storytelling Masterclass</span>
        </div>
        <div className="rounded-[24px] border border-[#E5E7EA] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-xs text-[#8A9098]">Delivery Success</span>
          <div className="text-3xl font-black text-[#17191C] mt-1">100%</div>
          <span className="text-[11px] text-[#8A9098] mt-1">No delivery bounces reported</span>
        </div>
      </div>

      {/* Table of Issued Certificates */}
      <div className="overflow-hidden rounded-[24px] border border-[#E5E7EA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <table className="w-full text-left text-xs text-[#17191C]">
          <thead className="border-b border-[#E5E7EA] bg-[#F4F5F6]/50 text-[11px] font-bold uppercase tracking-wider text-[#8A9098]">
            <tr>
              <th className="py-4 px-5">Recipient</th>
              <th className="py-4 px-5">Certificate ID</th>
              <th className="py-4 px-5">Event</th>
              <th className="py-4 px-5">Issued Date</th>
              <th className="py-4 px-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F5F6]">
            {MOCK_CERTIFICATES.map((cert) => (
              <tr key={cert.id} className="hover:bg-[#F4F5F6]/40 transition-colors">
                <td className="py-4 px-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#17191C]">{cert.recipientName}</span>
                    <span className="text-[11px] text-[#8A9098]">{cert.recipientEmail}</span>
                  </div>
                </td>
                <td className="py-4 px-5 font-mono font-medium text-[#656B73]">
                  {cert.certificateNumber}
                </td>
                <td className="py-4 px-5 font-medium text-[#17191C]">
                  {cert.eventTitle}
                </td>
                <td className="py-4 px-5 text-[#656B73]">
                  {formatDate(cert.issuedAt)}
                </td>
                <td className="py-4 px-5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#17191C] bg-[#EAECEF] px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3 text-[#25292F]" />
                    Issued
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
