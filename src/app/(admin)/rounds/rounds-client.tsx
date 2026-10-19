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
  AlertTriangle,
  RefreshCw,
  Layers,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { SlideOver } from "@/components/ui/slide-over";
import { Input } from "@/components/ui/input";
import { Round, EventItem } from "@/types";
import {
  createRoundAction,
  updateRoundAction,
  deleteRoundAction,
  setRoundStatusAction,
  reorderRoundsAction,
} from "@/app/actions/round-actions";

interface RoundsClientProps {
  initialEvents: EventItem[];
  initialRounds: Round[];
  isPreview: boolean;
  initialError?: string | null;
}

export default function RoundsClient({
  initialEvents,
  initialRounds,
  isPreview,
  initialError,
}: RoundsClientProps) {
  const [events] = useState<EventItem[]>(initialEvents);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEvents[0]?.id || "evt-01"
  );
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [isEditStageOpen, setIsEditStageOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Add / Edit
  const [stageName, setStageName] = useState("");
  const [stageVenue, setStageVenue] = useState("");
  const [stageEligible, setStageEligible] = useState("10");
  const [stageAdvanced, setStageAdvanced] = useState("0");

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const eventRounds = rounds
    .filter((r) => r.eventId === selectedEventId)
    .sort((a, b) => a.order - b.order);

  const eventOptions = events.map((e) => ({
    value: e.id,
    label: `${e.title} (${e.hasRounds ? "Multi-Stage" : "Single Stage"})`,
  }));

  // Handle Add Stage
  const handleOpenAddStage = () => {
    setStageName("");
    setStageVenue(selectedEvent?.venue || "");
    setStageEligible("10");
    setStageAdvanced("0");
    setActionError(null);
    setIsAddStageOpen(true);
  };

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await createRoundAction({
        eventId: selectedEventId,
        name: stageName.trim(),
        venue: stageVenue.trim() || "Main Auditorium",
        eligibleCount: parseInt(stageEligible) || 10,
        advancedCount: parseInt(stageAdvanced) || 0,
        order: eventRounds.length + 1,
      });

      if (!res.success) {
        setActionError(res.message);
        return;
      }

      setRounds((prev) => [...prev, res.data]);
      setIsAddStageOpen(false);
      setFeedbackMessage(`Stage "${res.data.name}" successfully created.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to create stage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Stage
  const handleOpenEditStage = (round: Round) => {
    setStageName(round.name);
    setStageVenue(round.venue);
    setStageEligible(String(round.eligibleCount));
    setStageAdvanced(String(round.advancedCount || 0));
    setActionError(null);
    setIsEditStageOpen(true);
  };

  const handleUpdateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRound || !stageName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await updateRoundAction({
        id: selectedRound.id,
        eventId: selectedRound.eventId,
        name: stageName.trim(),
        venue: stageVenue.trim() || "Main Auditorium",
        eligibleCount: parseInt(stageEligible) || 10,
        advancedCount: parseInt(stageAdvanced) || 0,
      });

      if (!res.success) {
        setActionError(res.message);
        return;
      }

      setRounds((prev) => prev.map((r) => (r.id === res.data.id ? res.data : r)));
      setSelectedRound(res.data);
      setIsEditStageOpen(false);
      setFeedbackMessage(`Stage "${res.data.name}" updated successfully.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update stage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Advance Stage Status
  const handleAdvanceProgression = async (round: Round) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);

    const nextStatus =
      round.status === "upcoming"
        ? "in_progress"
        : round.status === "in_progress"
        ? "completed"
        : "upcoming";

    try {
      const res = await setRoundStatusAction({
        id: round.id,
        eventId: round.eventId,
        status: nextStatus,
        advancedCount: nextStatus === "completed" ? round.eligibleCount : round.advancedCount,
      });

      if (!res.success) {
        setActionError(res.message);
        return;
      }

      setRounds((prev) => prev.map((r) => (r.id === res.data.id ? res.data : r)));
      setSelectedRound(res.data);
      setFeedbackMessage(
        `Stage "${res.data.name}" status updated to ${nextStatus.replace("_", " ")}.`
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update progression.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Stage
  const handleDeleteStage = async (round: Round) => {
    if (isSubmitting) return;
    if (!window.confirm(`Are you sure you want to delete stage "${round.name}"?`)) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await deleteRoundAction({
        id: round.id,
        eventId: round.eventId,
      });

      if (!res.success) {
        setActionError(res.message);
        return;
      }

      setRounds((prev) => prev.filter((r) => r.id !== round.id));
      setSelectedRound(null);
      setFeedbackMessage(`Stage "${round.name}" removed successfully.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete stage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reorder Stage
  const handleMoveStage = async (round: Round, direction: "up" | "down") => {
    if (isSubmitting) return;
    const currentIndex = eventRounds.findIndex((r) => r.id === round.id);
    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= eventRounds.length) return;

    const newRounds = [...eventRounds];
    const [moved] = newRounds.splice(currentIndex, 1);
    newRounds.splice(targetIndex, 0, moved);

    const newOrderIds = newRounds.map((r) => r.id);

    setIsSubmitting(true);
    try {
      const res = await reorderRoundsAction({
        eventId: selectedEventId,
        roundIds: newOrderIds,
      });

      if (!res.success) {
        setActionError(res.message);
        return;
      }

      setRounds((prev) => {
        const otherEventRounds = prev.filter((r) => r.eventId !== selectedEventId);
        return [...otherEventRounds, ...res.data];
      });
      setFeedbackMessage("Stage sequence updated.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to reorder stages.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Failed to load competition stages from PostgreSQL:
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
              Rounds & Progression
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              {isPreview ? "Preview Mode" : "PostgreSQL Live"}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#989EA7]">
            Multi-stage competition pipelines, jury evaluations, qualifying thresholds, and stage progression.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="charcoal"
            className="rounded-full gap-2 text-xs sm:text-sm font-semibold shadow-sm h-9 sm:h-10 px-4 sm:px-5"
            onClick={handleOpenAddStage}
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
              setActionError(null);
            }}
          />
        </div>
      </div>

      {/* Feedback Banner */}
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

      {/* Error Alert */}
      {actionError && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 p-4 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Single-Stage / No-Rounds Informative State */}
      {eventRounds.length === 0 ? (
        <div className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F5F6] dark:bg-[#151719] text-[#25292F] dark:text-[#E8EAED]">
            <GitBranch className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Single-Stage Event — {selectedEvent?.title}
            </h2>
            <p className="mt-1 text-xs text-[#656B73] dark:text-[#989EA7] leading-relaxed">
              This event is configured as a single open session without elimination stages. All registered and checked-in attendees participate directly in the main activity.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAddStage}
            className="rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold"
          >
            Configure Multi-Stage Pipeline
          </Button>
        </div>
      ) : (
        /* Multi-Stage Progression Pipeline */
        <div className="rounded-[24px] border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#30353A] pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">
                Active Competition Pipeline
              </span>
              <h2 className="text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">
                {selectedEvent?.title} — {eventRounds.length}-Stage Progression
              </h2>
            </div>
            <Badge variant="secondary" className="text-xs">
              {eventRounds.filter((r) => r.status === "completed").length} of {eventRounds.length} Completed
            </Badge>
          </div>

          {/* Cards Grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {eventRounds.map((round, index) => {
              const isCompleted = round.status === "completed";
              const isActive = round.status === "in_progress";

              return (
                <div
                  key={round.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 ${
                    isActive
                      ? "border-[#25292F] dark:border-[#E8EAED] bg-[#F9FAFB] dark:bg-[#151719] ring-1 ring-[#25292F] dark:ring-[#E8EAED]"
                      : "border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25292F] dark:bg-[#30353A] text-white dark:text-[#F1F2F3] text-xs font-bold">
                          {round.order}
                        </span>
                        {/* Reordering Controls */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0 || isSubmitting}
                            onClick={() => handleMoveStage(round, "up")}
                            title="Move up"
                            className="p-1 rounded text-[#8A9098] hover:text-[#17191C] dark:hover:text-white disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === eventRounds.length - 1 || isSubmitting}
                            onClick={() => handleMoveStage(round, "down")}
                            title="Move down"
                            className="p-1 rounded text-[#8A9098] hover:text-[#17191C] dark:hover:text-white disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isCompleted ? "secondary" : isActive ? "default" : "outline"}
                          className="text-[9px] uppercase font-bold"
                        >
                          {round.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">
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
                          <strong className="text-[#17191C] dark:text-[#F1F2F3]">{round.eligibleCount}</strong> Eligible
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

                  <div className="mt-4 pt-3 border-t border-[#E5E7EA] dark:border-[#262A2E] flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRound(round)}
                      className="text-xs font-semibold h-8 px-2.5 gap-1.5 text-[#17191C] dark:text-[#F1F2F3]"
                    >
                      <span>Stage Details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdvanceProgression(round)}
                        disabled={isSubmitting}
                        className="text-[11px] font-semibold h-7 px-2"
                      >
                        {round.status === "upcoming"
                          ? "Start"
                          : round.status === "in_progress"
                          ? "Complete"
                          : "Reopen"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRound(round);
                          handleOpenEditStage(round);
                        }}
                        className="h-7 w-7 p-0 text-[#8A9098] hover:text-[#17191C] dark:hover:text-white"
                        title="Edit Stage"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStage(round)}
                        disabled={isSubmitting}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Delete Stage"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stage Details SlideOver */}
      <SlideOver
        isOpen={Boolean(selectedRound) && !isEditStageOpen}
        onClose={() => setSelectedRound(null)}
        title={selectedRound?.name || "Stage Progression"}
        subtitle={`Stage ${selectedRound?.order} • ${selectedRound?.eventTitle}`}
        widthClass="max-w-lg"
      >
        {selectedRound && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">
                Stage Evaluation Details
              </span>
              <p className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3] capitalize">
                {selectedRound.status.replace("_", " ")} Evaluation
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 text-[#656B73] dark:text-[#989EA7]">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#8A9098]">Venue</span>
                  <strong className="text-[#17191C] dark:text-[#F1F2F3]">{selectedRound.venue}</strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#8A9098]">Sequence</span>
                  <strong className="text-[#17191C] dark:text-[#F1F2F3]">Round {selectedRound.order}</strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#8A9098]">Eligible Participants</span>
                  <strong className="text-[#17191C] dark:text-[#F1F2F3]">{selectedRound.eligibleCount}</strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-[#8A9098]">Advanced to Next Round</span>
                  <strong className="text-[#17191C] dark:text-[#F1F2F3]">{selectedRound.advancedCount || 0}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#E5E7EA] dark:border-[#30353A]">
              <Button
                variant="charcoal"
                className="flex-1 rounded-full text-xs font-semibold h-10 shadow-sm"
                onClick={() => handleAdvanceProgression(selectedRound)}
                disabled={isSubmitting}
              >
                {selectedRound.status === "upcoming"
                  ? "Activate Round (In Progress)"
                  : selectedRound.status === "in_progress"
                  ? "Conclude Stage & Advance Teams"
                  : "Reopen Stage"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full text-xs font-semibold h-10 px-4"
                onClick={() => handleOpenEditStage(selectedRound)}
              >
                Edit
              </Button>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Add Stage Drawer */}
      <SlideOver
        isOpen={isAddStageOpen}
        onClose={() => setIsAddStageOpen(false)}
        title="Add Competition Stage"
        subtitle={`Adding stage to ${selectedEvent?.title}`}
        widthClass="max-w-md"
      >
        <form onSubmit={handleCreateStage} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">
              Stage Name *
            </label>
            <Input
              placeholder="e.g., Round 3 — Finals & Pitch Defense"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
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
              value={stageVenue}
              onChange={(e) => setStageVenue(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">
                Eligible Count
              </label>
              <Input
                type="number"
                min="0"
                placeholder="10"
                value={stageEligible}
                onChange={(e) => setStageEligible(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">
                Advanced Quota
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={stageAdvanced}
                onChange={(e) => setStageAdvanced(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EA] dark:border-[#30353A] flex items-center gap-3">
            <Button
              type="submit"
              variant="charcoal"
              disabled={isSubmitting}
              className="flex-1 rounded-full text-xs font-semibold h-10"
            >
              {isSubmitting ? "Saving..." : "Save Stage"}
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

      {/* Edit Stage Drawer */}
      <SlideOver
        isOpen={isEditStageOpen}
        onClose={() => setIsEditStageOpen(false)}
        title="Edit Competition Stage"
        subtitle={`Updating ${selectedRound?.name}`}
        widthClass="max-w-md"
      >
        <form onSubmit={handleUpdateStage} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">
              Stage Name *
            </label>
            <Input
              placeholder="e.g., Round 1 — Idea Pitch & Wireframes"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              className="h-10 text-xs"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">
              Stage Venue
            </label>
            <Input
              placeholder="e.g., Main Stage Auditorium"
              value={stageVenue}
              onChange={(e) => setStageVenue(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">
                Eligible Count
              </label>
              <Input
                type="number"
                min="0"
                value={stageEligible}
                onChange={(e) => setStageEligible(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">
                Advanced Quota
              </label>
              <Input
                type="number"
                min="0"
                value={stageAdvanced}
                onChange={(e) => setStageAdvanced(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EA] dark:border-[#30353A] flex items-center gap-3">
            <Button
              type="submit"
              variant="charcoal"
              disabled={isSubmitting}
              className="flex-1 rounded-full text-xs font-semibold h-10"
            >
              {isSubmitting ? "Updating..." : "Update Stage"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditStageOpen(false)}
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
