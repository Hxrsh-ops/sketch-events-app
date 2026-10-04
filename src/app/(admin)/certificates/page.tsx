"use client";

import { FileBadge, Send, CheckCircle2, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_CERTIFICATES } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function CertificatesPage() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#191A1C]">
            Certificates
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
            Generate and dispatch cryptographically verifiable attendance certificates to validated attendees.
          </p>
        </div>

        <Button
          variant="forest"
          className="rounded-2xl gap-2 font-semibold shadow-md shadow-[#1B4332]/10"
          onClick={() => alert("Batch certificate generation job queued.")}
        >
          <Send className="h-4 w-4" />
          <span>Issue Eligible Batch</span>
        </Button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#EAE8E3] bg-white p-5 shadow-sm">
          <span className="text-xs text-[#929398]">Total Issued</span>
          <div className="text-2xl font-black text-[#191A1C] mt-1">540</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1">Verified on chain/record</span>
        </div>
        <div className="rounded-2xl border border-[#EAE8E3] bg-white p-5 shadow-sm">
          <span className="text-xs text-[#929398]">Pending Issuance</span>
          <div className="text-2xl font-black text-[#8F2635] mt-1">42</div>
          <span className="text-[11px] text-[#65666A] mt-1">Visual Storytelling Masterclass</span>
        </div>
        <div className="rounded-2xl border border-[#EAE8E3] bg-white p-5 shadow-sm">
          <span className="text-xs text-[#929398]">Delivery Success</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">100%</div>
          <span className="text-[11px] text-[#929398] mt-1">No delivery bounces reported</span>
        </div>
      </div>

      {/* Table of Issued Certificates */}
      <div className="overflow-hidden rounded-[22px] border border-[#EAE8E3] bg-white shadow-sm">
        <table className="w-full text-left text-xs text-[#191A1C]">
          <thead className="border-b border-[#EAE8E3] bg-[#FAF9F7] text-[11px] font-bold uppercase tracking-wider text-[#929398]">
            <tr>
              <th className="py-3.5 px-4">Recipient</th>
              <th className="py-3.5 px-4">Certificate ID</th>
              <th className="py-3.5 px-4">Event</th>
              <th className="py-3.5 px-4">Issued Date</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F4F1]">
            {MOCK_CERTIFICATES.map((cert) => (
              <tr key={cert.id} className="hover:bg-[#FAF9F7] transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#191A1C]">{cert.recipientName}</span>
                    <span className="text-[11px] text-[#929398]">{cert.recipientEmail}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono font-medium text-[#65666A]">
                  {cert.certificateNumber}
                </td>
                <td className="py-3.5 px-4 font-medium text-[#191A1C]">
                  {cert.eventTitle}
                </td>
                <td className="py-3.5 px-4 text-[#65666A]">
                  {formatDate(cert.issuedAt)}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    <CheckCircle2 className="h-3 w-3" />
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
