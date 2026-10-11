"use client";

import { useState, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  FileCode,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Users,
  Award,
  Clock,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  MOCK_EVENTS,
  MOCK_PARTICIPANTS,
  MOCK_TEAMS,
  MOCK_CERTIFICATES,
  MOCK_RECENT_ACTIVITY,
} from "@/lib/mock-data";
import {
  getStoredEvents,
  getAllParticipants,
  getAllTeams,
} from "@/lib/registration-store";

export default function ExportsPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [lastExportMessage, setLastExportMessage] = useState<string | null>(null);

  // Load live data from preview store
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [participants, setParticipants] = useState(MOCK_PARTICIPANTS);
  const [teams, setTeams] = useState(MOCK_TEAMS);

  useEffect(() => {
    const syncData = () => {
      setEvents(getStoredEvents());
      setParticipants(getAllParticipants());
      setTeams(getAllTeams());
    };
    syncData();

    window.addEventListener("sketch_store_updated", syncData);
    return () => window.removeEventListener("sketch_store_updated", syncData);
  }, []);

  // Helper to trigger browser file download
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to escape CSV cell
  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  // 1. Export Attendance & Check-in Roster CSV
  const exportAttendanceRoster = () => {
    const attendees =
      selectedEventId === "all"
        ? participants
        : participants.filter((p) => p.eventId === selectedEventId);

    const headers = [
      "Registration ID",
      "Full Name",
      "Email Address",
      "Phone",
      "Event ID",
      "Event Title",
      "Department",
      "Year",
      "Team Name",
      "Registration Status",
      "Attendance Status",
      "Checked-In Timestamp",
      "QR Credential ID",
    ];

    const rows = attendees.map((p) => [
      escapeCsv(p.registrationId),
      escapeCsv(p.name),
      escapeCsv(p.email),
      escapeCsv(p.phone || ""),
      escapeCsv(p.eventId),
      escapeCsv(p.eventTitle),
      escapeCsv(p.department || ""),
      escapeCsv(p.year || ""),
      escapeCsv(p.teamName || "Individual"),
      escapeCsv(p.status),
      escapeCsv(p.attendanceStatus),
      escapeCsv(p.checkedInAt || "N/A"),
      escapeCsv(p.qrCredentialId),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const filename = `sketch_attendance_roster_${selectedEventId}_${Date.now()}.csv`;
    triggerDownload(csvContent, filename, "text/csv;charset=utf-8;");
    setLastExportMessage(`Successfully exported ${attendees.length} attendance records to "${filename}".`);
  };

  // 2. Export Participants Directory (CSV & JSON) with Custom Form Responses
  const exportParticipants = (format: "csv" | "json") => {
    const attendees =
      selectedEventId === "all"
        ? participants
        : participants.filter((p) => p.eventId === selectedEventId);

    if (format === "json") {
      const jsonContent = JSON.stringify(
        {
          exportMeta: {
            platform: "SketchHUB Event Operations Platform",
            mode: "Client Preview Export",
            exportedAt: new Date().toISOString(),
            eventScope: selectedEventId,
            recordCount: attendees.length,
          },
          data: attendees.map((p) => ({
            id: p.id,
            registrationId: p.registrationId,
            name: p.name,
            email: p.email,
            phone: p.phone || null,
            department: p.department || null,
            year: p.year || null,
            eventId: p.eventId,
            eventTitle: p.eventTitle,
            teamId: p.teamId || null,
            teamName: p.teamName || "Individual",
            registeredAt: p.registeredAt,
            attendanceStatus: p.attendanceStatus,
            checkedInAt: p.checkedInAt || null,
            qrCredentialId: p.qrCredentialId,
            customResponses: p.customAnswers || {},
          })),
        },
        null,
        2
      );
      const filename = `sketch_participants_${selectedEventId}_${Date.now()}.json`;
      triggerDownload(jsonContent, filename, "application/json");
      setLastExportMessage(`Successfully exported ${attendees.length} participant records to "${filename}".`);
    } else {
      // Collect all unique custom response field keys across selected attendees
      const customFieldKeysSet = new Set<string>();
      attendees.forEach((p) => {
        if (p.customAnswers) {
          Object.keys(p.customAnswers).forEach((k) => customFieldKeysSet.add(k));
        }
      });
      const customFieldKeys = Array.from(customFieldKeysSet);

      const baseHeaders = [
        "ID",
        "Registration ID",
        "Name",
        "Email",
        "Phone",
        "Department",
        "Academic Year",
        "Event ID",
        "Event Title",
        "Team ID",
        "Team Name",
        "Registered At",
        "Attendance Status",
      ];

      // Add custom response columns with clean header labels
      const customHeaders = customFieldKeys.map((key) => {
        const cleanLabel = key
          .replace(/^f_[a-z]+_/, "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return `[Response] ${cleanLabel}`;
      });

      const allHeaders = [...baseHeaders, ...customHeaders];

      const rows = attendees.map((p) => {
        const baseValues = [
          escapeCsv(p.id),
          escapeCsv(p.registrationId),
          escapeCsv(p.name),
          escapeCsv(p.email),
          escapeCsv(p.phone || ""),
          escapeCsv(p.department || ""),
          escapeCsv(p.year || ""),
          escapeCsv(p.eventId),
          escapeCsv(p.eventTitle),
          escapeCsv(p.teamId || ""),
          escapeCsv(p.teamName || "Individual"),
          escapeCsv(p.registeredAt),
          escapeCsv(p.attendanceStatus),
        ];

        const customValues = customFieldKeys.map((key) => {
          const val = p.customAnswers ? p.customAnswers[key] : undefined;
          if (Array.isArray(val)) return escapeCsv(val.join("; "));
          if (typeof val === "boolean") return escapeCsv(val ? "Yes" : "No");
          return escapeCsv(val !== undefined && val !== null ? val : "");
        });

        return [...baseValues, ...customValues];
      });

      const csvContent = [allHeaders.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const filename = `sketch_participants_${selectedEventId}_${Date.now()}.csv`;
      triggerDownload(csvContent, filename, "text/csv;charset=utf-8;");
      setLastExportMessage(`Successfully exported ${attendees.length} participant records to "${filename}".`);
    }
  };

  // 3. Export Teams & Rosters CSV
  const exportTeams = () => {
    const targetTeams =
      selectedEventId === "all"
        ? teams
        : teams.filter((t) => t.eventId === selectedEventId);

    const headers = [
      "Team ID",
      "Team Name",
      "Event ID",
      "Event Title",
      "Captain Name",
      "Captain Email",
      "Current Members",
      "Max Capacity",
      "Status",
      "Registered At",
    ];

    const rows = teams.map((t) => [
      escapeCsv(t.id),
      escapeCsv(t.name),
      escapeCsv(t.eventId),
      escapeCsv(t.eventTitle),
      escapeCsv(t.captainName),
      escapeCsv(t.captainEmail),
      escapeCsv(t.memberCount),
      escapeCsv(t.maxMembers),
      escapeCsv(t.status),
      escapeCsv(t.registeredAt),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const filename = `sketch_teams_roster_${Date.now()}.csv`;
    triggerDownload(csvContent, filename, "text/csv;charset=utf-8;");
    setLastExportMessage(`Successfully exported ${teams.length} team records to "${filename}".`);
  };

  // 4. Export Certificates Log CSV
  const exportCertificates = () => {
    const certs =
      selectedEventId === "all"
        ? MOCK_CERTIFICATES
        : MOCK_CERTIFICATES.filter((c) => c.eventId === selectedEventId);

    const headers = [
      "Certificate ID",
      "Certificate Number",
      "Recipient Name",
      "Recipient Email",
      "Event ID",
      "Event Title",
      "Issued Timestamp",
      "Status",
    ];

    const rows = certs.map((c) => [
      escapeCsv(c.id),
      escapeCsv(c.certificateNumber),
      escapeCsv(c.recipientName),
      escapeCsv(c.recipientEmail),
      escapeCsv(c.eventId),
      escapeCsv(c.eventTitle),
      escapeCsv(c.issuedAt),
      escapeCsv(c.status),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const filename = `sketch_certificates_log_${Date.now()}.csv`;
    triggerDownload(csvContent, filename, "text/csv;charset=utf-8;");
    setLastExportMessage(`Successfully exported ${certs.length} certificate records to "${filename}".`);
  };

  // 5. Export Audit Trail JSON
  const exportAuditTrail = () => {
    const jsonContent = JSON.stringify(
      {
        exportMeta: {
          platform: "SketchHUB Event Operations Platform",
          mode: "Client Preview Audit Trail",
          exportedAt: new Date().toISOString(),
          recordCount: MOCK_RECENT_ACTIVITY.length,
        },
        logs: MOCK_RECENT_ACTIVITY,
      },
      null,
      2
    );
    const filename = `sketch_audit_trail_${Date.now()}.json`;
    triggerDownload(jsonContent, filename, "application/json");
    setLastExportMessage(`Successfully exported ${MOCK_RECENT_ACTIVITY.length} audit records to "${filename}".`);
  };

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
              Exports & Data Reports
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              Preview Mode
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#989EA7]">
            Generate client-side CSV rosters, structured JSON archives, and compliance logs from current preview dataset.
          </p>
        </div>

        {/* Global Export Scope Filter */}
        <div className="w-full sm:w-72">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73] mb-1">
            Export Event Scope
          </label>
          <CustomSelect
            options={eventOptions}
            value={selectedEventId}
            onChange={setSelectedEventId}
          />
        </div>
      </div>

      {/* Success Receipt Banner */}
      {lastExportMessage && (
        <div className="rounded-2xl border border-[#17191C] dark:border-[#30353A] bg-[#17191C] dark:bg-[#22262A] text-white p-4 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
            <span className="font-medium">{lastExportMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setLastExportMessage(null)}
            className="text-[11px] text-white/60 hover:text-white underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Privacy Notice Banner */}
      <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 text-xs text-[#17191C] dark:text-[#F1F2F3] flex items-start gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <ShieldAlert className="h-5 w-5 text-[#25292F] dark:text-[#E8EAED] shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">Privacy & Data Integrity Notice:</strong>
          <p className="mt-0.5 text-[#656B73] dark:text-[#989EA7] leading-relaxed">
            All files are generated client-side from the active preview dataset. Generated files are formatted with RFC 4180 compliant CSV quoting and ISO 8601 timestamps. No external database writes or third-party tracking occur.
          </p>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Template 1: Attendance Roster */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all duration-200 ease-out hover:border-[#CBD0D6] dark:hover:border-[#4A515A] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] motion-reduce:transition-none motion-reduce:transform-none">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#151719] text-[#25292F] dark:text-[#E8EAED]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#F0F1F2] dark:bg-[#151719] px-2.5 py-0.5 text-[10px] font-semibold text-[#656B73] dark:text-[#989EA7]">
                CSV
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Attendance & Check-in Roster
            </h3>
            <p className="text-xs text-[#656B73] dark:text-[#989EA7] mt-1.5 leading-relaxed">
              Complete check-in records with verification timestamps, attendance statuses, departments, and QR pass identifiers for the selected event scope.
            </p>
          </div>

          <div className="border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3 flex items-center justify-between">
            <span className="text-[11px] text-[#8A9098] dark:text-[#656B73]">
              Scope: {selectedEventId === "all" ? "All Events" : "Selected Event"}
            </span>
            <Button
              variant="charcoal"
              size="sm"
              className="rounded-full text-xs font-semibold gap-1.5"
              onClick={exportAttendanceRoster}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV</span>
            </Button>
          </div>
        </div>

        {/* Template 2: Participant Directory */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all duration-200 ease-out hover:border-[#CBD0D6] dark:hover:border-[#4A515A] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] motion-reduce:transition-none motion-reduce:transform-none">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#151719] text-[#25292F] dark:text-[#E8EAED]">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex gap-1.5">
                <span className="rounded-full bg-[#F0F1F2] dark:bg-[#151719] px-2.5 py-0.5 text-[10px] font-semibold text-[#656B73] dark:text-[#989EA7]">
                  CSV
                </span>
                <span className="rounded-full bg-[#F0F1F2] dark:bg-[#151719] px-2.5 py-0.5 text-[10px] font-semibold text-[#656B73] dark:text-[#989EA7]">
                  JSON
                </span>
              </div>
            </div>
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Registered Participants Directory
            </h3>
            <p className="text-xs text-[#656B73] dark:text-[#989EA7] mt-1.5 leading-relaxed">
              Full student registration archive with names, university email addresses, departments, academic years, and team affiliations.
            </p>
          </div>

          <div className="border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3 flex items-center justify-between">
            <span className="text-[11px] text-[#8A9098] dark:text-[#656B73]">
              <span className="font-mono tabular-nums font-semibold">{participants.length}</span> total preview records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold gap-1"
                onClick={() => exportParticipants("json")}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>JSON</span>
              </Button>
              <Button
                variant="charcoal"
                size="sm"
                className="rounded-full text-xs font-semibold gap-1"
                onClick={() => exportParticipants("csv")}
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Template 3: Teams & Rosters */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all duration-200 ease-out hover:border-[#CBD0D6] dark:hover:border-[#4A515A] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] motion-reduce:transition-none motion-reduce:transform-none">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#151719] text-[#25292F] dark:text-[#E8EAED]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#F0F1F2] dark:bg-[#151719] px-2.5 py-0.5 text-[10px] font-semibold text-[#656B73] dark:text-[#989EA7]">
                CSV
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Teams & Roster Registry
            </h3>
            <p className="text-xs text-[#656B73] dark:text-[#989EA7] mt-1.5 leading-relaxed">
              Hackathon and design sprint team rosters, captain contacts, slot capacity, and roster completeness indicators.
            </p>
          </div>

          <div className="border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3 flex items-center justify-between">
            <span className="text-[11px] text-[#8A9098] dark:text-[#656B73]">
              <span className="font-mono tabular-nums font-semibold">{teams.length}</span> team records
            </span>
            <Button
              variant="charcoal"
              size="sm"
              className="rounded-full text-xs font-semibold gap-1.5"
              onClick={exportTeams}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV</span>
            </Button>
          </div>
        </div>

        {/* Template 4: Certificates Ledger */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all duration-200 ease-out hover:border-[#CBD0D6] dark:hover:border-[#4A515A] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] motion-reduce:transition-none motion-reduce:transform-none">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#151719] text-[#25292F] dark:text-[#E8EAED]">
                <Award className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#F0F1F2] dark:bg-[#151719] px-2.5 py-0.5 text-[10px] font-semibold text-[#656B73] dark:text-[#989EA7]">
                CSV
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Certificate Issuance & Verification Log
            </h3>
            <p className="text-xs text-[#656B73] dark:text-[#989EA7] mt-1.5 leading-relaxed">
              Issued credentials serials, recipient names, event titles, and issuance dates for verified participants.
            </p>
          </div>

          <div className="border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3 flex items-center justify-between">
            <span className="text-[11px] text-[#8A9098] dark:text-[#656B73]">
              {MOCK_CERTIFICATES.length} issued credentials
            </span>
            <Button
              variant="charcoal"
              size="sm"
              className="rounded-full text-xs font-semibold gap-1.5"
              onClick={exportCertificates}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV</span>
            </Button>
          </div>
        </div>

        {/* Template 5: System Audit Trail */}
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all duration-200 ease-out hover:border-[#CBD0D6] dark:hover:border-[#4A515A] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] motion-reduce:transition-none motion-reduce:transform-none md:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#151719] text-[#25292F] dark:text-[#E8EAED]">
                <Clock className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-[#F0F1F2] dark:bg-[#151719] px-2.5 py-0.5 text-[10px] font-semibold text-[#656B73] dark:text-[#989EA7]">
                JSON
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Administrative Audit Log Archive
            </h3>
            <p className="text-xs text-[#656B73] dark:text-[#989EA7] mt-1.5 leading-relaxed">
              Complete JSON log containing actor identities, action descriptors, target entities, and payloads for security and compliance reviews.
            </p>
          </div>

          <div className="border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3 flex items-center justify-between">
            <span className="text-[11px] text-[#8A9098] dark:text-[#656B73]">
              {MOCK_RECENT_ACTIVITY.length} recent activity events
            </span>
            <Button
              variant="charcoal"
              size="sm"
              className="rounded-full text-xs font-semibold gap-1.5"
              onClick={exportAuditTrail}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Export Audit JSON</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
