"use client";

import { useState } from "react";
import {
  TrendingUp,
  Users,
  Award,
  Clock,
  BarChart3,
  Calendar,
  CheckCircle2,
  PieChart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { RegistrationAnalytics } from "@/components/dashboard/registration-analytics";
import { EventProgressGauge } from "@/components/dashboard/event-progress-gauge";
import { MOCK_EVENTS, MOCK_PARTICIPANTS } from "@/lib/mock-data";

export default function AnalyticsPage() {
  const [selectedEventId, setSelectedEventId] = useState("all");

  const eventOptions = [
    { value: "all", label: "All Events Combined" },
    ...MOCK_EVENTS.map((e) => ({ value: e.id, label: e.title })),
  ];

  // Dynamic calculations based on preview data
  const filteredAttendees =
    selectedEventId === "all"
      ? MOCK_PARTICIPANTS
      : MOCK_PARTICIPANTS.filter((p) => p.eventId === selectedEventId);

  const totalRegistered = filteredAttendees.length;
  const totalCheckedIn = filteredAttendees.filter((p) => p.attendanceStatus === "checked_in").length;
  const overallTurnout =
    totalRegistered > 0 ? `${Math.round((totalCheckedIn / totalRegistered) * 100)}%` : "0%";

  // Department distribution
  const deptCounts: Record<string, number> = {};
  filteredAttendees.forEach((p) => {
    const dept = p.department || "General / Other";
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Analytics & Insights
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              Preview Data
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#989EA7]">
            Registration trends, check-in velocity, and department engagement metrics.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73] mb-1">
            Analytics Scope
          </label>
          <CustomSelect
            options={eventOptions}
            value={selectedEventId}
            onChange={setSelectedEventId}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm">
          <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Overall Turnout</span>
          <div className="text-3xl font-bold text-[#17191C] dark:text-[#F1F2F3] mt-2 tabular-nums">{overallTurnout}</div>
          <span className="text-[11px] text-[#656B73] dark:text-[#989EA7] font-medium mt-1 inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-[#25292F] dark:text-[#E8EAED]" /> Verified at terminal
          </span>
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm">
          <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Active Registrations</span>
          <div className="text-3xl font-bold text-[#17191C] dark:text-[#F1F2F3] mt-2 tabular-nums">{totalRegistered}</div>
          <span className="text-[11px] text-[#8A9098] dark:text-[#656B73] mt-1 block">In current scope</span>
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm">
          <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Checked In</span>
          <div className="text-3xl font-bold text-[#17191C] dark:text-[#F1F2F3] mt-2 tabular-nums">{totalCheckedIn}</div>
          <span className="text-[11px] text-[#8A9098] dark:text-[#656B73] mt-1 block">Passes validated</span>
        </div>
        <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-5 shadow-sm">
          <span className="text-xs font-semibold text-[#656B73] dark:text-[#989EA7]">Certificates Issued</span>
          <div className="text-3xl font-bold text-[#17191C] dark:text-[#F1F2F3] mt-2 tabular-nums">540</div>
          <span className="text-[11px] text-[#656B73] dark:text-[#989EA7] font-medium mt-1 block">100% delivery rate</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          <RegistrationAnalytics />
        </div>
        <div className="lg:col-span-5">
          <EventProgressGauge />
        </div>
      </div>

      {/* Department Engagement Breakdown */}
      <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Department & Academic Affiliation Breakdown
            </h3>
            <p className="text-xs text-[#656B73] dark:text-[#989EA7]">
              Participant representation across academic departments.
            </p>
          </div>
          <span className="text-xs text-[#8A9098] dark:text-[#656B73] font-mono">
            {Object.keys(deptCounts).length} departments
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(deptCounts).map(([dept, count]) => {
            const pct = Math.round((count / totalRegistered) * 100) || 0;
            return (
              <div key={dept} className="rounded-xl border border-[#F0F1F2] dark:border-[#262A2E] bg-[#F9FAFB] dark:bg-[#151719] p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3] truncate">{dept}</span>
                  <span className="font-mono text-[#8A9098] dark:text-[#656B73]">{count} ({pct}%)</span>
                </div>
                <div className="h-1.5 w-full bg-[#E5E7EA] dark:bg-[#262A2E] rounded-full overflow-hidden">
                  <div className="h-full bg-[#25292F] dark:bg-[#E8EAED] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
