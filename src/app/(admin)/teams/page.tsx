"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Users,
  Shield,
  Mail,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  Download,
  Calendar,
  Building2,
  Eye,
  Check,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { CustomSelect } from "@/components/ui/custom-select";
import { SlideOver } from "@/components/ui/slide-over";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAllTeams, getAllParticipants, getStoredEvents } from "@/lib/registration-store";
import { Team, Participant } from "@/types";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>(() => getAllTeams());
  const [participants, setParticipants] = useState<Participant[]>(() => getAllParticipants());
  const [events, setEvents] = useState(() => getStoredEvents());
  const [activeTab, setActiveTab] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedMember, setSelectedMember] = useState<Participant | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setTeams(getAllTeams());
      setParticipants(getAllParticipants());
      setEvents(getStoredEvents());
    };
    window.addEventListener("sketch_store_updated", handleUpdate);
    return () => window.removeEventListener("sketch_store_updated", handleUpdate);
  }, []);

  const getTeamMembers = (teamId: string) => {
    return participants.filter((p) => p.teamId === teamId);
  };

  const filteredTeams = teams.filter((t) => {
    const matchesEvent = selectedEventId === "all" || t.eventId === selectedEventId;
    const isComplete = t.memberCount === t.maxMembers;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "complete" && isComplete) ||
      (activeTab === "open" && !isComplete);
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.captainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.eventTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEvent && matchesTab && matchesSearch;
  });

  // Client-side CSV export
  const handleExportTeamsCsv = () => {
    const headers = [
      "Team ID",
      "Team Name",
      "Event Title",
      "Captain Name",
      "Captain Email",
      "Current Members",
      "Max Capacity",
      "Status",
    ];

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const rows = filteredTeams.map((t) => [
      escapeCsv(t.id),
      escapeCsv(t.name),
      escapeCsv(t.eventTitle),
      escapeCsv(t.captainName),
      escapeCsv(t.captainEmail),
      escapeCsv(t.memberCount),
      escapeCsv(t.maxMembers),
      escapeCsv(t.status),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sketch_teams_roster_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const eventOptions = [
    { value: "all", label: "All Team Events" },
    ...events.filter((e) => e.hasTeams).map((e) => ({ value: e.id, label: e.title })),
  ];

  const filterTabs = [
    { id: "all", label: `All Teams (${filteredTeams.length})` },
    { id: "complete", label: `Full Roster` },
    { id: "open", label: `Open Slots` },
  ];

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Teams & Rosters
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              Preview Mode
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#989EA7]">
            Manage participant teams, rosters, slot allocations, and team captain contacts for hackathons and design sprints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTeamsCsv}
            className="rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold gap-1.5 h-9"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Teams CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <AnimatedTabs
            tabs={filterTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            layoutId="teamsFilterPill"
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
            placeholder="Search by team, captain, or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#151719] pl-9 pr-4 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] dark:placeholder:text-[#656B73] transition-all focus:bg-white dark:focus:bg-[#1B1E21] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
          />
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-12 text-center text-xs text-[#8A9098] dark:text-[#656B73]">
          No teams found matching your current filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeams.map((team) => {
            const isFull = team.memberCount === team.maxMembers;
            const members = getTeamMembers(team.id);

            return (
              <div
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className="group cursor-pointer flex flex-col justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm transition-all hover:shadow-card"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3] group-hover:underline">
                        {team.name}
                      </h3>
                      <span className="text-xs text-[#656B73] dark:text-[#989EA7]">{team.eventTitle}</span>
                    </div>
                    <Badge
                      variant={isFull ? "default" : "secondary"}
                      className="text-[10px] font-bold uppercase"
                    >
                      {isFull ? "Full Roster" : `${team.memberCount}/${team.maxMembers} Slots`}
                    </Badge>
                  </div>

                  {/* Roster Capacity Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-[#8A9098] dark:text-[#656B73] mb-1">
                      <span>Roster Capacity</span>
                      <span>{team.memberCount} of {team.maxMembers}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#F0F1F2] dark:bg-[#151719] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#25292F] dark:bg-[#E8EAED] rounded-full"
                        style={{ width: `${(team.memberCount / team.maxMembers) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8A9098] dark:text-[#656B73] flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" /> Captain
                      </span>
                      <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">{team.captainName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8A9098] dark:text-[#656B73] flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </span>
                      <span className="text-[#656B73] dark:text-[#989EA7] truncate max-w-[170px]">{team.captainEmail}</span>
                    </div>
                  </div>

                  {/* Member Avatars preview */}
                  <div className="mt-4 pt-3 border-t border-[#F4F5F6] dark:border-[#262A2E] flex items-center justify-between">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          title={m.name}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#30353A] text-[9px] font-bold text-white dark:text-[#F1F2F3] ring-2 ring-white dark:ring-[#1B1E21]"
                        >
                          {m.name.charAt(0)}
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#8A9098] dark:text-[#656B73] flex items-center gap-1">
                      Inspect Roster
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team Roster SlideOver Drawer */}
      <SlideOver
        isOpen={Boolean(selectedTeam)}
        onClose={() => {
          setSelectedTeam(null);
          setSelectedMember(null);
        }}
        title={selectedTeam?.name || "Team Roster"}
        subtitle={selectedTeam?.eventTitle}
        widthClass="max-w-lg"
      >
        {selectedTeam && (
          <div className="space-y-6">
            {/* Captain Hero Box */}
            <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-[#E5E7EA] dark:border-[#30353A] bg-[#25292F] text-white">
                  <AvatarFallback className="bg-[#25292F] dark:bg-[#30353A] text-white dark:text-[#F1F2F3] font-bold text-xs">
                    {selectedTeam.captainName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">
                      {selectedTeam.captainName}
                    </span>
                    <Badge variant="default" className="text-[9px] py-0 px-1.5">
                      Captain
                    </Badge>
                  </div>
                  <span className="text-[11px] text-[#656B73] dark:text-[#989EA7]">{selectedTeam.captainEmail}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#8A9098] dark:text-[#656B73] block uppercase">Status</span>
                <span className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3] capitalize">{selectedTeam.status}</span>
              </div>
            </div>

            {/* Roster Members List */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EA] dark:border-[#30353A]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#656B73] dark:text-[#989EA7]">
                  Registered Team Members ({getTeamMembers(selectedTeam.id).length})
                </h3>
                <span className="text-[11px] text-[#8A9098] dark:text-[#656B73]">
                  Max Capacity: {selectedTeam.maxMembers}
                </span>
              </div>

              <div className="mt-3 divide-y divide-[#F0F1F2] dark:divide-[#262A2E]">
                {getTeamMembers(selectedTeam.id).map((member) => (
                  <div
                    key={member.id}
                    className="py-3 flex items-center justify-between hover:bg-[#F9FAFB] dark:hover:bg-[#151719] px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F1F2] dark:bg-[#151719] text-[#17191C] dark:text-[#F1F2F3] font-bold text-[10px]">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">{member.name}</span>
                          {member.attendanceStatus === "checked_in" && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#17191C] dark:text-[#E8EAED]" />
                          )}
                        </div>
                        <div className="text-[11px] text-[#8A9098] dark:text-[#656B73] flex items-center gap-1 font-mono">
                          <span>{member.registrationId}</span>
                          <span>•</span>
                          <span>{member.department || "General"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          member.attendanceStatus === "checked_in"
                            ? "bg-[#F0F1F2] dark:bg-[#E8EAED] text-[#17191C] dark:text-[#111315]"
                            : "bg-[#F4F5F6] dark:bg-[#151719] text-[#8A9098] dark:text-[#989EA7]"
                        }`}
                      >
                        {member.attendanceStatus === "checked_in" ? "Checked In" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Team Form Responses */}
            {selectedTeam.customAnswers && Object.keys(selectedTeam.customAnswers).length > 0 && (
              <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[#F0F1F2] dark:border-[#262A2E] pb-2">
                  <span className="font-bold text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Team Registration Responses
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {Object.keys(selectedTeam.customAnswers).length} fields
                  </Badge>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 divide-y divide-[#F0F1F2]/60 dark:divide-[#262A2E]/60">
                  {Object.entries(selectedTeam.customAnswers).map(([key, value]) => {
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
          </div>
        )}
      </SlideOver>
    </div>
  );
}
