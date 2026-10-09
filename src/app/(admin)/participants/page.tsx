"use client";

import { useState } from "react";
import { Search, Download, CheckCircle2, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_PARTICIPANTS } from "@/lib/mock-data";

export default function ParticipantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = MOCK_PARTICIPANTS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.registrationId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "checked_in" && p.attendanceStatus === "checked_in") ||
      (filterStatus === "not_checked_in" && p.attendanceStatus === "not_checked_in");
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17191C]">
            Participants
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73]">
            Manage registrations, credentials, and live check-in statuses across all active events.
          </p>
        </div>

        <Button
          variant="outline"
          className="rounded-full gap-2 font-medium border-[#E5E7EA]"
          onClick={() => alert("Scoped CSV export will be generated.")}
        >
          <Download className="h-4 w-4 text-[#656B73]" />
          <span>Export Scoped CSV</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[24px] border border-[#E5E7EA] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2">
          {["all", "checked_in", "not_checked_in"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                filterStatus === status
                  ? "bg-[#25292F] text-white shadow-sm"
                  : "bg-[#F0F1F2] text-[#656B73] hover:bg-[#EAECEF] hover:text-[#17191C]"
              }`}
            >
              {status === "all"
                ? "All Participants"
                : status === "checked_in"
                ? "Checked In"
                : "Not Checked In"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098]" />
          <input
            type="text"
            placeholder="Search by name, email, REG ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-full border border-[#E5E7EA] bg-[#F4F5F6] pl-9 pr-4 text-xs text-[#17191C] placeholder:text-[#8A9098] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#25292F]/20"
          />
        </div>
      </div>

      {/* Participant Data Table */}
      <div className="overflow-hidden rounded-[24px] border border-[#E5E7EA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#17191C]">
            <thead className="border-b border-[#E5E7EA] bg-[#F4F5F6]/50 text-[11px] font-bold uppercase tracking-wider text-[#8A9098]">
              <tr>
                <th className="py-4 px-5">Participant</th>
                <th className="py-4 px-5">Reg ID</th>
                <th className="py-4 px-5">Event</th>
                <th className="py-4 px-5">Team</th>
                <th className="py-4 px-5">Attendance</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F5F6]">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[#F4F5F6]/40 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#17191C]">{p.name}</span>
                      <span className="text-[11px] text-[#8A9098]">{p.email}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 font-mono font-medium text-[#656B73]">
                    {p.registrationId}
                  </td>
                  <td className="py-4 px-5 font-medium text-[#17191C]">
                    {p.eventTitle}
                  </td>
                  <td className="py-4 px-5 text-[#656B73]">
                    {p.teamName || "—"}
                  </td>
                  <td className="py-4 px-5">
                    {p.attendanceStatus === "checked_in" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#17191C] bg-[#EAECEF] px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3 text-[#25292F]" />
                        Checked In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8A9098] bg-[#F0F1F2] px-2.5 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => alert(`Registration details for ${p.name} (${p.registrationId})`)}
                      className="rounded-full p-1.5 text-[#656B73] hover:bg-[#EAECEF] hover:text-[#17191C] transition-colors"
                      title="View Registration Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
