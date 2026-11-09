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
import { EmptyState } from "@/components/feedback/feedback-states";
import { MOCK_COMMUNICATIONS, MOCK_EVENTS, MOCK_PARTICIPANTS } from "@/lib/mock-data";
import { CommunicationJob, EventItem, Participant } from "@/types";
import { formatDate, cn } from "@/lib/utils";
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
    { id: "all", label: "All", count: jobs.length },
    { id: "sent", label: "Sent / Accepted", count: jobs.filter((j) => j.status === "sent").length },
    { id: "queued", label: "Queued", count: jobs.filter((j) => j.status === "queued" || j.status === "processing").length },
    { id: "failed", label: "Failed", count: jobs.filter((j) => j.status === "failed").length },
  ];

  return (
    <div className="flex flex-col space-y-7 pb-12 max-w-[1400px] mx-auto">
      {/* Header with Enterprise Breadcrumb and Clear Hierarchy */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <nav className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
            <Link href="/" className="hover:text-[#111827] transition-colors">Workspace</Link>
            <span className="text-[#D1D5DB]">/</span>
            <span className="text-[#111827]">Communications &amp; Outbox</span>
          </nav>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#111827]">
              Communications &amp; Outbox
            </h1>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 tracking-wider",
                isPreview
                  ? "bg-[#F3F4F6] border-[#E5E7EB] text-[#6B7280]"
                  : "bg-emerald-50 border-emerald-200/80 text-emerald-800"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isPreview ? "bg-[#9CA3AF]" : "bg-emerald-500 animate-pulse"
                )}
              />
              {isPreview ? "Preview Mode" : "Production Live"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#6B7280] max-w-2xl leading-relaxed">
            Transactional email dispatch, audience segment announcements, and audited outbox telemetry.
          </p>
        </div>

        <Button
          variant="default"
          className="rounded-lg gap-2 text-xs sm:text-sm font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.12)] h-10 px-4 bg-[#18181B] text-white hover:bg-[#27272A] active:bg-[#09090B] transition-all shrink-0 self-start sm:self-auto"
          onClick={() => setIsComposeOpen(true)}
          disabled={events.length === 0}
        >
          <Plus className="h-4 w-4 stroke-[2.25]" />
          <span>New Dispatch</span>
        </Button>
      </div>

      {/* Production Database Error Banner (Never silently hides) */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-5 shadow-sm text-rose-900 dark:text-rose-200"
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
              className="rounded-lg text-xs font-semibold gap-1.5 border-rose-300 dark:border-rose-800"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      )}

      {/* Empty State Banner when no events exist */}
      {!error && events.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-8 text-center shadow-xs space-y-3">
          <Mail className="mx-auto h-8 w-8 text-[#9CA3AF]" />
          <h3 className="text-sm font-bold text-[#111827]">No Active Events Available</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">
            Broadcasting communications requires at least one active event to target recipients.
          </p>
          <Link href="/events/new">
            <Button variant="charcoal" size="sm" className="rounded-lg text-xs font-semibold mt-2 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Event</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Action Feedback Banner */}
      {feedbackMessage && (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-[#111827] p-4 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-[11px] text-[#6B7280] hover:text-[#111827] underline ml-3 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter / Segmented Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <AnimatedTabs
          tabs={filterTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          layoutId="commFilterPill"
        />
        <div className="text-xs text-[#6B7280] font-medium hidden sm:flex items-center gap-1.5 pr-1">
          <span>Showing</span>
          <strong className="text-[#111827]">{filteredJobs.length}</strong>
          <span>of</span>
          <strong className="text-[#111827]">{jobs.length}</strong>
          <span>dispatches</span>
        </div>
      </div>

      {/* Outbox Status Cards */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No dispatches found"
            description={
              activeTab !== "all"
                ? "No communication dispatches match the selected filter tab."
                : "No announcements or notifications have been dispatched yet. Click 'New Dispatch' to broadcast an email update."
            }
            actionLabel={activeTab !== "all" ? "View All Dispatches" : undefined}
            onAction={() => setActiveTab("all")}
          />
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
              className="group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#D1D5DB] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-150 gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B]/20 select-none"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F6] border border-[#E5E7EB] text-[#374151] group-hover:bg-[#EAECEF] group-hover:text-[#111827] transition-colors">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-[15px] font-semibold text-[#111827] group-hover:text-black transition-colors leading-snug">
                      {job.subject}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280]">
                    <span className="text-[#9CA3AF]">Event:</span>
                    <span className="text-[#374151] font-medium">{job.eventTitle}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#6B7280] pt-1">
                    <span>
                      Audience: <strong className="text-[#111827] font-semibold">{job.recipientCount}</strong> recipients
                    </span>
                    {job.recipientEmail && (
                      <>
                        <span className="text-[#D1D5DB]">•</span>
                        <span className="truncate max-w-[260px] sm:max-w-[340px]" title={job.recipientEmail}>
                          To: <strong className="text-[#111827] font-semibold">{job.recipientName ? `${job.recipientName} (${job.recipientEmail})` : job.recipientEmail}</strong>
                        </span>
                      </>
                    )}
                    <span className="text-[#D1D5DB]">•</span>
                    <span>
                      Type: <strong className="capitalize text-[#111827] font-semibold">{job.type.replace("_", " ")}</strong>
                    </span>
                    {job.deliveredAt && (
                      <>
                        <span className="text-[#D1D5DB]">•</span>
                        <span>
                          Dispatched: <strong className="text-[#111827] font-semibold">{job.deliveredAt}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                {job.status === "sent" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Sent / Accepted</span>
                  </span>
                ) : job.status === "failed" ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Failed</span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleRetryJob(job.id, e)}
                      disabled={retryingJobId === job.id}
                      className="h-7 px-2.5 text-xs font-medium text-rose-700 border-rose-200 hover:bg-rose-50 rounded-md gap-1.5"
                      title="Retry sending this communication"
                    >
                      <RefreshCw className={`h-3 w-3 ${retryingJobId === job.id ? "animate-spin" : ""}`} />
                      <span>{retryingJobId === job.id ? "Retrying..." : "Retry"}</span>
                    </Button>
                  </div>
                ) : job.status === "processing" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F4F5F6] text-[#374151] border border-[#E5E7EB]">
                    <Clock className="h-3.5 w-3.5 text-[#6B7280]" />
                    <span>Queued</span>
                  </span>
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
            <label className="text-xs font-semibold text-[#111827] block mb-1.5">Target Event *</label>
            <CustomSelect
              options={events.map((e) => ({ value: e.id, label: e.title }))}
              value={selectedEventId}
              onChange={setSelectedEventId}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111827] block mb-1.5">Audience Segment *</label>
            <CustomSelect
              options={[
                { value: "all", label: "All Confirmed Registrants" },
                { value: "checked_in", label: "Checked-in Attendees Only" },
                { value: "pending", label: "Pending Check-in Only" },
              ]}
              value={audience}
              onChange={setAudience}
            />
            <span className="text-[11px] text-[#6B7280] mt-1 block">
              Estimated Recipient Count:{" "}
              <strong className="text-[#111827]">
                {selectedEvent ? `${estimatedCount} attendees` : "No event selected (0 attendees)"}
              </strong>
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111827] block mb-1.5">Subject Line *</label>
            <Input
              placeholder="e.g., Important Venue & Entry Pass Instructions"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-10 text-xs rounded-lg"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111827] block mb-1.5">Message Body</label>
            <textarea
              rows={5}
              placeholder="Write announcement details for your attendees..."
              value={bodyContent}
              onChange={(e) => setBodyContent(e.target.value)}
              className="w-full text-xs rounded-lg border border-[#E5E7EB] bg-white p-3 text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#18181B]"
            />
          </div>

          <div className="flex items-center gap-5 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dispatchType"
                checked={dispatchType === "instant"}
                onChange={() => setDispatchType("instant")}
                className="text-[#18181B] accent-[#18181B]"
              />
              <span className="text-xs text-[#111827] font-medium">Send Immediately</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dispatchType"
                checked={dispatchType === "scheduled"}
                onChange={() => setDispatchType("scheduled")}
                className="text-[#18181B] accent-[#18181B]"
              />
              <span className="text-xs text-[#111827] font-medium">Schedule for Tomorrow</span>
            </label>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] flex items-center gap-3">
            <Button
              type="submit"
              variant="default"
              className="flex-1 rounded-lg text-xs font-semibold h-10 bg-[#18181B] text-white hover:bg-[#27272A]"
              disabled={isSending || !selectedEvent || estimatedCount === 0}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {isSending ? "Queuing Dispatch..." : "Dispatch Broadcast"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsComposeOpen(false)}
              className="rounded-lg text-xs h-10 px-4 border-[#E5E7EB] text-[#6B7280] hover:text-[#111827]"
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
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Target Event:</span>
                <span className="font-semibold text-[#111827]">{selectedJob.eventTitle}</span>
              </div>
              {selectedJob.recipientEmail && (
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Recipient:</span>
                  <span className="font-mono text-[#111827]">
                    {selectedJob.recipientName ? `${selectedJob.recipientName} <${selectedJob.recipientEmail}>` : selectedJob.recipientEmail}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Recipients Count:</span>
                <span className="font-mono font-bold text-[#111827]">{selectedJob.recipientCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Dispatch Status:</span>
                <span className="capitalize font-semibold text-[#111827]">{selectedJob.status}</span>
              </div>
              {selectedJob.attempts !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Delivery Attempts:</span>
                  <span className="font-mono font-bold text-[#111827]">{selectedJob.attempts} / 5</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Delivery Timing:</span>
                <span className="text-[#6B7280]">{selectedJob.scheduledAt}</span>
              </div>
              {selectedJob.deliveredAt && (
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Delivered:</span>
                  <span className="text-[#111827] font-medium">{selectedJob.deliveredAt}</span>
                </div>
              )}
            </div>

            {selectedJob.lastError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Last Delivery Error</span>
                </div>
                <p className="text-[11px] font-mono text-rose-800 break-words whitespace-pre-wrap bg-white/70 p-2.5 rounded-lg border border-rose-200/50">
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
                className="w-full rounded-lg text-xs font-semibold gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 h-9"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${retryingJobId === selectedJob.id ? "animate-spin" : ""}`} />
                <span>{retryingJobId === selectedJob.id ? "Retrying..." : "Retry Failed Delivery"}</span>
              </Button>
            )}

            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                Broadcast Content Preview
              </span>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Dear attendee, this is an official operational broadcast regarding {selectedJob.eventTitle}. Please present your digital pass QR code at the desk upon arrival.
              </p>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
