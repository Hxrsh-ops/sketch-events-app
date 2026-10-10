"use client";

import { useState } from "react";
import {
  Search,
  QrCode,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Building2,
  User,
  ChevronRight,
  Download,
  Copy,
  Check,
  Eye,
  Undo2,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { CustomSelect } from "@/components/ui/custom-select";
import { SlideOver } from "@/components/ui/slide-over";
import { MOCK_PARTICIPANTS, MOCK_EVENTS } from "@/lib/mock-data";
import { Participant } from "@/types";
import { formatDate } from "@/lib/utils";

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>(MOCK_PARTICIPANTS);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy Registration ID to clipboard
  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Toggle Check In in local state
  const toggleCheckIn = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const isCurrentlyCheckedIn = p.attendanceStatus === "checked_in";
          const updated: Participant = {
            ...p,
            attendanceStatus: isCurrentlyCheckedIn ? "not_checked_in" : "checked_in",
            checkedInAt: isCurrentlyCheckedIn ? undefined : new Date().toISOString(),
          };
          if (selectedParticipant?.id === id) {
            setSelectedParticipant(updated);
          }
          return updated;
        }
        return p;
      })
    );
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
      const str = String(val ?? "");
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
    ...MOCK_EVENTS.map((e) => ({ value: e.id, label: e.title })),
  ];

  const filterTabs = [
    { id: "all", label: `All (${filteredParticipants.length})` },
    { id: "registered", label: `Pending Arrival` },
    { id: "checked_in", label: `Checked In` },
  ];

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
              Preview Mode
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

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Total Registrations</span>
            <div className="text-2xl font-extrabold text-[#17191C] dark:text-[#F1F2F3] mt-1">{totalAttendees}</div>
          </div>
          <Users className="h-5 w-5 text-[#8A9098] dark:text-[#656B73]" />
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Verified Checked-In</span>
            <div className="text-2xl font-extrabold text-[#17191C] dark:text-[#F1F2F3] mt-1">{checkedInTotal}</div>
          </div>
          <CheckCircle2 className="h-5 w-5 text-[#17191C] dark:text-[#E8EAED]" />
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Pending Check-in</span>
            <div className="text-2xl font-extrabold text-[#17191C] dark:text-[#F1F2F3] mt-1">{pendingTotal}</div>
          </div>
          <Clock className="h-5 w-5 text-[#8A9098] dark:text-[#656B73]" />
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
                      onClick={() => setSelectedParticipant(p)}
                      className="group cursor-pointer transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#151719]"
                    >
                      <td className="py-3 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#30353A] text-white dark:text-[#F1F2F3] font-bold text-[10px]">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3] group-hover:underline truncate">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-[#8A9098] dark:text-[#656B73] truncate">{p.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-[#656B73] dark:text-[#989EA7]">
                        <div className="flex items-center gap-1.5">
                          <span>{p.registrationId}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(p.registrationId, e)}
                            className="text-[#8A9098] dark:text-[#656B73] hover:text-[#17191C] dark:hover:text-[#F1F2F3] p-0.5 rounded"
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

                      <td className="px-4 py-3 font-medium text-[#17191C] dark:text-[#F1F2F3] max-w-[180px] truncate">
                        {p.eventTitle}
                      </td>

                      <td className="px-4 py-3 text-[#656B73] dark:text-[#989EA7]">
                        {p.department || "General"}
                      </td>

                      <td className="px-4 py-3 text-[#656B73] dark:text-[#989EA7]">
                        {p.teamName ? (
                          <span className="rounded bg-[#F0F1F2] dark:bg-[#151719] px-1.5 py-0.5 text-[10px] font-medium text-[#17191C] dark:text-[#F1F2F3]">
                            {p.teamName}
                          </span>
                        ) : (
                          <span className="text-[#8A9098] dark:text-[#656B73] italic text-[11px]">Individual</span>
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
                            onClick={(e) => toggleCheckIn(p.id, e)}
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

            {/* Toggle Status Action */}
            <div className="flex items-center gap-2">
              <Button
                variant={selectedParticipant.attendanceStatus === "checked_in" ? "outline" : "charcoal"}
                className="flex-1 rounded-full text-xs font-bold h-10"
                onClick={() => toggleCheckIn(selectedParticipant.id)}
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
