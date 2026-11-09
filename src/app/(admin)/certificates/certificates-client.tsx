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
import { EmptyState } from "@/components/feedback/feedback-states";
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
        throw new Error(
          `Certificate PDF generation failed (${response.status} ${response.statusText})`
        );
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `certificate-${cert.certificateNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      setFeedbackMessage(
        err?.message || "Failed to download certificate PDF. Please retry."
      );
    }
  };

  // Event dropdown options
  const eventOptions = [
    { value: "all", label: "All Events Combined" },
    ...events.map((e) => ({ value: e.id, label: e.title })),
  ];

  // Filtered certificates list
  const filteredCerts = certificates.filter((c) => {
    const matchesEvent = selectedEventId === "all" || c.eventId === selectedEventId;
    const matchesSearch =
      c.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEvent && matchesSearch;
  });

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto text-[#17191C]">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-[#858B93] uppercase">
            SKETCHHUB WORKSPACE / CERTIFICATES
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C]">
              Certificates &amp; Credentials
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-semibold bg-[#F6F7F8] border-[#E5E7E9] text-[#858B93]"
            >
              {isPreview ? "Preview Mode" : "Connected"}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#777E86]">
            Generate and dispatch verifiable attendance certificates to validated event attendees.
          </p>
        </div>

        <Button
          variant="default"
          className="rounded-full gap-2 text-xs sm:text-sm font-semibold shadow-sm h-9 sm:h-10 px-4 sm:px-5 bg-[#17191C] text-white hover:bg-[#25292F]"
          onClick={() => setIsBatchModalOpen(true)}
        >
          <Send className="h-4 w-4" />
          <span>Issue Eligible Batch ({eligibleAttendees.length})</span>
        </Button>
      </div>

      {/* Action Feedback Banner */}
      {feedbackMessage && (
        <div className="rounded-xl border border-[#E5E7E9] bg-[#F6F7F8] text-[#34383D] p-4 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#777E86]" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-[11px] text-[#858B93] hover:text-[#34383D] underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sketch-card-hero rounded-xl border border-[#E5E7E9] bg-white p-5 select-none cursor-default shadow-xs text-[#34383D]">
          <span className="text-xs font-medium text-[#858B93]">Total Verified &amp; Issued</span>
          <div className="text-3xl font-bold text-[#34383D] mt-2 tabular-nums">
            {certificates.length}
          </div>
          <span className="text-[11px] text-[#858B93] mt-1 block">
            {isPreview ? "Recorded in local preview ledger" : "Verified in production database"}
          </span>
        </div>
        <div className="rounded-xl border border-[#E5E7E9] bg-white text-[#34383D] p-5 shadow-xs transition-colors hover:border-[#D9DCE0] select-none cursor-default">
          <span className="text-xs font-medium text-[#858B93]">Awaiting Issuance</span>
          <div className="text-3xl font-bold text-[#34383D] mt-2 tabular-nums">
            {eligibleAttendees.length}
          </div>
          <span className="text-[11px] text-[#858B93] mt-1 block">
            Checked-in attendees
          </span>
        </div>
        <div className="rounded-xl border border-[#E5E7E9] bg-white text-[#34383D] p-5 shadow-xs transition-colors hover:border-[#D9DCE0] select-none cursor-default">
          <span className="text-xs font-medium text-[#858B93]">Delivery Reliability</span>
          <div className="text-3xl font-bold text-[#34383D] mt-2 tabular-nums">100%</div>
          <span className="text-[11px] text-[#858B93] mt-1 block">
            {isPreview ? "Client Preview Simulation" : "Transactional email outbox"}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#E5E7E9] bg-white p-3.5 shadow-xs">
        <div className="w-full sm:w-80">
          <CustomSelect
            options={eventOptions}
            value={selectedEventId}
            onChange={setSelectedEventId}
            className="text-xs"
          />
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777E86]" />
          <input
            type="text"
            placeholder="Search by recipient or certificate ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-[#E5E7E9] bg-[#F6F7F8] pl-9 pr-4 text-xs text-[#34383D] placeholder:text-[#A4A9AF] transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#858B93] focus:border-[#858B93]"
          />
        </div>
      </div>

      {/* Table of Issued Certificates */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7E9] bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E5E7E9] px-6 py-4 bg-[#F6F7F8]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#858B93]">
            Issued Certificate Records ({filteredCerts.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E5E7E9] bg-white text-[11px] font-semibold text-[#858B93]">
              <tr>
                <th className="py-3.5 pl-6 pr-4">Recipient</th>
                <th className="px-4 py-3.5">Certificate ID</th>
                <th className="px-4 py-3.5">Event</th>
                <th className="px-4 py-3.5">Issued Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7E9]">
              {filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <EmptyState
                      icon={Award}
                      title="No certificates found"
                      description={
                        searchQuery || selectedEventId !== "all"
                          ? "No certificate records match your filter or search criteria."
                          : "No certificates have been issued yet. Click 'Issue Eligible Batch' to generate credentials for checked-in attendees."
                      }
                      actionLabel={searchQuery || selectedEventId !== "all" ? "Reset Filters" : undefined}
                      onAction={() => {
                        setSearchQuery("");
                        setSelectedEventId("all");
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => (
                  <tr
                    key={cert.id}
                    onClick={() => setSelectedCert(cert)}
                    className="group cursor-pointer hover:bg-[#F8F9FA] transition-colors"
                  >
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#34383D] group-hover:underline">
                          {cert.recipientName}
                        </span>
                        <span className="text-[11px] text-[#858B93]">{cert.recipientEmail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-[#858B93]">
                      {cert.certificateNumber}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#34383D]">
                      {cert.eventTitle}
                    </td>
                    <td className="px-4 py-3.5 text-[#858B93]">
                      {formatDate(cert.issuedAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#34383D] bg-[#E3E5E8] border border-[#E5E7E9] px-2.5 py-0.5 rounded-md">
                        <CheckCircle2 className="h-3 w-3 text-[#777E86]" />
                        Verified
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right pr-6">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-lg border-[#E5E7E9] px-2.5 text-[11px] font-medium text-[#34383D] hover:bg-[#F6F7F8] gap-1"
                      >
                        <Eye className="h-3 w-3 text-[#777E86]" />
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
            <div className="rounded-xl border border-[#E5E7E9] bg-[#F6F7F8] p-6 shadow-xs text-center space-y-4">
              <div className="flex justify-between items-center border-b border-[#E5E7E9] pb-3">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-[#858B93]">
                  SKETCH CREDENTIAL ARCHIVE
                </span>
                <ShieldCheck className="h-4 w-4 text-[#777E86]" />
              </div>

              <div className="space-y-1 pt-2">
                <p className="text-[11px] text-[#858B93] uppercase tracking-wider">
                  Certificate of Participation
                </p>
                <h3 className="text-xl font-bold text-[#34383D]">
                  {selectedCert.recipientName}
                </h3>
                <p className="text-xs text-[#858B93]">has successfully completed and attended</p>
                <h4 className="text-sm font-semibold text-[#34383D]">{selectedCert.eventTitle}</h4>
              </div>

              <div className="flex items-center justify-between border-t border-[#E5E7E9] pt-4 text-left">
                <div>
                  <p className="text-[10px] text-[#858B93]">ISSUED ON</p>
                  <p className="text-xs font-semibold text-[#34383D]">
                    {formatDate(selectedCert.issuedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#858B93]">SERIAL IDENTIFIER</p>
                  <p className="text-xs font-mono font-bold text-[#34383D]">
                    {selectedCert.certificateNumber}
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="charcoal"
              className="w-full rounded-lg text-xs font-semibold gap-2 h-10 shadow-xs bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] hover:bg-[#D9DCE0]"
              onClick={() => handleDownloadCertPdf(selectedCert)}
            >
              <Download className="h-4 w-4 text-[#777E86]" />
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
          <p className="text-[#858B93] leading-relaxed">
            Generate verified certificates for all attendees who were checked in at the attendance desk.
          </p>

          <div className="rounded-xl border border-[#E5E7E9] bg-[#F6F7F8] p-4 space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#858B93]">
              Issuance Preview
            </span>
            <div className="flex justify-between font-medium">
              <span className="text-[#858B93]">Eligible Checked-In Attendees:</span>
              <strong className="text-[#34383D]">{eligibleAttendees.length}</strong>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-[#858B93]">Template:</span>
              <span className="text-[#858B93]">SKETCH Standard Monochrome SVG</span>
            </div>
          </div>

          <Button
            variant="charcoal"
            className="w-full rounded-lg text-xs font-semibold h-10 bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] hover:bg-[#D9DCE0]"
            onClick={() => handleBatchIssue(selectedEventId)}
          >
            Confirm &amp; Issue {eligibleAttendees.length} Certificates
          </Button>
        </div>
      </SlideOver>
    </div>
  );
}
