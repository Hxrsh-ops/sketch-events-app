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
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { CustomSelect } from "@/components/ui/custom-select";
import { SlideOver } from "@/components/ui/slide-over";
import { Participant, EventItem } from "@/types";
import { formatDate } from "@/lib/utils";
import { toggleAttendanceAction, cancelRegistrationAction } from "@/app/actions/participant-actions";

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
  const [isCancellingReg, setIsCancellingReg] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
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
    } catch (err: any) {
      setActionError(err.message || "Failed to update attendance status");
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  // Cancel Registration via Server Action
  const handleCancelRegistration = async (participant: Participant) => {
    setIsCancellingReg(true);
    setActionError(null);

    try {
      const res = await cancelRegistrationAction({
        registrationId: participant.registrationId || participant.id,
        eventId: participant.eventId,
      });

      if (!res.success) {
        setActionError(res.message);
        return;
      }

      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participant.id || p.registrationId === participant.registrationId
            ? { ...p, status: "cancelled", attendanceStatus: "not_checked_in" }
            : p
        )
      );

      if (selectedParticipant) {
        setSelectedParticipant((prev) =>
          prev ? { ...prev, status: "cancelled", attendanceStatus: "not_checked_in" } : null
        );
      }
      setConfirmCancelId(null);
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel registration");
    } finally {
      setIsCancellingReg(false);
    }
  };

  // Export Filtered CSV
  const handleExportCsv = () => {
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "Registration ID",
      "Full Name",
      "Email Address",
      "Phone",
      "Registered Date",
      "Event Title",
      "Department",
      "Year",
      "Team Name",
      "Registration Status",
      "Attendance Status",
      "Checked-In Timestamp",
    ];

    const rows = filteredParticipants.map((p) => [
      escapeCsv(p.registrationId),
      escapeCsv(p.name),
      escapeCsv(p.email),
      escapeCsv(p.phone || "N/A"),
      escapeCsv(p.registeredAt),
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
        <div className="rounded-xl border border-[#E5E7E9] bg-[#F6F7F8] p-8 text-center shadow-xs max-w-xl mx-auto space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-white border border-[#E5E7E9] text-[#777E86]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-base font-semibold text-[#34383D]">
              Database Infrastructure Failure
            </h1>
            <p className="text-xs text-[#858B93] leading-relaxed">
              Failed to load attendee records from database:
            </p>
            <div className="rounded-lg border border-[#E5E7E9] bg-white p-3 text-xs font-mono text-[#34383D] text-left overflow-x-auto">
              {initialError}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="rounded-lg text-xs font-medium px-4 gap-1.5 border-[#E5E7E9] bg-white hover:bg-[#F6F7F8] text-[#34383D]"
          >
            <RefreshCw className="h-3 w-3 text-[#777E86]" />
            <span>Retry Request</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto text-[#17191C]">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-[#858B93] uppercase">
            SKETCHHUB WORKSPACE / PARTICIPANTS
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C]">
              Participants &amp; Passes
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold bg-white border-[#E5E7E9] text-[#777E86]">
              {isPreview ? "Preview Mode" : "Connected"}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#858B93]">
            Comprehensive attendee directory, QR credentials, department affiliations, and live check-in statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="rounded-lg border-[#E5E7E9] bg-white hover:bg-[#F6F7F8] text-xs font-semibold text-[#17191C] gap-1.5 h-9"
          >
            <Download className="h-3.5 w-3.5 text-[#777E86]" />
            <span>Export Filtered CSV</span>
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-semibold underline ml-2 text-rose-600 hover:text-rose-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sketch-card-hero rounded-xl border border-[#E5E7E9] bg-white p-4 flex items-center justify-between select-none cursor-default shadow-xs">
          <div>
            <span className="text-xs font-medium text-[#858B93]">Total Registrations</span>
            <div className="text-2xl font-bold text-[#17191C] mt-1 tabular-nums">{totalAttendees}</div>
          </div>
          <Users className="h-5 w-5 text-[#777E86]" />
        </div>
        <div className="rounded-xl border border-[#E5E7E9] bg-white text-[#17191C] p-4 shadow-xs transition-colors hover:border-[#D9DCE0] flex items-center justify-between select-none cursor-default">
          <div>
            <span className="text-xs font-medium text-[#858B93]">Verified Checked-In</span>
            <div className="text-2xl font-bold text-[#17191C] mt-1 tabular-nums">{checkedInTotal}</div>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
        </div>
        <div className="rounded-xl border border-[#E5E7E9] bg-white text-[#17191C] p-4 shadow-xs transition-colors hover:border-[#D9DCE0] flex items-center justify-between select-none cursor-default">
          <div>
            <span className="text-xs font-medium text-[#858B93]">Pending Check-in</span>
            <div className="text-2xl font-bold text-[#17191C] mt-1 tabular-nums">{pendingTotal}</div>
          </div>
          <Clock className="h-5 w-5 text-[#777E86]" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-[#E5E7E9] bg-white p-3.5 shadow-xs">
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777E86]" />
          <input
            type="text"
            placeholder="Search by name, ID, email, team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-[#E5E7E9] bg-[#F6F7F8] pl-9 pr-4 text-xs text-[#17191C] placeholder:text-[#858B93] transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#858B93] focus:border-[#858B93]"
          />
        </div>
      </div>

      {/* Participants Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7E9] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E5E7E9] bg-[#F6F7F8] text-[11px] font-semibold text-[#858B93]">
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
            <tbody className="divide-y divide-[#E5E7E9]">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F6F7F8] border border-[#E5E7E9] text-[#777E86] mb-3">
                        <Users className="h-5 w-5" />
                      </div>
                      <h4 className="text-sm font-semibold text-[#17191C]">No participants found</h4>
                      <p className="mt-1 text-xs text-[#858B93] max-w-sm">
                        No participant records match the current filter or search criteria.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("all");
                          setSelectedEventId("all");
                          setSearchQuery("");
                        }}
                        className="mt-3 text-xs font-semibold text-[#17191C] underline hover:no-underline"
                      >
                        Reset Filters
                      </button>
                    </div>
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
                      className="group cursor-pointer transition-colors duration-150 hover:bg-[#F8F9FA] focus-visible:outline-none focus-visible:bg-[#F8F9FA] focus-visible:ring-1 focus-visible:ring-[#858B93]"
                    >
                      <td className="py-3 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAECEF] border border-[#E5E7E9] text-[#17191C] font-bold text-[10px]">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-semibold text-[#17191C] group-hover:underline truncate">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-[#858B93] truncate max-w-[220px]" title={p.email}>
                              {p.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums tracking-tight text-[#777E86] whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="select-all">{p.registrationId}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(p.registrationId, e)}
                            className="text-[#858B93] hover:text-[#17191C] p-1 rounded hover:bg-[#EAECEF] transition-colors"
                            aria-label={`Copy ${p.registrationId}`}
                          >
                            {copiedId === p.registrationId ? (
                              <Check className="h-3 w-3 text-[#17191C]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-[12px] font-medium text-[#17191C] max-w-[180px] truncate">
                        {p.eventTitle}
                      </td>

                      <td className="px-4 py-3 text-[12px] text-[#858B93]">
                        {p.department || "General"}
                      </td>

                      <td className="px-4 py-3 text-[#858B93]">
                        {p.teamName ? (
                          <span className="rounded-md bg-[#F6F7F8] border border-[#E5E7E9] px-2 py-0.5 text-[11px] font-medium text-[#17191C]">
                            {p.teamName}
                          </span>
                        ) : (
                          <span className="text-[#A4A9AF] italic text-xs">Individual</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                            Checked In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#777E86] bg-[#F6F7F8] border border-[#E5E7E9] px-2 py-0.5 rounded-md">
                            <Clock className="h-3 w-3 text-[#A4A9AF]" />
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
                            className="h-7 w-7 p-0 rounded-lg text-[#858B93] hover:text-[#34383D] hover:bg-[#F6F7F8]"
                            aria-label="Inspect pass"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={isCheckedIn ? "outline" : "charcoal"}
                            size="sm"
                            disabled={isUpdatingAttendance}
                            onClick={(e) => handleToggleCheckIn(p, e)}
                            className="h-7 rounded-lg text-[11px] px-2.5 font-medium bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] hover:bg-[#D9DCE0]"
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
            <div className="rounded-xl border border-[#E5E7E9] bg-[#F6F7F8] text-[#34383D] p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E5E7E9] pb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#858B93]">
                  SKETCH OFFICIAL PASS
                </span>
                <Badge
                  variant="secondary"
                  className={
                    selectedParticipant.attendanceStatus === "checked_in"
                      ? "bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] font-semibold text-[10px]"
                      : "bg-white text-[#858B93] border border-[#E5E7E9] text-[10px]"
                  }
                >
                  {selectedParticipant.attendanceStatus === "checked_in" ? "CHECKED IN" : "VALID ENTRY"}
                </Badge>
              </div>

              {/* QR Representation */}
              <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-white border border-[#E5E7E9] text-[#34383D]">
                <div className="w-32 h-32 border border-[#E5E7E9] p-2 flex flex-col justify-between rounded-md">
                  <div className="flex justify-between">
                    <div className="w-6 h-6 bg-[#34383D] p-0.5"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-[#34383D]" /></div></div>
                    <div className="w-6 h-6 bg-[#34383D] p-0.5"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-[#34383D]" /></div></div>
                  </div>
                  <div className="text-[8px] font-mono font-bold text-center text-[#858B93]">SKETCH PASS</div>
                  <div className="flex justify-between items-end">
                    <div className="w-6 h-6 bg-[#34383D] p-0.5"><div className="w-full h-full bg-white p-0.5"><div className="w-full h-full bg-[#34383D]" /></div></div>
                    <div className="w-4 h-4 border border-dashed border-[#858B93]" />
                  </div>
                </div>
                <span className="mt-1.5 font-mono text-xs font-bold text-[#34383D]">
                  {selectedParticipant.registrationId}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#34383D]">{selectedParticipant.name}</h3>
                <p className="text-xs text-[#858B93]">{selectedParticipant.eventTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#E5E7E9] pt-3">
                <div>
                  <span className="text-[#858B93] text-[10px] uppercase font-mono block">Department</span>
                  <span className="text-[#34383D] font-medium">{selectedParticipant.department || "General"}</span>
                </div>
                <div>
                  <span className="text-[#858B93] text-[10px] uppercase font-mono block">Team</span>
                  <span className="text-[#34383D] font-medium">{selectedParticipant.teamName || "Individual"}</span>
                </div>
              </div>
            </div>

            {/* Profile & Contact Details */}
            <div className="rounded-xl border border-[#E5E7E9] bg-white p-4 space-y-3 text-xs shadow-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#E5E7E9]">
                <span className="text-[#858B93] flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#777E86]" /> Email Address
                </span>
                <span className="font-semibold text-[#34383D]">{selectedParticipant.email}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E5E7E9]">
                <span className="text-[#858B93] flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#777E86]" /> Phone Number
                </span>
                <span className="font-medium text-[#34383D]">{selectedParticipant.phone || "Not provided"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E5E7E9]">
                <span className="text-[#858B93] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#777E86]" /> Registered Date
                </span>
                <span className="font-medium text-[#34383D]">{formatDate(selectedParticipant.registeredAt)}</span>
              </div>
              {selectedParticipant.checkedInAt && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#858B93] flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#777E86]" /> Verified At
                  </span>
                  <span className="font-medium text-[#34383D]">{formatDate(selectedParticipant.checkedInAt)}</span>
                </div>
              )}
            </div>

            {/* Custom Registration Form Responses */}
            {selectedParticipant.customAnswers && Object.keys(selectedParticipant.customAnswers).length > 0 && (
              <div className="rounded-xl border border-[#E5E7E9] bg-white p-4 space-y-3 text-xs shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E5E7E9] pb-2">
                  <span className="font-semibold text-[#34383D] flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#777E86]" />
                    Custom Registration Responses
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono bg-[#F6F7F8] border-[#E5E7E9] text-[#858B93]">
                    {Object.keys(selectedParticipant.customAnswers).length} fields
                  </Badge>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 divide-y divide-[#E5E7E9]">
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
                        <span className="text-[11px] font-mono text-[#858B93]">
                          {formattedKey}
                        </span>
                        <span className="text-xs font-semibold text-[#34383D] break-words">
                          {displayVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions: Attendance Toggle & Registration Cancellation */}
            <div className="flex flex-col gap-2 pt-2">
              {selectedParticipant.status !== "cancelled" ? (
                <>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={selectedParticipant.attendanceStatus === "checked_in" ? "outline" : "charcoal"}
                      className="flex-1 rounded-lg text-xs font-semibold h-10 bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] hover:bg-[#D9DCE0]"
                      disabled={isUpdatingAttendance || isCancellingReg}
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
                          Verify &amp; Check In
                        </>
                      )}
                    </Button>
                  </div>

                  {confirmCancelId === selectedParticipant.id ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 space-y-2 text-xs">
                      <p className="font-semibold text-rose-900">
                        Cancel this registration? This will revoke the ticket and free capacity.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isCancellingReg}
                          onClick={() => handleCancelRegistration(selectedParticipant)}
                          className="flex-1 rounded-md text-xs font-semibold h-8 bg-rose-600 hover:bg-rose-700 text-white"
                        >
                          {isCancellingReg ? "Cancelling..." : "Confirm Cancellation"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isCancellingReg}
                          onClick={() => setConfirmCancelId(null)}
                          className="rounded-md text-xs h-8 px-3 border-zinc-300"
                        >
                          Keep
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmCancelId(selectedParticipant.id)}
                      className="w-full rounded-lg text-xs font-medium h-9 border-[#E5E7E9] text-rose-700 hover:bg-rose-50 hover:border-rose-200 gap-1.5"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      <span>Cancel Registration</span>
                    </Button>
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-center text-xs text-zinc-600 font-medium">
                  This registration has been cancelled.
                </div>
              )}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
