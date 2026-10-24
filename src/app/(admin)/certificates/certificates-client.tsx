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
    initialCertificates.length > 0 ? initialCertificates : (isPreview ? MOCK_CERTIFICATES : [])
  );
  const [events] = useState<EventItem[]>(
    initialEvents.length > 0 ? initialEvents : (isPreview ? MOCK_EVENTS : [])
  );
  const [participants] = useState<Participant[]>(
    initialParticipants.length > 0 ? initialParticipants : (isPreview ? MOCK_PARTICIPANTS : [])
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

  // Download a server-generated PDF for an issued certificate.
  const handleDownloadCertPdf = async (cert: CertificateRecord) => {
    setFeedbackMessage(null);

    try {
      const response = await fetch(
        `/api/certificates/${encodeURIComponent(cert.id)}/pdf`,
        {
          method: "GET",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to download certificate PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${cert.certificateNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : "Unable to download certificate PDF."
      );
    }
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
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-semibold ${
                isPreview
                  ? "border-[#E5E7EA] dark:border-[#30353A] text-[#656B73] dark:text-[#A6ADB5]"
                  : "border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
              }`}
            >
              {isPreview ? "Preview Mode" : "Production Live"}
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
        <div className="sketch-card-hero rounded-[20px] p-5 select-none cursor-default">
          <span className="text-xs font-semibold text-white/80">Total Verified & Issued</span>
          <div className="text-3xl font-bold text-white mt-2 tabular-nums">
            {certificates.length}
          </div>
          <span className="text-[11px] text-white/65 font-medium mt-1 block">
            {isPreview ? "Recorded in local preview ledger" : "Verified in production database"}
          </span>
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] text-[#17191C] dark:text-[#F1F2F3] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] hover:border-[#CBD0D6] dark:hover:border-[#48515E] motion-reduce:transition-none motion-reduce:transform-none select-none cursor-default">
          <span className="text-xs font-semibold text-[#5E646E] dark:text-white/80">Awaiting Issuance</span>
          <div className="text-3xl font-bold text-[#17191C] dark:text-white mt-2 tabular-nums">
            {eligibleAttendees.length}
          </div>
          <span className="text-[11px] text-[#656B73] dark:text-[#8A9098] mt-1 block">
            Checked-in attendees
          </span>
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] text-[#17191C] dark:text-[#F1F2F3] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] hover:border-[#CBD0D6] dark:hover:border-[#48515E] motion-reduce:transition-none motion-reduce:transform-none select-none cursor-default">
          <span className="text-xs font-semibold text-[#5E646E] dark:text-white/80">Delivery Reliability</span>
          <div className="text-3xl font-bold text-[#17191C] dark:text-white mt-2 tabular-nums">100%</div>
          <span className="text-[11px] text-[#8A9098] dark:text-[#8A9098] mt-1 block">
            {isPreview ? "Client Preview Simulation" : "Transactional email outbox"}
          </span>
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
              onClick={() => handleDownloadCertPdf(selectedCert)}
            >
              <Download className="h-4 w-4" />
              <span>Download Certificate PDF</span>
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
