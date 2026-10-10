"use client";

import { useState } from "react";
import {
  GitBranch,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Trophy,
  Plus,
  AlertCircle,
  Sparkles,
  Check,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { SlideOver } from "@/components/ui/slide-over";
import { Input } from "@/components/ui/input";
import { MOCK_ROUNDS, MOCK_TEAMS, MOCK_EVENTS } from "@/lib/mock-data";
import { Round } from "@/types";

export default function RoundsPage() {
  const [selectedEventId, setSelectedEventId] = useState("evt-01");
  const [rounds, setRounds] = useState<Round[]>(MOCK_ROUNDS);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // New stage form state
  const [newStageName, setNewStageName] = useState("");
  const [newStageVenue, setNewStageVenue] = useState("");
  const [newStageEligible, setNewStageEligible] = useState("10");

  const selectedEvent = MOCK_EVENTS.find((e) => e.id === selectedEventId) || MOCK_EVENTS[0];
  const eventRounds = rounds.filter((r) => r.eventId === selectedEventId);

  // Handle adding new stage
  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    const newRound: Round = {
      id: `rnd-${Date.now()}`,
      eventId: selectedEventId,
      eventTitle: selectedEvent.title,
      name: newStageName.trim(),
      order: eventRounds.length + 1,
      startTime: new Date().toISOString(),
      venue: newStageVenue.trim() || "Main Auditorium",
      status: "upcoming",
      eligibleCount: parseInt(newStageEligible) || 10,
      advancedCount: 0,
    };

    setRounds((prev) => [...prev, newRound]);
    setIsAddStageOpen(false);
    setNewStageName("");
    setNewStageVenue("");
    setFeedbackMessage(`Stage "${newRound.name}" successfully added to ${selectedEvent.title}.`);
  };

  // Handle advancing teams in preview state
  const handleAdvanceProgression = (round: Round) => {
    setRounds((prev) =>
      prev.map((r) =>
        r.id === round.id ? { ...r, status: "completed" as const, advancedCount: r.eligibleCount } : r
      )
    );
    setSelectedRound(null);
    setFeedbackMessage(
      `Progression confirmed for "${round.name}". Qualified teams advanced to next stage.`
    );
  };

  const eventOptions = MOCK_EVENTS.map((e) => ({
    value: e.id,
    label: `${e.title} (${e.hasRounds ? "Multi-Stage" : "Single Stage"})`,
  }));

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Rounds & Progression
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              Preview Mode
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#989EA7]">
            Multi-stage competition pipelines, jury evaluations, qualifying thresholds, and team progression.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="charcoal"
            className="rounded-full gap-2 text-xs sm:text-sm font-semibold shadow-sm h-9 sm:h-10 px-4 sm:px-5"
            onClick={() => setIsAddStageOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Add Stage</span>
          </Button>
        </div>
      </div>

      {/* Scope Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 shadow-sm gap-3">
        <div className="flex items-center gap-2 text-xs text-[#17191C] dark:text-[#F1F2F3] font-semibold">
          <Layers className="h-4 w-4 text-[#8A9098] dark:text-[#656B73]" />
          <span>Competition Scope:</span>
        </div>
        <div className="w-full sm:w-80">
          <CustomSelect
            options={eventOptions}
            value={selectedEventId}
            onChange={(val) => {
              setSelectedEventId(val);
              setFeedbackMessage(null);
            }}
          />
        </div>
      </div>

      {/* Action Feedback Banner */}
      {feedbackMessage && (
        <div className="rounded-2xl border border-[#17191C] dark:border-[#30353A] bg-[#17191C] dark:bg-[#22262A] text-white p-4 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-[11px] text-white/60 hover:text-white underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Single-Stage Event Informative State */}
      {!selectedEvent.hasRounds && eventRounds.length === 0 ? (
        <div className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F5F6] dark:bg-[#151719] text-[#25292F] dark:text-[#E8EAED]">
            <GitBranch className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Single-Stage Event — {selectedEvent.title}
            </h2>
            <p className="mt-1 text-xs text-[#656B73] dark:text-[#989EA7] leading-relaxed">
              This event is configured as a single open session without elimination stages. All registered and checked-in attendees participate directly in the main activity.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddStageOpen(true)}
            className="rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold"
          >
            Configure Multi-Stage Pipeline
          </Button>
        </div>
      ) : (
        /* Multi-Stage Event Progression Timeline */
        <div className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">
                Active Competition Pipeline
              </span>
              <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">
                {selectedEvent.title} — {eventRounds.length}-Stage Progression
              </h2>
            </div>
            <Badge variant="secondary" className="text-xs">
              {eventRounds.filter((r) => r.status === "completed").length} of {eventRounds.length} Completed
            </Badge>
          </div>

          {/* Flow Visualization */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {eventRounds.map((round) => {
              const isCompleted = round.status === "completed";
              const isActive = round.status === "in_progress";

              return (
                <div
                  key={round.id}
                  onClick={() => setSelectedRound(round)}
                  className={`group cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-card flex flex-col justify-between ${
                    isActive
                      ? "border-[#25292F] dark:border-[#E8EAED] bg-[#F9FAFB] dark:bg-[#151719] ring-1 ring-[#25292F] dark:ring-[#E8EAED]"
                      : "border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#30353A] text-white dark:text-[#F1F2F3] text-xs font-bold">
                        {round.order}
                      </span>
                      <Badge
                        variant={isCompleted ? "secondary" : isActive ? "default" : "outline"}
                        className="text-[9px] uppercase font-bold"
                      >
                        {round.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-[#17191C] dark:text-[#F1F2F3] group-hover:underline">
                      {round.name}
                    </h3>

                    <div className="mt-3 space-y-1.5 text-xs text-[#656B73] dark:text-[#989EA7]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#8A9098] dark:text-[#656B73]" />
                        <span>{round.venue}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#8A9098] dark:text-[#656B73]" />
                        <span>
                          <strong className="text-[#17191C] dark:text-[#F1F2F3]">{round.eligibleCount}</strong> Teams Eligible
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5 text-[#8A9098] dark:text-[#656B73]" />
                        <span>
                          <strong className="text-[#17191C] dark:text-[#F1F2F3]">{round.advancedCount || 0}</strong> Advanced
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E7EA] dark:border-[#262A2E] flex items-center justify-between text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                    <span>Inspect Shortlist</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Round Inspector SlideOver Drawer */}
      <SlideOver
        isOpen={Boolean(selectedRound)}
        onClose={() => setSelectedRound(null)}
        title={selectedRound?.name || "Round Progression"}
        subtitle={`Stage ${selectedRound?.order} • ${selectedRound?.eventTitle}`}
        widthClass="max-w-lg"
      >
        {selectedRound && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">
                Stage Evaluation Details
              </span>
              <p className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3] capitalize">
                {selectedRound.status.replace("_", " ")} Evaluation
              </p>
              <p className="text-[#656B73] dark:text-[#989EA7]">
                Venue: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{selectedRound.venue}</strong>
              </p>
              <p className="text-[#656B73] dark:text-[#989EA7]">
                Eligible Participants/Teams: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{selectedRound.eligibleCount}</strong>
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#656B73] dark:text-[#989EA7] pb-2 border-b border-[#E5E7EA] dark:border-[#30353A]">
                Shortlisted Teams for Stage {selectedRound.order}
              </h3>

              <div className="mt-3 divide-y divide-[#F4F5F6] dark:divide-[#262A2E]">
                {MOCK_TEAMS.map((team) => (
                  <div key={team.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">{team.name}</p>
                      <p className="text-[11px] text-[#8A9098] dark:text-[#656B73]">Captain: {team.captainName}</p>
                    </div>
                    <Badge variant="default" className="text-[9px] font-bold">
                      Qualified
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="charcoal"
              className="w-full rounded-full text-xs font-semibold h-10 shadow-sm"
              onClick={() => handleAdvanceProgression(selectedRound)}
            >
              Advance Shortlisted Teams to Next Stage
            </Button>
          </div>
        )}
      </SlideOver>

      {/* Add Stage Drawer */}
      <SlideOver
        isOpen={isAddStageOpen}
        onClose={() => setIsAddStageOpen(false)}
        title="Add Competition Stage"
        subtitle={`Adding stage to ${selectedEvent.title}`}
        widthClass="max-w-md"
      >
        <form onSubmit={handleAddStage} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">
              Stage Name *
            </label>
            <Input
              placeholder="e.g., Round 3 — Finals & Pitch Defense"
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              className="h-10 text-xs"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">
              Stage Venue
            </label>
            <Input
              placeholder="e.g., Main Stage Auditorium Hall A"
              value={newStageVenue}
              onChange={(e) => setNewStageVenue(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">
              Eligible Team Capacity
            </label>
            <Input
              type="number"
              placeholder="10"
              value={newStageEligible}
              onChange={(e) => setNewStageEligible(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div className="pt-4 border-t border-[#E5E7EA] dark:border-[#30353A] flex items-center gap-3">
            <Button type="submit" variant="charcoal" className="flex-1 rounded-full text-xs font-semibold h-10">
              Save Stage
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddStageOpen(false)}
              className="rounded-full text-xs h-10 px-4"
            >
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
