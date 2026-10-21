"use client";

import { useState } from "react";
import {
  Mail,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Users,
  AlertCircle,
  Eye,
  Check,
  Search,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { SlideOver } from "@/components/ui/slide-over";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { MOCK_COMMUNICATIONS, MOCK_EVENTS, MOCK_PARTICIPANTS } from "@/lib/mock-data";
import { CommunicationJob, EventItem, Participant } from "@/types";
import { formatDate } from "@/lib/utils";
import { enqueueDispatchAction, retryFailedDispatchAction } from "@/app/actions/communication-actions";

interface CommunicationsClientProps {
  initialJobs: CommunicationJob[];
  initialEvents: EventItem[];
  initialParticipants: Participant[];
  initialError?: string | null;
  initialComposeOpen?: boolean;
  isPreview: boolean;
}

export default function CommunicationsClient({
  initialJobs,
  initialEvents,
  initialParticipants,
  initialError = null,
  initialComposeOpen = false,
  isPreview,
}: CommunicationsClientProps) {
  const [jobs, setJobs] = useState<CommunicationJob[]>(
    initialJobs.length > 0 ? initialJobs : (isPreview ? MOCK_COMMUNICATIONS : [])
  );
  const [events] = useState<EventItem[]>(
    initialEvents.length > 0 ? initialEvents : (isPreview ? MOCK_EVENTS : [])
  );
  const [participants] = useState<Participant[]>(
    initialParticipants.length > 0 ? initialParticipants : (isPreview ? MOCK_PARTICIPANTS : [])
  );
  const [error] = useState<string | null>(initialError);
  const [activeTab, setActiveTab] = useState("all");
  const [isComposeOpen, setIsComposeOpen] = useState(initialComposeOpen);
  const [isSending, setIsSending] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CommunicationJob | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const handleRetryJob = async (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRetryingJobId(jobId);
    try {
      const res = await retryFailedDispatchAction(jobId);
      if (res.success) {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: "queued", lastError: undefined } : j))
        );
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob((prev) => (prev ? { ...prev, status: "queued", lastError: undefined } : null));
        }
        setFeedbackMessage("Delivery queued for immediate retry.");
        setTimeout(() => setFeedbackMessage(null), 4000);
      } else {
        alert(res.message || "Failed to retry delivery.");
      }
    } catch {
      alert("Network error while retrying delivery.");
    } finally {
      setRetryingJobId(null);
    }
  };

  // Form state
  const [selectedEventId, setSelectedEventId] = useState(
    initialEvents[0]?.id || (isPreview ? MOCK_EVENTS[0]?.id : "") || ""
  );
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [bodyContent, setBodyContent] = useState("");
  const [dispatchType, setDispatchType] = useState<"instant" | "scheduled">("instant");

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0] || (isPreview ? MOCK_EVENTS[0] : null);

  // Dynamic recipient count based on participant dataset
  const eventParticipants = selectedEventId
    ? participants.filter((p) => p.eventId === selectedEventId)
    : [];
  const computedRecipients = eventParticipants.filter((p) => {
    if (audience === "checked_in") return p.attendanceStatus === "checked_in";
    if (audience === "pending") return p.attendanceStatus === "not_checked_in";
    return true;
  });

  const estimatedCount = computedRecipients.length > 0
    ? computedRecipients.length
    : (selectedEvent?.registeredCount ?? 0);

  const handleSendDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    if (!selectedEventId || !selectedEvent) {
      setFeedbackMessage("Please select a valid event before dispatching communications.");
      return;
    }

    if (estimatedCount === 0) {
      setFeedbackMessage("Cannot dispatch broadcast: no eligible recipients found for this audience segment.");
      return;
    }

    setIsSending(true);
    setFeedbackMessage(null);

    const res = await enqueueDispatchAction({
      eventId: selectedEventId,
      subject: subject.trim(),
      audience: audience as "all" | "checked_in" | "pending",
      bodyContent,
      scheduledAt: dispatchType === "instant" ? undefined : "Tomorrow at 09:00 AM",
    });

    setIsSending(false);

    if (!res.success) {
      setFeedbackMessage(res.message || "Failed to enqueue dispatch.");
      return;
    }

    const actualRecipients = res.data?.enqueuedCount || estimatedCount;

    const newJob: CommunicationJob = {
      id: `comm-${Date.now()}`,
      eventId: selectedEventId,
      eventTitle: selectedEvent.title,
      subject: subject.trim(),
      type: "announcement",
      recipientCount: actualRecipients,
      status: "queued",
      scheduledAt: dispatchType === "instant" ? "Queued for Dispatch" : "Tomorrow at 09:00 AM",
      deliveredAt: undefined,
    };

    setJobs((prev) => [newJob, ...prev]);
    setIsComposeOpen(false);
    setSubject("");
    setBodyContent("");
    setFeedbackMessage(
      `Dispatch "${newJob.subject}" successfully queued for ${newJob.recipientCount} attendees.`
    );
  };

  const filteredJobs = jobs.filter((c) => {
    if (activeTab === "all") return true;
    if (activeTab === "queued") return c.status === "queued" || c.status === "processing";
    return c.status === activeTab;
  });

  const filterTabs = [
    { id: "all", label: `All (${jobs.length})` },
    { id: "sent", label: `Sent / Accepted (${jobs.filter((j) => j.status === "sent").length})` },
    { id: "queued", label: `Queued (${jobs.filter((j) => j.status === "queued" || j.status === "processing").length})` },
    { id: "failed", label: `Failed (${jobs.filter((j) => j.status === "failed").length})` },
  ];

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              Communications & Outbox
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
              {isPreview ? "Preview Mode" : "Production Live"}
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#656B73] dark:text-[#989EA7]">
            Transactional email dispatch, audience segment announcements, and audited outbox telemetry.
          </p>
        </div>

        <Button
          variant="charcoal"
          className="rounded-full gap-2 text-xs sm:text-sm font-semibold shadow-sm h-9 sm:h-10 px-4 sm:px-5"
          onClick={() => setIsComposeOpen(true)}
          disabled={events.length === 0}
        >
          <Plus className="h-4 w-4" />
          <span>New Dispatch</span>
        </Button>
      </div>

      {/* Production Database Error Banner (Never silently hides) */}
      {error && (
        <div
          role="alert"
          className="rounded-[20px] border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-5 shadow-sm text-rose-900 dark:text-rose-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs space-y-1">
              <h3 className="font-bold text-sm">Database Connection Error</h3>
              <p className="text-rose-800 dark:text-rose-300">
                Unable to load communications data from the persistent database: <code className="bg-rose-100 dark:bg-rose-900/60 px-1 py-0.5 rounded font-mono">{error}</code>
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 pt-1">
                Notice: Mock communications data is strictly not substituted in production to preserve data integrity.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="rounded-full text-xs font-semibold gap-1.5 border-rose-300 dark:border-rose-800"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      )}

      {/* Empty State Banner when no events exist */}
      {!error && events.length === 0 && (
        <div className="rounded-[20px] border border-dashed border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-8 text-center shadow-sm space-y-3">
          <Mail className="mx-auto h-8 w-8 text-[#8A9098] dark:text-[#656B73] opacity-60" />
          <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">No Active Events Available</h3>
          <p className="text-xs text-[#656B73] dark:text-[#A6ADB5] max-w-md mx-auto">
            Broadcasting communications requires at least one active event to target recipients.
          </p>
          <Link href="/events/new">
            <Button variant="charcoal" size="sm" className="rounded-full text-xs font-semibold mt-2 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Event</span>
            </Button>
          </Link>
        </div>
      )}

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

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <AnimatedTabs
          tabs={filterTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          layoutId="commFilterPill"
        />
      </div>

      {/* Outbox Status Cards */}
      <div className="space-y-3.5">
        {filteredJobs.length === 0 ? (
          <div className="rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-12 text-center text-xs text-[#8A9098] dark:text-white/60 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
            No communication dispatches found in this tab.
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              tabIndex={0}
              role="button"
              aria-label={`View dispatch details for ${job.subject}`}
              onClick={() => setSelectedJob(job)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedJob(job);
                }
              }}
              className="cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between rounded-[20px] border border-[#E5E7EA] dark:border-[#363C46] bg-white dark:bg-gradient-to-b dark:from-[#282D34] dark:to-[#1A1D22] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] gap-4 transition-all duration-200 ease-out hover:border-[#CBD0D6] dark:hover:border-[#48515E] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] motion-reduce:transition-none motion-reduce:transform-none select-none"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F5F6] dark:bg-[#181B1F] text-[#25292F] dark:text-white/90">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#17191C] dark:text-white hover:underline">
                    {job.subject}
                  </h3>
                  <span className="text-xs font-medium text-[#656B73] dark:text-[#989EA7]">
                    Event: {job.eventTitle}
                  </span>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8A9098] dark:text-[#656B73] pt-1">
                    <span>
                      Audience: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{job.recipientCount}</strong> recipients
                    </span>
                    {job.recipientEmail && (
                      <>
                        <span>•</span>
                        <span>
                          To: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{job.recipientName ? `${job.recipientName} (${job.recipientEmail})` : job.recipientEmail}</strong>
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>
                      Type: <strong className="capitalize text-[#17191C] dark:text-[#F1F2F3]">{job.type.replace("_", " ")}</strong>
                    </span>
                    {job.deliveredAt && (
                      <>
                        <span>•</span>
                        <span>
                          Dispatched: <strong className="text-[#17191C] dark:text-[#F1F2F3]">{job.deliveredAt}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {job.status === "sent" ? (
                  <Badge variant="default" className="gap-1 py-1 bg-emerald-600 text-white hover:bg-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Sent / Accepted
                  </Badge>
                ) : job.status === "failed" ? (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="destructive" className="gap-1 py-1 bg-rose-600 text-white hover:bg-rose-700">
                      <AlertCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleRetryJob(job.id, e)}
                      disabled={retryingJobId === job.id}
                      className="h-6 px-2 text-[10px] font-semibold text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md gap-1"
                      title="Retry sending this communication"
                    >
                      <RefreshCw className={`h-2.5 w-2.5 ${retryingJobId === job.id ? "animate-spin" : ""}`} />
                      <span>{retryingJobId === job.id ? "Retrying..." : "Retry"}</span>
                    </Button>
                  </div>
                ) : job.status === "processing" ? (
                  <Badge variant="secondary" className="gap-1 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    <Clock className="h-3 w-3 animate-spin" />
                    Processing
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 py-1">
                    <Clock className="h-3 w-3" />
                    Queued
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compose Announcement SlideOver Drawer */}
      <SlideOver
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        title="Compose Event Dispatch"
        subtitle="Transactional broadcast to registered attendees"
        widthClass="max-w-lg"
      >
        <form onSubmit={handleSendDispatch} className="space-y-5 text-xs">
          <div>
            <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">Target Event *</label>
            <CustomSelect
              options={events.map((e) => ({ value: e.id, label: e.title }))}
              value={selectedEventId}
              onChange={setSelectedEventId}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">Audience Segment *</label>
            <CustomSelect
              options={[
                { value: "all", label: "All Confirmed Registrants" },
                { value: "checked_in", label: "Checked-in Attendees Only" },
                { value: "pending", label: "Pending Check-in Only" },
              ]}
              value={audience}
              onChange={setAudience}
            />
            <span className="text-[11px] text-[#8A9098] dark:text-[#656B73] mt-1 block">
              Estimated Recipient Count:{" "}
              <strong>
                {selectedEvent ? `${estimatedCount} attendees` : "No event selected (0 attendees)"}
              </strong>
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">Subject Line *</label>
            <Input
              placeholder="e.g., Important Venue & Entry Pass Instructions"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-10 text-xs"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] block mb-1.5">Message Body</label>
            <textarea
              rows={5}
              placeholder="Write announcement details for your attendees..."
              value={bodyContent}
              onChange={(e) => setBodyContent(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] p-3 text-[#17191C] dark:text-[#F1F2F3] focus:outline-none focus:ring-1 focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dispatchType"
                checked={dispatchType === "instant"}
                onChange={() => setDispatchType("instant")}
                className="text-[#25292F]"
              />
              <span className="text-xs text-[#17191C] dark:text-[#F1F2F3] font-medium">Send Immediately</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dispatchType"
                checked={dispatchType === "scheduled"}
                onChange={() => setDispatchType("scheduled")}
                className="text-[#25292F]"
              />
              <span className="text-xs text-[#17191C] dark:text-[#F1F2F3] font-medium">Schedule for Tomorrow</span>
            </label>
          </div>

          <div className="pt-4 border-t border-[#E5E7EA] dark:border-[#30353A] flex items-center gap-3">
            <Button
              type="submit"
              variant="charcoal"
              className="flex-1 rounded-full text-xs font-semibold h-10"
              disabled={isSending || !selectedEvent || estimatedCount === 0}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {isSending ? "Queuing Dispatch..." : "Dispatch Broadcast"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsComposeOpen(false)}
              className="rounded-full text-xs h-10 px-4"
            >
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>

      {/* Dispatch Detail SlideOver */}
      <SlideOver
        isOpen={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        title="Dispatch Telemetry"
        subtitle={selectedJob?.subject}
        widthClass="max-w-md"
      >
        {selectedJob && (
          <div className="space-y-5 text-xs">
            <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-[#8A9098] dark:text-[#656B73]">Target Event:</span>
                <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3]">{selectedJob.eventTitle}</span>
              </div>
              {selectedJob.recipientEmail && (
                <div className="flex justify-between">
                  <span className="text-[#8A9098] dark:text-[#656B73]">Recipient:</span>
                  <span className="font-mono text-[#17191C] dark:text-[#F1F2F3]">
                    {selectedJob.recipientName ? `${selectedJob.recipientName} <${selectedJob.recipientEmail}>` : selectedJob.recipientEmail}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#8A9098] dark:text-[#656B73]">Recipients Count:</span>
                <span className="font-mono font-bold text-[#17191C] dark:text-[#F1F2F3]">{selectedJob.recipientCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A9098] dark:text-[#656B73]">Dispatch Status:</span>
                <span className="capitalize font-semibold text-[#17191C] dark:text-[#F1F2F3]">{selectedJob.status}</span>
              </div>
              {selectedJob.attempts !== undefined && (
                <div className="flex justify-between">
                  <span className="text-[#8A9098] dark:text-[#656B73]">Delivery Attempts:</span>
                  <span className="font-mono font-bold text-[#17191C] dark:text-[#F1F2F3]">{selectedJob.attempts} / 5</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#8A9098] dark:text-[#656B73]">Delivery Timing:</span>
                <span className="text-[#656B73] dark:text-[#989EA7]">{selectedJob.scheduledAt}</span>
              </div>
              {selectedJob.deliveredAt && (
                <div className="flex justify-between">
                  <span className="text-[#8A9098] dark:text-[#656B73]">Delivered:</span>
                  <span className="text-[#17191C] dark:text-[#F1F2F3] font-medium">{selectedJob.deliveredAt}</span>
                </div>
              )}
            </div>

            {selectedJob.lastError && (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Last Delivery Error</span>
                </div>
                <p className="text-[11px] font-mono text-rose-800 dark:text-rose-300 break-words whitespace-pre-wrap bg-white/70 dark:bg-black/30 p-2.5 rounded-lg border border-rose-200/50 dark:border-rose-900/30">
                  {selectedJob.lastError}
                </p>
              </div>
            )}

            {selectedJob.status === "failed" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRetryJob(selectedJob.id)}
                disabled={retryingJobId === selectedJob.id}
                className="w-full rounded-xl text-xs font-semibold gap-1.5 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${retryingJobId === selectedJob.id ? "animate-spin" : ""}`} />
                <span>{retryingJobId === selectedJob.id ? "Retrying..." : "Retry Failed Delivery"}</span>
              </Button>
            )}

            <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">
                Broadcast Content Preview
              </span>
              <p className="text-xs text-[#656B73] dark:text-[#989EA7] leading-relaxed">
                Dear attendee, this is an official operational broadcast regarding {selectedJob.eventTitle}. Please present your digital pass QR code at the desk upon arrival.
              </p>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
