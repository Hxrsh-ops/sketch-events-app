"use client";

import { useState, useEffect } from "react";
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
import { EventItem, Participant, CertificateRecord } from "@/types";
import { getStoredEvents, getAllParticipants, getStoredCertificates } from "@/lib/registration-store";

interface AnalyticsClientProps {
  initialEvents: EventItem[];
  initialParticipants: Participant[];
  initialCertificates?: CertificateRecord[];
  isPreview: boolean;
}

export default function AnalyticsClient({
  initialEvents,
  initialParticipants,
  initialCertificates = [],
  isPreview,
}: AnalyticsClientProps) {
  const [events, setEvents] = useState<EventItem[]>(
    initialEvents.length > 0 ? initialEvents : (isPreview ? MOCK_EVENTS : [])
  );
  const [participants, setParticipants] = useState<Participant[]>(
    initialParticipants.length > 0 ? initialParticipants : (isPreview ? MOCK_PARTICIPANTS : [])
  );
  const [certificates, setCertificates] = useState<CertificateRecord[]>(
    initialCertificates
  );
  const [selectedEventId, setSelectedEventId] = useState("all");

  useEffect(() => {
    if (isPreview) {
      const syncData = () => {
        setEvents(getStoredEvents());
        setParticipants(getAllParticipants());
        setCertificates(getStoredCertificates());
      };
      syncData();
      window.addEventListener("sketch_store_updated", syncData);
      return () => window.removeEventListener("sketch_store_updated", syncData);
    }
  }, [isPreview]);

  const eventOptions = [
    { value: "all", label: "All Events Combined" },
    ...events.map((e) => ({ value: e.id, label: e.title })),
  ];

  // Dynamic calculations based on live data
  const filteredAttendees =
    selectedEventId === "all"
      ? participants
      : participants.filter((p) => p.eventId === selectedEventId);

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

  const filteredCerts =
    selectedEventId === "all"
      ? certificates
      : certificates.filter((c) => c.eventId === selectedEventId);
  const totalCertificatesIssued =
    filteredCerts.length > 0
      ? filteredCerts.length
      : 0;

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto text-[#17191C]">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-[#858B93] uppercase">
            SKETCHHUB WORKSPACE / ANALYTICS
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C]">
              Analytics &amp; Insights
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold bg-[#F6F7F8] border-[#E5E7E9] text-[#858B93]">
              {isPreview ? "Preview Data" : "Live Metrics"}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#777E86]">
            Registration trends, check-in velocity, and department engagement metrics.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#858B93] mb-1">
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
        <div className="sketch-card-hero rounded-xl border border-[#E5E7E9] bg-white p-5 select-none cursor-default shadow-xs text-[#34383D]">
          <span className="text-xs font-medium text-[#858B93]">Overall Turnout</span>
          <div className="text-3xl font-bold text-[#34383D] mt-2 tabular-nums">{overallTurnout}</div>
          <span className="text-[11px] text-[#858B93] mt-1 inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-[#777E86]" /> Verified at terminal
          </span>
        </div>
        <div className="rounded-xl border border-[#E5E7E9] bg-white text-[#34383D] p-5 shadow-xs transition-colors hover:border-[#D9DCE0] select-none cursor-default">
          <span className="text-xs font-medium text-[#858B93]">Active Registrations</span>
          <div className="text-3xl font-bold text-[#34383D] mt-2 tabular-nums">{totalRegistered}</div>
          <span className="text-[11px] text-[#858B93] mt-1 block">In current scope</span>
        </div>
        <div className="rounded-xl border border-[#E5E7E9] bg-white text-[#34383D] p-5 shadow-xs transition-colors hover:border-[#D9DCE0] select-none cursor-default">
          <span className="text-xs font-medium text-[#858B93]">Checked In</span>
          <div className="text-3xl font-bold text-[#34383D] mt-2 tabular-nums">{totalCheckedIn}</div>
          <span className="text-[11px] text-[#858B93] mt-1 block">Passes validated</span>
        </div>
        <div className="rounded-xl border border-[#E5E7E9] bg-white text-[#34383D] p-5 shadow-xs transition-colors hover:border-[#D9DCE0] select-none cursor-default">
          <span className="text-xs font-medium text-[#858B93]">Certificates Issued</span>
          <div className="text-3xl font-bold text-[#34383D] mt-2 tabular-nums">{totalCertificatesIssued}</div>
          <span className="text-[11px] text-[#858B93] font-medium mt-1 block">100% delivery rate</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          <RegistrationAnalytics participants={filteredAttendees} isPreview={isPreview} />
        </div>
        <div className="lg:col-span-5">
          <EventProgressGauge events={events} participants={filteredAttendees} isPreview={isPreview} />
        </div>
      </div>

      {/* Department Engagement Breakdown */}
      <div className="rounded-xl border border-[#E5E7E9] bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#E5E7E9] pb-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#34383D] flex items-center gap-2">
              <PieChart className="h-4 w-4 text-[#777E86]" />
              Department &amp; Academic Affiliation Breakdown
            </h3>
            <p className="text-xs text-[#858B93]">
              Participant representation across academic departments.
            </p>
          </div>
          <span className="text-xs text-[#858B93] font-mono">
            {Object.keys(deptCounts).length} departments
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(deptCounts).map(([dept, count]) => {
            const pct = Math.round((count / totalRegistered) * 100) || 0;
            return (
              <div key={dept} className="rounded-lg border border-[#E5E7E9] bg-[#F6F7F8] p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#34383D] truncate">{dept}</span>
                  <span className="font-mono text-[#858B93]">{count} ({pct}%)</span>
                </div>
                <div className="h-1.5 w-full bg-[#EAECEF] rounded-full overflow-hidden">
                  <div className="h-full bg-[#34383D] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
