"use client";

import { useState } from "react";
import {
  Send,
  CheckCircle2,
  Award,
  Download,
  QrCode,
  ShieldCheck,
  Eye,
  Search,
  Users,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { SlideOver } from "@/components/ui/slide-over";
import { MOCK_CERTIFICATES, MOCK_EVENTS, MOCK_PARTICIPANTS } from "@/lib/mock-data";
import { CertificateRecord, EventItem, Participant } from "@/types";
import { formatDate } from "@/lib/utils";
import { batchIssueCertificatesAction } from "@/app/actions/certificate-actions";
import { getStoredCertificates } from "@/lib/registration-store";

interface CertificatesClientProps {
  initialCertificates: CertificateRecord[];
  initialEvents: EventItem[];
  initialParticipants: Participant[];
  isPreview: boolean;
}

export default function CertificatesClient({
  initialCertificates,
  initialEvents,
  initialParticipants,
  isPreview,
}: CertificatesClientProps) {
  const [certificates, setCertificates] = useState<CertificateRecord[]>(
    initialCertificates.length > 0 ? initialCertificates : MOCK_CERTIFICATES
  );
  const [events] = useState<EventItem[]>(
    initialEvents.length > 0 ? initialEvents : MOCK_EVENTS
  );
  const [participants] = useState<Participant[]>(
    initialParticipants.length > 0 ? initialParticipants : MOCK_PARTICIPANTS
  );
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Eligible participants for batch issuance (checked in attendees without certificates)
  const issuedRecipientEmails = new Set(certificates.map((c) => c.recipientEmail.toLowerCase()));
  const eligibleAttendees = participants.filter(
    (p) =>
      p.attendanceStatus === "checked_in" &&
      !issuedRecipientEmails.has(p.email.toLowerCase())
  );

  // Batch issue action via authoritative Server Action
  const handleBatchIssue = async (targetEventId: string) => {
    setIsIssuing(true);
    setFeedbackMessage(null);

    const res = await batchIssueCertificatesAction({
      eventId: targetEventId === "all" ? undefined : targetEventId,
    });

    setIsIssuing(false);
    setIsBatchModalOpen(false);

    if (!res.success) {
      setFeedbackMessage(res.message || "Failed to issue certificates.");
      return;
    }

    if (res.data && res.data.certificates.length > 0) {
      setCertificates((prev) => [...res.data.certificates, ...prev]);
      setFeedbackMessage(
        `Generated ${res.data.issuedCount} verified digital certificates and enqueued outbox delivery.`
      );
    } else {
      setFeedbackMessage(res.message || "No eligible attendees required certificates.");
    }
  };

  // Download SVG Certificate Preview
  const handleDownloadCertSvg = (cert: CertificateRecord) => {
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="100%" height="100%">
  <rect width="1000" height="700" fill="#FFFFFF" stroke="#17191C" stroke-width="8"/>
  <rect x="20" y="20" width="960" height="660" fill="none" stroke="#E5E7EA" stroke-width="2"/>

  <text x="500" y="100" font-family="sans-serif" font-size="20" font-weight="bold" letter-spacing="4" fill="#8A9098" text-anchor="middle">SKETCH EVENT OPERATIONS PLATFORM</text>
  <text x="500" y="160" font-family="sans-serif" font-size="36" font-weight="900" fill="#17191C" text-anchor="middle">CERTIFICATE OF PARTICIPATION</text>
  <text x="500" y="220" font-family="sans-serif" font-size="16" fill="#656B73" text-anchor="middle">THIS IS OFFICIALLY PRESENTED TO</text>

  <text x="500" y="300" font-family="sans-serif" font-size="34" font-weight="bold" fill="#17191C" text-anchor="middle">${cert.recipientName}</text>
  <line x1="300" y1="320" x2="700" y2="320" stroke="#17191C" stroke-width="1.5"/>

  <text x="500" y="370" font-family="sans-serif" font-size="16" fill="#656B73" text-anchor="middle">FOR SUCCESSFUL ATTENDANCE AND PARTICIPATION IN</text>
  <text x="500" y="420" font-family="sans-serif" font-size="24" font-weight="bold" fill="#17191C" text-anchor="middle">${cert.eventTitle}</text>

  <text x="250" y="550" font-family="sans-serif" font-size="14" fill="#8A9098" text-anchor="middle">ISSUED ON: ${new Date(cert.issuedAt).toLocaleDateString()}</text>
  <text x="750" y="550" font-family="sans-serif" font-size="14" font-weight="bold" fill="#17191C" text-anchor="middle">SERIAL: ${cert.certificateNumber}</text>

  <text x="500" y="640" font-family="sans-serif" font-size="12" fill="#8A9098" text-anchor="middle">AUTHENTICATED DIGITAL CREDENTIAL • CLIENT PREVIEW RUNTIME</text>
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cert.certificateNumber}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredCerts = certificates.filter((c) => {
    const matchesEvent = selectedEventId === "all" || c.eventId === selectedEventId;
    const matchesSearch =
      c.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.eventTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEvent && matchesSearch;
  });

  const eventOptions = [
    { value: "all", label: "All Events Combined" },
    ...events.map((e) => ({ value: e.id, label: e.title })),
  ];

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Verified Credentials & Certificates
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              Preview Mode
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#989EA7]">
            Generate and dispatch verifiable attendance certificates to validated event attendees.
          </p>
        </div>

        <Button
          variant="charcoal"
          className="rounded-full gap-2 text-xs sm:text-sm font-semibold shadow-sm h-9 sm:h-10 px-4 sm:px-5"
          onClick={() => setIsBatchModalOpen(true)}
        >
          <Send className="h-4 w-4" />
          <span>Issue Eligible Batch ({eligibleAttendees.length})</span>
        </Button>
      </div>

      {/* Action Feedback Banner */}
      {feedbackMessage && (
        <div className="rounded-2xl border border-[#17191C] dark:border-[#30353A] bg-[#17191C] dark:bg-[#22262A] text-white p-4 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-[11px] text-white/60 hover:text-white underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] motion-reduce:transition-none motion-reduce:transform-none select-none cursor-default">
          <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Total Verified & Issued</span>
          <div className="text-3xl font-bold text-[#17191C] dark:text-[#F1F2F3] mt-2 tabular-nums">
            {certificates.length}
          </div>
          <span className="text-[11px] text-[#656B73] dark:text-[#989EA7] font-medium mt-1 block">
            Recorded in local preview ledger
          </span>
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] motion-reduce:transition-none motion-reduce:transform-none select-none cursor-default">
          <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Awaiting Issuance</span>
          <div className="text-3xl font-bold text-[#17191C] dark:text-[#F1F2F3] mt-2 tabular-nums">
            {eligibleAttendees.length}
          </div>
          <span className="text-[11px] text-[#656B73] dark:text-[#989EA7] mt-1 block">
            Checked-in attendees
          </span>
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] motion-reduce:transition-none motion-reduce:transform-none select-none cursor-default">
          <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Delivery Reliability</span>
          <div className="text-3xl font-bold text-[#17191C] dark:text-[#F1F2F3] mt-2 tabular-nums">100%</div>
          <span className="text-[11px] text-[#8A9098] dark:text-[#656B73] mt-1 block">Client Preview Simulation</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 shadow-sm">
        <div className="w-full sm:w-80">
          <CustomSelect
            options={eventOptions}
            value={selectedEventId}
            onChange={setSelectedEventId}
            className="text-xs"
          />
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098] dark:text-[#656B73]" />
          <input
            type="text"
            placeholder="Search by recipient or certificate ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#151719] pl-9 pr-4 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] dark:placeholder:text-[#656B73] transition-all focus:bg-white dark:focus:bg-[#1B1E21] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
          />
        </div>
      </div>

      {/* Table of Issued Certificates */}
      <div className="overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] px-6 py-4 bg-[#F9FAFB] dark:bg-[#151719]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#656B73] dark:text-[#989EA7]">
            Issued Certificate Records ({filteredCerts.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[11px] font-semibold text-[#656B73] dark:text-[#989EA7]">
              <tr>
                <th className="py-3.5 pl-6 pr-4">Recipient</th>
                <th className="px-4 py-3.5">Certificate ID</th>
                <th className="px-4 py-3.5">Event</th>
                <th className="px-4 py-3.5">Issued Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F6] dark:divide-[#262A2E]">
              {filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#8A9098] dark:text-[#656B73]">
                    No certificate records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => (
                  <tr
                    key={cert.id}
                    onClick={() => setSelectedCert(cert)}
                    className="group cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#151719] transition-colors"
                  >
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3] group-hover:underline">
                          {cert.recipientName}
                        </span>
                        <span className="text-[11px] text-[#8A9098] dark:text-[#656B73]">{cert.recipientEmail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-[#656B73] dark:text-[#989EA7]">
                      {cert.certificateNumber}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#17191C] dark:text-[#F1F2F3]">
                      {cert.eventTitle}
                    </td>
                    <td className="px-4 py-3.5 text-[#656B73] dark:text-[#989EA7]">
                      {formatDate(cert.issuedAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#17191C] dark:text-[#111315] bg-[#F0F1F2] dark:bg-[#E8EAED] px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3 text-[#25292F] dark:text-[#111315]" />
                        Verified
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right pr-6">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full border-[#E5E7EA] dark:border-[#30353A] px-2.5 text-[11px] font-medium text-[#17191C] dark:text-[#F1F2F3] hover:bg-white dark:hover:bg-[#151719] gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Preview</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Live Canvas Preview SlideOver */}
      <SlideOver
        isOpen={Boolean(selectedCert)}
        onClose={() => setSelectedCert(null)}
        title="Certificate Verification"
        subtitle={selectedCert?.certificateNumber}
        widthClass="max-w-lg"
      >
        {selectedCert && (
          <div className="space-y-6">
            {/* Visual Certificate Card */}
            <div className="rounded-2xl border-2 border-[#17191C] dark:border-[#30353A] bg-white dark:bg-[#151719] p-6 shadow-md text-center space-y-4">
              <div className="flex justify-between items-center border-b border-[#E5E7EA] dark:border-[#30353A] pb-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#8A9098] dark:text-[#656B73]">
                  SKETCH CREDENTIAL ARCHIVE
                </span>
                <ShieldCheck className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
              </div>

              <div className="space-y-1 pt-2">
                <p className="text-[11px] text-[#656B73] dark:text-[#989EA7] uppercase tracking-wider">
                  Certificate of Participation
                </p>
                <h3 className="text-xl font-extrabold text-[#17191C] dark:text-[#F1F2F3]">
                  {selectedCert.recipientName}
                </h3>
                <p className="text-xs text-[#656B73] dark:text-[#989EA7]">has successfully completed and attended</p>
                <h4 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">{selectedCert.eventTitle}</h4>
              </div>

              <div className="flex items-center justify-between border-t border-[#E5E7EA] dark:border-[#30353A] pt-4 text-left">
                <div>
                  <p className="text-[10px] text-[#8A9098] dark:text-[#656B73]">ISSUED ON</p>
                  <p className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                    {formatDate(selectedCert.issuedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#8A9098] dark:text-[#656B73]">SERIAL IDENTIFIER</p>
                  <p className="text-xs font-mono font-bold text-[#17191C] dark:text-[#F1F2F3]">
                    {selectedCert.certificateNumber}
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="charcoal"
              className="w-full rounded-full text-xs font-semibold gap-2 h-10 shadow-sm"
              onClick={() => handleDownloadCertSvg(selectedCert)}
            >
              <Download className="h-4 w-4" />
              <span>Download Printable Vector SVG</span>
            </Button>
          </div>
        )}
      </SlideOver>

      {/* Batch Issuance Modal SlideOver */}
      <SlideOver
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Batch Certificate Dispatch"
        subtitle="Issue credentials to verified attendees"
        widthClass="max-w-md"
      >
        <div className="space-y-5 text-xs">
          <p className="text-[#656B73] dark:text-[#989EA7] leading-relaxed">
            Generate verified certificates for all attendees who were checked in at the attendance desk.
          </p>

          <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">
              Issuance Preview
            </span>
            <div className="flex justify-between font-medium">
              <span className="text-[#656B73] dark:text-[#989EA7]">Eligible Checked-In Attendees:</span>
              <strong className="text-[#17191C] dark:text-[#F1F2F3]">{eligibleAttendees.length}</strong>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-[#656B73] dark:text-[#989EA7]">Template:</span>
              <span className="text-[#656B73] dark:text-[#989EA7]">SKETCH Standard Monochrome SVG</span>
            </div>
          </div>

          <Button
            variant="charcoal"
            className="w-full rounded-full text-xs font-semibold h-10"
            onClick={() => handleBatchIssue(selectedEventId)}
          >
            Confirm & Issue {eligibleAttendees.length} Certificates
          </Button>
        </div>
      </SlideOver>
    </div>
  );
}
