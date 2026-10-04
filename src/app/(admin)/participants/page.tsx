"use client";

import { useState } from "react";
import { Search, Download, CheckCircle2, Clock, Filter, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <h1 className="text-3xl font-extrabold tracking-tight text-[#191A1C]">
            Participants
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#65666A]">
            Manage registrations, credentials, and live check-in statuses across all active events.
          </p>
        </div>

        <Button
          variant="outline"
          className="rounded-2xl gap-2 font-semibold border-[#E8E6E1]"
          onClick={() => alert("Scoped CSV export will be generated.")}
        >
          <Download className="h-4 w-4 text-[#65666A]" />
          <span>Export Scoped CSV</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#EAE8E3] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          {["all", "checked_in", "not_checked_in"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filterStatus === status
                  ? "bg-[#1B4332] text-white shadow-sm"
                  : "bg-[#F9F8F6] text-[#65666A] hover:bg-[#EFEEEA] hover:text-[#191A1C]"
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#929398]" />
          <input
            type="text"
            placeholder="Search by name, email, REG ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#EAE8E3] bg-[#F9F8F6] pl-9 pr-4 text-xs text-[#191A1C] placeholder:text-[#929398] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
          />
        </div>
      </div>

      {/* Participant Data Table */}
      <div className="overflow-hidden rounded-[22px] border border-[#EAE8E3] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#191A1C]">
            <thead className="border-b border-[#EAE8E3] bg-[#FAF9F7] text-[11px] font-bold uppercase tracking-wider text-[#929398]">
              <tr>
                <th className="py-3.5 px-4">Participant</th>
                <th className="py-3.5 px-4">Reg ID</th>
                <th className="py-3.5 px-4">Event</th>
                <th className="py-3.5 px-4">Team</th>
                <th className="py-3.5 px-4">Attendance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F4F1]">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[#FAF9F7] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#191A1C]">{p.name}</span>
                      <span className="text-[11px] text-[#929398]">{p.email}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-[#65666A]">
                    {p.registrationId}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#191A1C]">
                    {p.eventTitle}
                  </td>
                  <td className="py-3.5 px-4 text-[#65666A]">
                    {p.teamName || "—"}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.attendanceStatus === "checked_in" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                        <CheckCircle2 className="h-3 w-3" />
                        Checked In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#929398] bg-[#F5F4F1] px-2 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => alert(`Registration details for ${p.name} (${p.registrationId})`)}
                      className="rounded-lg p-1 text-[#65666A] hover:bg-[#EFEEEA] hover:text-[#191A1C] transition-colors"
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
