import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Layers, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { EventItem, Participant } from "@/types";

const PREVIEW_ACTIVE_EVENTS = [
  {
    id: "evt-01",
    name: "Design Sprint '26",
    progress: 74,
    checkedIn: 642,
    totalRegistered: 868,
    activeRound: "Round 2: Prototype Evaluation",
    teamsAdvanced: "34 Teams",
  },
  {
    id: "evt-02",
    name: "Prompt to Prototype",
    progress: 48,
    checkedIn: 240,
    totalRegistered: 500,
    activeRound: "Round 1: Idea Pitch",
    teamsAdvanced: "50 Teams",
  },
];

interface EventProgressGaugeProps {
  events?: EventItem[];
  participants?: Participant[];
  isPreview?: boolean;
}

export function EventProgressGauge({
  events = [],
  participants = [],
  isPreview = false,
}: EventProgressGaugeProps = {}) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const mappedEvents = events
    .filter((e) => e.lifecycle === "published" || e.lifecycle === "live" || e.lifecycle === "draft")
    .map((e) => {
      const eventParticipants = participants.filter((p) => p.eventId === e.id);
      const totalRegistered = eventParticipants.length > 0 ? eventParticipants.length : (e.registeredCount || 0);
      const checkedIn = eventParticipants.length > 0
        ? eventParticipants.filter((p) => p.attendanceStatus === "checked_in").length
        : (e.checkedInCount || 0);
      const progress = totalRegistered > 0 ? Math.round((checkedIn / totalRegistered) * 100) : 0;
      return {
        id: e.id,
        name: e.title,
        progress,
        checkedIn,
        totalRegistered,
        activeRound: e.hasRounds ? "Competition Stages" : "Single Stage Session",
        teamsAdvanced: e.hasTeams ? "Team Evaluation" : "Individual",
      };
    });

  const activeEventsList = mappedEvents.length > 0
    ? mappedEvents
    : isPreview
    ? PREVIEW_ACTIVE_EVENTS
    : [];

  const safeIdx = Math.min(selectedIdx, Math.max(0, activeEventsList.length - 1));
  const currentEvent = activeEventsList[safeIdx];

  const totalLength = 235.6;
  const strokeDashoffset = currentEvent
    ? totalLength - (totalLength * currentEvent.progress) / 100
    : totalLength;

  if (activeEventsList.length === 0) {
    return (
      <div className="flex h-full flex-col justify-between rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
          <h3 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">
            Live Event Throughput
          </h3>
        </div>
        <div className="my-10 rounded-xl border border-dashed border-[#E5E7EA] dark:border-[#30353A] p-8 text-center text-xs text-[#8A9098] dark:text-[#656B73]">
          No active events in scope for throughput analysis.
        </div>
        <Link href="/events/new">
          <Button
            variant="outline"
            className="w-full rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold"
          >
            Create New Event
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED]" />
          <h3 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">
            Live Event Throughput
          </h3>
        </div>

        <div className="w-52">
          <CustomSelect
            options={activeEventsList.map((evt, idx) => ({
              value: String(idx),
              label: evt.name,
            }))}
            value={String(safeIdx)}
            onChange={(val) => setSelectedIdx(Number(val))}
          />
        </div>
      </div>

      {/* Semicircular Arc Gauge */}
      <div className="relative my-4 flex flex-col items-center justify-center">
        <div className="relative flex h-36 w-60 items-center justify-center overflow-hidden">
          <svg className="h-28 w-56" viewBox="0 0 200 100">
            {/* Background Gray Arc */}
            <path
              d="M 25 100 A 75 75 0 0 1 175 100"
              fill="none"
              stroke="#E5E7EA"
              className="dark:stroke-[#262A2E]"
              strokeWidth="20"
              strokeLinecap="round"
            />
            {/* Charcoal Active Progress Arc */}
            <motion.path
              d="M 25 100 A 75 75 0 0 1 175 100"
              fill="none"
              stroke="#25292F"
              className="dark:stroke-[#E8EAED]"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray={totalLength}
              initial={{ strokeDashoffset: totalLength }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>

          {/* Centered Value */}
          <div className="absolute bottom-1 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-[#17191C] dark:text-[#F1F2F3] leading-none">
              {currentEvent.progress}%
            </span>
            <span className="mt-1 text-[11px] font-semibold text-[#656B73] dark:text-[#989EA7]">
              Checked In
            </span>
          </div>
        </div>

        {/* Round Status Pill */}
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F4F5F6] dark:bg-[#151719] px-3 py-1 text-xs font-semibold text-[#25292F] dark:text-[#E8EAED]">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#25292F] dark:text-[#E8EAED]" />
          <span>{currentEvent.activeRound}</span>
        </div>
      </div>

      {/* Breakdown Metrics & Action */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 border-t border-[#F4F5F6] dark:border-[#262A2E] pt-3 text-center">
          <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#151719] p-2">
            <span className="text-[10px] uppercase font-bold text-[#8A9098] dark:text-[#656B73]">Verified Check-ins</span>
            <p className="text-sm font-extrabold text-[#17191C] dark:text-[#F1F2F3]">{currentEvent.checkedIn} / {currentEvent.totalRegistered}</p>
          </div>
          <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#151719] p-2">
            <span className="text-[10px] uppercase font-bold text-[#8A9098] dark:text-[#656B73]">Teams Advanced</span>
            <p className="text-sm font-extrabold text-[#17191C] dark:text-[#F1F2F3]">{currentEvent.teamsAdvanced} Teams</p>
          </div>
        </div>

        <Link href="/rounds">
          <Button
            variant="outline"
            className="w-full rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#151719] gap-1.5"
          >
            <span>Manage Round Progression</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
