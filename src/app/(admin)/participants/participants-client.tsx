"use client";

import { useState } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Download,
  Copy,
  Check,
  Eye,
  Undo2,
  Users,
  FileText,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { CustomSelect } from "@/components/ui/custom-select";
import { SlideOver } from "@/components/ui/slide-over";
import { Participant, EventItem } from "@/types";
import { formatDate } from "@/lib/utils";
import { toggleAttendanceAction } from "@/app/actions/participant-actions";

interface ParticipantsClientProps {
  initialParticipants: Participant[];
  initialEvents: EventItem[];
  isPreview: boolean;
  initialError?: string | null;
}

export default function ParticipantsClient({
  initialParticipants,
  initialEvents,
  isPreview,
  initialError,
}: ParticipantsClientProps) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Copy Registration ID to clipboard
  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Toggle Check In via Server Action
  const handleToggleCheckIn = async (participant: Participant, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isUpdatingAttendance) return;

    setIsUpdatingAttendance(true);
    setActionError(null);

    const nextStatus = participant.attendanceStatus === "checked_in" ? "not_checked_in" : "checked_in";

    try {
      const res = await toggleAttendanceAction({
        registrationIdOrUid: participant.registrationId || participant.id,
        targetStatus: nextStatus,
        eventId: participant.eventId,
      });

      if (!res.success) {
        setActionError(res.message);
        return;
      }

      // Update state locally with authoritative response
      const updatedStatus = res.data.attendanceStatus;
      const updatedCheckedInAt = res.data.checkedInAt;

      setParticipants((prev) =>
        prev.map((p) => {
          if (p.id === participant.id || p.registrationId === participant.registrationId) {
            return {
              ...p,
              attendanceStatus: updatedStatus,
              checkedInAt: updatedCheckedInAt,
            };
          }
          return p;
        })
      );

      if (selectedParticipant && (selectedParticipant.id === participant.id || selectedParticipant.registrationId === participant.registrationId)) {
        setSelectedParticipant((prev) =>
          prev
            ? {
                ...prev,
                attendanceStatus: updatedStatus,
                checkedInAt: updatedCheckedInAt,
              }
            : null
        );
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update check-in status.");
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  // CSV Export for filtered attendees
  const handleExportCsv = () => {
    const headers = [
      "Registration ID",
      "Full Name",
      "Email",
      "Phone",
      "Event Title",
      "Department",
      "Academic Year",
      "Team Name",
      "Registration Status",
      "Attendance Status",
      "Checked In At",
    ];

    const escapeCsv = (val: unknown) => {
      let str = String(val ?? "");
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const rows = filteredParticipants.map((p) => [
      escapeCsv(p.registrationId),
      escapeCsv(p.name),
      escapeCsv(p.email),
      escapeCsv(p.phone || ""),
      escapeCsv(p.eventTitle),
      escapeCsv(p.department || "General"),
      escapeCsv(p.year || "N/A"),
      escapeCsv(p.teamName || "Individual"),
      escapeCsv(p.status),
      escapeCsv(p.attendanceStatus),
      escapeCsv(p.checkedInAt || "N/A"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sketch_attendees_${selectedEventId}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredParticipants = participants.filter((p) => {
    const matchesEvent = selectedEventId === "all" || p.eventId === selectedEventId;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "checked_in" && p.attendanceStatus === "checked_in") ||
      (activeTab === "registered" && p.attendanceStatus === "not_checked_in");
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.registrationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.department && p.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.teamName && p.teamName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesEvent && matchesTab && matchesSearch;
  });

  const totalAttendees = participants.length;
  const checkedInTotal = participants.filter((p) => p.attendanceStatus === "checked_in").length;
  const pendingTotal = totalAttendees - checkedInTotal;

  const eventOptions = [
    { value: "all", label: "All Events Combined" },
    ...initialEvents.map((e) => ({ value: e.id, label: e.title })),
  ];

  const filterTabs = [
    { id: "all", label: `All (${filteredParticipants.length})` },
    { id: "registered", label: `Pending Arrival` },
    { id: "checked_in", label: `Checked In` },
  ];

  if (initialError) {
    return (
      <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto min-w-0">
        <div className="rounded-[20px] border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 p-12 text-center shadow-sm max-w-xl mx-auto space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-red-900 dark:text-red-200">
              Database Infrastructure Failure
            </h1>
            <p className="text-xs text-red-700/80 dark:text-red-300/80 leading-relaxed">
              Failed to load attendee records from PostgreSQL:
            </p>
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-white/80 dark:bg-[#111315]/80 p-3 text-xs font-mono text-red-800 dark:text-red-300 text-left overflow-x-auto">
              {initialError}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="rounded-full text-xs font-semibold px-4 gap-1.5 border-red-200 dark:border-red-800/40"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry Request</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Participants & Passes
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              {isPreview ? "Preview Mode" : "PostgreSQL Live"}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#989EA7]">
            Comprehensive attendee directory, QR credentials, department affiliations, and live check-in statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold gap-1.5 h-9"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Filtered CSV</span>
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-bold underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sketch-card-hero rounded-[20px] p-4 flex items-center justify-between select-none cursor-default">
          <div>
            <span className="text-xs font-semibold text-white/80">Total Registrations</span>
            <div className="text-2xl font-extrabold text-white mt-1 tabular-nums">{totalAttendees}</div>
          </div>
          <Users className="h-5 w-5 text-white/80" />
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] text-[#17191C] dark:text-[#F1F2F3] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] hover:border-[#CBD0D6] dark:hover:border-[#48515E] flex items-center justify-between select-none cursor-default">
          <div>
            <span className="text-xs font-semibold text-[#5E646E] dark:text-white/80">Verified Checked-In</span>
            <div className="text-2xl font-extrabold text-[#17191C] dark:text-white mt-1 tabular-nums">{checkedInTotal}</div>
          </div>
          <CheckCircle2 className="h-5 w-5 text-[#25292F] dark:text-white/90" />
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] text-[#17191C] dark:text-[#F1F2F3] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] hover:border-[#CBD0D6] dark:hover:border-[#48515E] flex items-center justify-between select-none cursor-default">
          <div>
            <span className="text-xs font-semibold text-[#5E646E] dark:text-white/80">Pending Check-in</span>
            <div className="text-2xl font-extrabold text-[#17191C] dark:text-white mt-1 tabular-nums">{pendingTotal}</div>
          </div>
          <Clock className="h-5 w-5 text-[#828892] dark:text-white/70" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <AnimatedTabs
            tabs={filterTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            layoutId="participantsFilterPill"
          />

          <div className="w-full sm:w-60">
            <CustomSelect
              options={eventOptions}
              value={selectedEventId}
              onChange={setSelectedEventId}
              className="text-xs"
            />
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098] dark:text-[#656B73]" />
          <input
            type="text"
            placeholder="Search by name, ID, email, team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#151719] pl-9 pr-4 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] dark:placeholder:text-[#656B73] transition-all focus:bg-white dark:focus:bg-[#1B1E21] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
          />
        </div>
      </div>

      {/* Participants Table */}
      <div className="overflow-hidden rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] text-[11px] font-semibold text-[#656B73] dark:text-[#989EA7]">
              <tr>
                <th className="py-3.5 pl-6 pr-4">Attendee</th>
                <th className="px-4 py-3.5">Registration ID</th>
                <th className="px-4 py-3.5">Event</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Team</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F6] dark:divide-[#262A2E]">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#8A9098] dark:text-[#656B73]">
                    No participants match the selected filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const isCheckedIn = p.attendanceStatus === "checked_in";

                  return (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      role="row"
                      onClick={() => setSelectedParticipant(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedParticipant(p);
                        }
                      }}
                      className="group cursor-pointer transition-colors duration-150 ease-out hover:bg-[#F4F5F6] dark:hover:bg-[#22262A] focus-visible:outline-none focus-visible:bg-[#F4F5F6] dark:focus-visible:bg-[#22262A] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED]"
                    >
                      <td className="py-3 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#30353A] text-white dark:text-[#F1F2F3] font-bold text-[10px]">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[15px] font-semibold text-[#17191C] dark:text-[#F1F2F3] group-hover:underline truncate tracking-[-0.01em] leading-snug">
                              {p.name}
                            </span>
                            <span className="font-sans text-[12.5px] font-normal text-[#656B73] dark:text-[#989EA7] truncate max-w-[220px] mt-0.5" title={p.email}>
                              {p.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums tracking-tight text-[#7D858F] dark:text-[#8D949E] whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="select-all">{p.registrationId}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(p.registrationId, e)}
                            className="text-[#8A9098] dark:text-[#656B73] hover:text-[#17191C] dark:hover:text-[#F1F2F3] p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            aria-label={`Copy ${p.registrationId}`}
                          >
                            {copiedId === p.registrationId ? (
                              <Check className="h-3 w-3 text-[#17191C] dark:text-[#E8EAED]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-[13px] font-medium text-[#17191C] dark:text-[#F1F2F3] max-w-[180px] truncate">
                        {p.eventTitle}
                      </td>

                      <td className="px-4 py-3 text-[13px] text-[#656B73] dark:text-[#989EA7]">
                        {p.department || "General"}
                      </td>

                      <td className="px-4 py-3 text-[#656B73] dark:text-[#989EA7]">
                        {p.teamName ? (
                          <span className="rounded bg-[#F0F1F2] dark:bg-[#151719] px-2 py-0.5 text-[11px] font-medium text-[#17191C] dark:text-[#F1F2F3]">
                            {p.teamName}
                          </span>
                        ) : (
                          <span className="text-[#8A9098] dark:text-[#656B73] italic text-xs">Individual</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#17191C] dark:text-[#111315] bg-[#F0F1F2] dark:bg-[#E8EAED] px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3 text-[#17191C] dark:text-[#111315]" />
                            Checked In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8A9098] dark:text-[#989EA7] bg-[#F4F5F6] dark:bg-[#151719] px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3 text-[#8A9098] dark:text-[#989EA7]" />
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedParticipant(p)}
                            className="h-7 w-7 p-0 rounded-full text-[#656B73] dark:text-[#989EA7] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
                            aria-label="Inspect pass"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={isCheckedIn ? "outline" : "charcoal"}
                            size="sm"
                            disabled={isUpdatingAttendance}
                            onClick={(e) => handleToggleCheckIn(p, e)}
                            className="h-7 rounded-full text-[11px] px-2.5 font-semibold"
                          >
                            {isCheckedIn ? "Undo" : "Check In"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Participant Pass Inspector SlideOver */}
      <SlideOver
        isOpen={Boolean(selectedParticipant)}
        onClose={() => setSelectedParticipant(null)}
        title="Attendee Digital Credential"
        subtitle={selectedParticipant?.registrationId}
        widthClass="max-w-md"
      >
        {selectedParticipant && (
          <div className="space-y-6">
            {/* Visual Pass Card */}
            <div className="rounded-2xl border border-[#17191C] dark:border-[#30353A] bg-[#17191C] text-white p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                  SKETCH OFFICIAL PASS
                </span>
                <Badge
                  variant="secondary"
                  className={
                    selectedParticipant.attendanceStatus === "checked_in"
                      ? "bg-white text-[#17191C] font-bold text-[10px]"
                      : "bg-white/10 text-white border-white/20 text-[10px]"
                  }
                >
                  {selectedParticipant.attendanceStatus === "checked_in" ? "CHECKED IN" : "VALID ENTRY"}
                </Badge>
              </div>

              {/* QR Representation */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white text-[#17191C]">
                <div className="w-32 h-32 border-2 border-[#17191C] p-2 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-6 h-6 bg-[#17191C] p-0.5"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-[#17191C]" /></div></div>
                    <div className="w-6 h-6 bg-[#17191C] p-0.5"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-[#17191C]" /></div></div>
                  </div>
                  <div className="text-[8px] font-mono font-bold text-center">SKETCH PASS</div>
                  <div className="flex justify-between items-end">
                    <div className="w-6 h-6 bg-[#17191C] p-0.5"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-[#17191C]" /></div></div>
                    <div className="w-4 h-4 border border-dashed border-[#17191C]" />
                  </div>
                </div>
                <span className="mt-1.5 font-mono text-xs font-bold text-[#17191C]">
                  {selectedParticipant.registrationId}
                </span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white">{selectedParticipant.name}</h3>
                <p className="text-xs text-white/70">{selectedParticipant.eventTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/10 pt-3">
                <div>
                  <span className="text-white/50 text-[10px] uppercase font-mono block">Department</span>
                  <span className="text-white/90">{selectedParticipant.department || "General"}</span>
                </div>
                <div>
                  <span className="text-white/50 text-[10px] uppercase font-mono block">Team</span>
                  <span className="text-white/90">{selectedParticipant.teamName || "Individual"}</span>
                </div>
              </div>
            </div>

            {/* Profile & Contact Details */}
            <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                <span className="text-[#656B73] dark:text-[#989EA7] flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </span>
                <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">{selectedParticipant.email}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                <span className="text-[#656B73] dark:text-[#989EA7] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone Number
                </span>
                <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">{selectedParticipant.phone || "Not provided"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F1F2] dark:border-[#262A2E]">
                <span className="text-[#656B73] dark:text-[#989EA7] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Registered Date
                </span>
                <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">{formatDate(selectedParticipant.registeredAt)}</span>
              </div>
              {selectedParticipant.checkedInAt && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#656B73] dark:text-[#989EA7] flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified At
                  </span>
                  <span className="font-medium text-[#17191C] dark:text-[#F1F2F3]">{formatDate(selectedParticipant.checkedInAt)}</span>
                </div>
              )}
            </div>

            {/* Custom Registration Form Responses */}
            {selectedParticipant.customAnswers && Object.keys(selectedParticipant.customAnswers).length > 0 && (
              <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#F0F1F2] dark:border-[#262A2E] pb-2">
                  <span className="font-bold text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Custom Registration Responses
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {Object.keys(selectedParticipant.customAnswers).length} fields
                  </Badge>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 divide-y divide-[#F0F1F2]/60 dark:divide-[#262A2E]/60">
                  {Object.entries(selectedParticipant.customAnswers).map(([key, value]) => {
                    let displayVal = "—";
                    if (value !== undefined && value !== null && value !== "") {
                      if (Array.isArray(value)) displayVal = value.join(", ");
                      else if (typeof value === "boolean") displayVal = value ? "Yes" : "No";
                      else displayVal = String(value);
                    }
                    const formattedKey = key
                      .replace(/^f_[a-z]+_/i, "")
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase());

                    return (
                      <div
                        key={key}
                        className="flex flex-col pt-1.5 first:pt-0 gap-0.5"
                      >
                        <span className="text-[11px] font-mono text-[#8A9098] dark:text-[#7D858F]">
                          {formattedKey}
                        </span>
                        <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] break-words">
                          {displayVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Toggle Status Action */}
            <div className="flex items-center gap-2">
              <Button
                variant={selectedParticipant.attendanceStatus === "checked_in" ? "outline" : "charcoal"}
                className="flex-1 rounded-full text-xs font-bold h-10"
                disabled={isUpdatingAttendance}
                onClick={() => handleToggleCheckIn(selectedParticipant)}
              >
                {selectedParticipant.attendanceStatus === "checked_in" ? (
                  <>
                    <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                    Undo Check-in
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Verify & Check In
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
