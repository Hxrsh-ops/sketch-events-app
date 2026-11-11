"use client";

import { useState, useMemo } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Mail,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  AlertCircle,
  AlertTriangle,
  Eye,
  RefreshCw,
  MoreVertical,
  Trash2,
  Ban,
  Archive,
  ArchiveRestore,
  X,
  CheckSquare,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { SlideOver } from "@/components/ui/slide-over";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/feedback-states";
import { MOCK_COMMUNICATIONS, MOCK_EVENTS, MOCK_PARTICIPANTS } from "@/lib/mock-data";
import { CommunicationJob, EventItem, Participant } from "@/types";
import { cn } from "@/lib/utils";
import {
  enqueueDispatchAction,
  retryFailedDispatchAction,
  cancelOutboxJobsAction,
  deleteOutboxJobsAction,
  archiveOutboxJobsAction,
} from "@/app/actions/communication-actions";

interface CommunicationsClientProps {
  initialJobs: CommunicationJob[];
  initialEvents: EventItem[];
  initialParticipants: Participant[];
  initialError?: string | null;
  initialComposeOpen?: boolean;
  isPreview: boolean;
}

interface ToastItem {
  id: string;
  variant: "success" | "warning" | "error";
  title: string;
  description?: string;
}

type PendingAction =
  | { type: "cancel"; jobIds: string[] }
  | { type: "delete"; jobIds: string[] }
  | { type: "archive"; jobIds: string[]; archive: boolean };

export default function CommunicationsClient({
  initialJobs,
  initialEvents,
  initialParticipants,
  initialError = null,
  initialComposeOpen = false,
  isPreview,
}: CommunicationsClientProps) {
  const [jobs, setJobs] = useState<CommunicationJob[]>(
    initialJobs.length > 0 ? initialJobs : isPreview ? MOCK_COMMUNICATIONS : []
  );
  const [events] = useState<EventItem[]>(
    initialEvents.length > 0 ? initialEvents : isPreview ? MOCK_EVENTS : []
  );
  const [participants] = useState<Participant[]>(
    initialParticipants.length > 0 ? initialParticipants : isPreview ? MOCK_PARTICIPANTS : []
  );
  const [error] = useState<string | null>(initialError);
  const [activeTab, setActiveTab] = useState("all");
  const [isComposeOpen, setIsComposeOpen] = useState(initialComposeOpen);
  const [isSending, setIsSending] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CommunicationJob | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Compose form state
  const [selectedEventId, setSelectedEventId] = useState(
    initialEvents[0]?.id || (isPreview ? MOCK_EVENTS[0]?.id : "") || ""
  );
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [bodyContent, setBodyContent] = useState("");
  const [dispatchType, setDispatchType] = useState<"instant" | "scheduled">("instant");

  const pushToast = (variant: ToastItem["variant"], title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, variant, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const selectedEvent =
    events.find((e) => e.id === selectedEventId) ||
    events[0] ||
    (isPreview ? MOCK_EVENTS[0] : null);

  const eventParticipants = selectedEventId
    ? participants.filter((p) => p.eventId === selectedEventId)
    : [];
  const computedRecipients = eventParticipants.filter((p) => {
    if (audience === "checked_in") return p.attendanceStatus === "checked_in";
    if (audience === "pending") return p.attendanceStatus === "not_checked_in";
    return true;
  });

  const estimatedCount =
    computedRecipients.length > 0 ? computedRecipients.length : (selectedEvent?.registeredCount ?? 0);

  const activeJobs = useMemo(() => jobs.filter((j) => !j.archivedAt), [jobs]);
  const archivedJobs = useMemo(() => jobs.filter((j) => Boolean(j.archivedAt)), [jobs]);

  const filteredJobs = useMemo(() => {
    if (activeTab === "archived") return archivedJobs;
    if (activeTab === "all") return activeJobs;
    if (activeTab === "queued") {
      return activeJobs.filter((j) => j.status === "queued" || j.status === "processing");
    }
    return activeJobs.filter((j) => j.status === activeTab);
  }, [activeJobs, archivedJobs, activeTab]);

  const filterTabs = useMemo(
    () => [
      { id: "all", label: "All", count: activeJobs.length },
      {
        id: "queued",
        label: "Queued",
        count: activeJobs.filter((j) => j.status === "queued" || j.status === "processing").length,
      },
      {
        id: "sent",
        label: "Sent / Accepted",
        count: activeJobs.filter((j) => j.status === "sent").length,
      },
      {
        id: "failed",
        label: "Failed",
        count: activeJobs.filter((j) => j.status === "failed").length,
      },
      {
        id: "cancelled",
        label: "Cancelled",
        count: activeJobs.filter((j) => j.status === "cancelled").length,
      },
      { id: "archived", label: "Archived", count: archivedJobs.length },
    ],
    [activeJobs, archivedJobs]
  );

  // Selection helpers
  const visibleIds = useMemo(() => filteredJobs.map((j) => j.id), [filteredJobs]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const selectedJobs = useMemo(
    () => jobs.filter((j) => selectedIds.has(j.id)),
    [jobs, selectedIds]
  );

  const selectedEligibility = useMemo(() => {
    const queued = selectedJobs.filter((j) => !j.archivedAt && j.status === "queued");
    const deletable = selectedJobs.filter(
      (j) => j.status === "queued" || j.status === "failed"
    );
    const archivable = selectedJobs.filter(
      (j) => !j.archivedAt && (j.status === "sent" || j.status === "failed")
    );
    const unarchivable = selectedJobs.filter((j) => Boolean(j.archivedAt));
    return { queued, deletable, archivable, unarchivable };
  }, [selectedJobs]);

  const toggleSelection = (jobId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        visibleIds.forEach((id) => next.add(id));
      } else {
        visibleIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const selectEligibleInView = () => {
    const eligible = filteredJobs.filter((j) => j.status !== "processing");
    setSelectedIds(new Set(eligible.map((j) => j.id)));
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSelectedIds(new Set());
  };

  // Single-record Retry
  const handleRetryJob = async (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRetryingJobId(jobId);
    try {
      const res = await retryFailedDispatchAction(jobId);
      if (res.success) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? { ...j, status: "queued", attempts: 0, lastError: undefined, archivedAt: undefined }
              : j
          )
        );
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob((prev) =>
            prev
              ? { ...prev, status: "queued", attempts: 0, lastError: undefined, archivedAt: undefined }
              : null
          );
        }
        pushToast("success", "Retry queued", "The failed dispatch has been re-queued with attempts reset.");
      } else {
        pushToast("error", "Retry failed", res.message || "Unable to retry this dispatch.");
      }
    } catch {
      pushToast("error", "Network error", "Failed to communicate with server while retrying.");
    } finally {
      setRetryingJobId(null);
    }
  };

  // Single-record Archive/Unarchive (also accessible via confirmation dialog for bulk)
  const executeArchiveJobs = async (jobIds: string[], archive: boolean) => {
    const res = await archiveOutboxJobsAction({ jobIds, archive });
    if (res.success && res.data) {
      const processedSet = new Set(res.data.processedIds);
      const nowIso = new Date().toISOString();
      setJobs((prev) =>
        prev.map((j) =>
          processedSet.has(j.id) ? { ...j, archivedAt: archive ? nowIso : undefined } : j
        )
      );
      if (selectedJob && processedSet.has(selectedJob.id)) {
        setSelectedJob((prev) =>
          prev ? { ...prev, archivedAt: archive ? nowIso : undefined } : null
        );
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        res.data?.processedIds.forEach((id) => next.delete(id));
        return next;
      });
      if (res.data.skipped.length > 0) {
        pushToast(
          "warning",
          `${archive ? "Archived" : "Unarchived"} ${res.data.processedIds.length} dispatch(es)`,
          `${res.data.skipped.length} ineligible record(s) skipped.`
        );
      } else {
        pushToast(
          "success",
          archive ? "Archived dispatches" : "Restored from archive",
          res.message || `${res.data.processedIds.length} record(s) updated.`
        );
      }
    } else {
      pushToast("error", archive ? "Archive failed" : "Unarchive failed", res.message);
    }
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    setIsExecutingAction(true);

    try {
      if (pendingAction.type === "cancel") {
        const res = await cancelOutboxJobsAction({ jobIds: pendingAction.jobIds });
        if (res.success && res.data) {
          const processedSet = new Set(res.data.processedIds);
          const nowIso = new Date().toISOString();
          setJobs((prev) =>
            prev.map((j) =>
              processedSet.has(j.id) ? { ...j, status: "cancelled", cancelledAt: nowIso } : j
            )
          );
          if (selectedJob && processedSet.has(selectedJob.id)) {
            setSelectedJob((prev) =>
              prev ? { ...prev, status: "cancelled", cancelledAt: nowIso } : null
            );
          }
          setSelectedIds((prev) => {
            const next = new Set(prev);
            res.data?.processedIds.forEach((id) => next.delete(id));
            return next;
          });
          if (res.data.skipped.length > 0) {
            pushToast(
              "warning",
              `Cancelled ${res.data.processedIds.length} queued dispatch(es)`,
              `${res.data.skipped.length} non-queued or claimed record(s) skipped.`
            );
          } else {
            pushToast("success", "Dispatch cancelled", res.message);
          }
        } else {
          pushToast("error", "Cancellation failed", res.message);
        }
      } else if (pendingAction.type === "delete") {
        const res = await deleteOutboxJobsAction({ jobIds: pendingAction.jobIds });
        if (res.success && res.data) {
          const deletedSet = new Set(res.data.processedIds);
          setJobs((prev) => prev.filter((j) => !deletedSet.has(j.id)));
          if (selectedJob && deletedSet.has(selectedJob.id)) {
            setSelectedJob(null);
          }
          setSelectedIds((prev) => {
            const next = new Set(prev);
            res.data?.processedIds.forEach((id) => next.delete(id));
            return next;
          });
          if (res.data.skipped.length > 0) {
            pushToast(
              "warning",
              `Deleted ${res.data.processedIds.length} record(s)`,
              `${res.data.skipped.length} protected record(s) (sent/processing) were skipped.`
            );
          } else {
            pushToast("success", "Records deleted", res.message);
          }
        } else {
          pushToast("error", "Deletion failed", res.message);
        }
      } else if (pendingAction.type === "archive") {
        await executeArchiveJobs(pendingAction.jobIds, pendingAction.archive);
      }
      setPendingAction(null);
    } catch {
      pushToast("error", "Operation failed", "An unexpected network or server error occurred.");
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Compose submission
  const handleSendDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    if (!selectedEventId || !selectedEvent) {
      pushToast("error", "No event selected", "Select a valid event before dispatching.");
      return;
    }

    if (estimatedCount === 0) {
      pushToast("warning", "No eligible recipients", "Selected audience segment has 0 recipients.");
      return;
    }

    setIsSending(true);
    const res = await enqueueDispatchAction({
      eventId: selectedEventId,
      subject: subject.trim(),
      audience: audience as "all" | "checked_in" | "pending",
      bodyContent,
      scheduledAt: dispatchType === "instant" ? undefined : "Tomorrow at 09:00 AM",
    });
    setIsSending(false);

    if (!res.success) {
      pushToast("error", "Enqueue failed", res.message || "Failed to enqueue dispatch.");
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
      attempts: 0,
      scheduledAt: dispatchType === "instant" ? "Queued for Dispatch" : "Tomorrow at 09:00 AM",
    };

    setJobs((prev) => [newJob, ...prev]);
    setIsComposeOpen(false);
    setSubject("");
    setBodyContent("");
    pushToast(
      "success",
      "Dispatch queued",
      `"${newJob.subject}" queued for ${newJob.recipientCount} recipient(s).`
    );
  };

  // Confirmation dialog copy computation
  const confirmDialogSummary = useMemo(() => {
    if (!pendingAction) return null;
    const targetJobs = jobs.filter((j) => pendingAction.jobIds.includes(j.id));

    if (pendingAction.type === "cancel") {
      const eligibleCount = targetJobs.filter((j) => !j.archivedAt && j.status === "queued").length;
      const skippedCount = targetJobs.length - eligibleCount;
      return {
        title:
          targetJobs.length === 1
            ? "Cancel Queued Dispatch?"
            : `Cancel ${eligibleCount} Queued Dispatch(es)?`,
        description:
          eligibleCount === 0
            ? "None of the selected records are currently queued. Already sent, failed, or claimed records cannot be cancelled."
            : `${eligibleCount} queued email(s) will transition to Cancelled and will never be picked up by the delivery worker.${
                skippedCount > 0
                  ? ` ${skippedCount} non-queued record(s) will be safely skipped.`
                  : ""
              }`,
        confirmLabel: "Cancel Dispatch",
        destructive: true,
        disabled: eligibleCount === 0,
      };
    }

    if (pendingAction.type === "delete") {
      const eligibleCount = targetJobs.filter(
        (j) => j.status === "queued" || j.status === "failed"
      ).length;
      const skippedCount = targetJobs.length - eligibleCount;
      return {
        title:
          targetJobs.length === 1
            ? "Permanently Delete Outbox Record?"
            : `Delete ${eligibleCount} Outbox Record(s)?`,
        description:
          eligibleCount === 0
            ? "None of the selected records can be deleted. Sent, processing, and cancelled records are protected."
            : `This will permanently remove ${eligibleCount} queued/failed record(s) from the outbox.${
                skippedCount > 0
                  ? ` ${skippedCount} protected record(s) (sent, processing, or cancelled) will be safely skipped.`
                  : ""
              }`,
        confirmLabel: "Delete Permanently",
        destructive: true,
        disabled: eligibleCount === 0,
      };
    }

    const eligibleCount = pendingAction.archive
      ? targetJobs.filter((j) => !j.archivedAt && (j.status === "sent" || j.status === "failed")).length
      : targetJobs.filter((j) => Boolean(j.archivedAt)).length;
    const skippedCount = targetJobs.length - eligibleCount;

    return {
      title: pendingAction.archive
        ? `Archive ${eligibleCount} Dispatch(es)?`
        : `Unarchive ${eligibleCount} Dispatch(es)?`,
      description: pendingAction.archive
        ? `${eligibleCount} sent/failed record(s) will move to the Archived tab with delivery timestamps and error history preserved.${
            skippedCount > 0
              ? ` ${skippedCount} queued or processing record(s) cannot be archived and will be skipped.`
              : ""
          }`
        : `${eligibleCount} archived record(s) will be restored to the active outbox view with original statuses preserved.`,
      confirmLabel: pendingAction.archive ? "Archive Records" : "Restore Records",
      destructive: false,
      disabled: eligibleCount === 0,
    };
  }, [pendingAction, jobs]);

  const emptyStateMeta = useMemo(() => {
    switch (activeTab) {
      case "queued":
        return {
          title: "No queued dispatches",
          description: "All scheduled emails have finished processing or been cancelled.",
        };
      case "sent":
        return {
          title: "No sent dispatches",
          description: "Emails accepted by your provider will appear here with delivery timestamps.",
        };
      case "failed":
        return {
          title: "No failed dispatches",
          description: "No delivery failures are currently awaiting retry or cleanup.",
        };
      case "cancelled":
        return {
          title: "No cancelled dispatches",
          description: "Queued emails cancelled before worker pickup will appear here.",
        };
      case "archived":
        return {
          title: "No archived dispatches",
          description:
            "Sent or failed records you archive stay accessible here with full delivery timestamps and error logs.",
        };
      default:
        return {
          title: "No active dispatches found",
          description:
            "No announcements or ticket passes are in the active outbox. Click 'New Dispatch' to send an update.",
        };
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col space-y-6 pb-16 max-w-[1400px] mx-auto">
      {/* Header with Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <nav className="flex items-center gap-2 text-xs font-medium text-[#6B7280]">
            <Link href="/" className="hover:text-[#111827] transition-colors">
              Workspace
            </Link>
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
            Transactional email dispatch, audience segment announcements, and outbox lifecycle operations.
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

      {/* Production Database Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 p-5 shadow-sm text-rose-900"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs space-y-1">
              <h3 className="font-bold text-sm">Database Connection Error</h3>
              <p className="text-rose-800">
                Unable to load communications data from the persistent database:{" "}
                <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">{error}</code>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="rounded-lg text-xs font-semibold gap-1.5 border-rose-300"
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

      {/* Filter Tabs Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="overflow-x-auto pb-1 lg:pb-0">
          <AnimatedTabs
            tabs={filterTabs}
            activeTab={activeTab}
            onChange={handleTabChange}
            layoutId="commFilterPill"
          />
        </div>
        <div className="text-xs text-[#6B7280] font-medium flex items-center gap-2 shrink-0">
          <span>
            Showing <strong className="text-[#111827]">{filteredJobs.length}</strong>{" "}
            {activeTab === "archived" ? "archived" : "active"} dispatch(es)
          </span>
        </div>
      </div>

      {/* Selection Toolbar & Bulk Operations Bar */}
      {filteredJobs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-xs">
          <div className="flex items-center gap-4">
            <CustomCheckbox
              id="select-all-visible"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              label={allVisibleSelected ? "Deselect all in view" : "Select all in view"}
            />
            <button
              type="button"
              onClick={selectEligibleInView}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280] hover:text-[#111827] transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Select manageable</span>
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[#111827] mr-1">
                {selectedIds.size} selected
              </span>

              {activeTab !== "archived" && selectedEligibility.queued.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPendingAction({ type: "cancel", jobIds: Array.from(selectedIds) })
                  }
                  className="h-7 px-2.5 text-xs font-medium rounded-md border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100/80 gap-1.5"
                >
                  <Ban className="h-3 w-3" />
                  <span>Cancel ({selectedEligibility.queued.length})</span>
                </Button>
              )}

              {activeTab !== "archived" && selectedEligibility.archivable.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPendingAction({
                      type: "archive",
                      jobIds: Array.from(selectedIds),
                      archive: true,
                    })
                  }
                  className="h-7 px-2.5 text-xs font-medium rounded-md border-[#D1D5DB] text-[#374151] bg-white hover:bg-[#F3F4F6] gap-1.5"
                >
                  <Archive className="h-3 w-3" />
                  <span>Archive ({selectedEligibility.archivable.length})</span>
                </Button>
              )}

              {activeTab === "archived" && selectedEligibility.unarchivable.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPendingAction({
                      type: "archive",
                      jobIds: Array.from(selectedIds),
                      archive: false,
                    })
                  }
                  className="h-7 px-2.5 text-xs font-medium rounded-md border-[#D1D5DB] text-[#374151] bg-white hover:bg-[#F3F4F6] gap-1.5"
                >
                  <ArchiveRestore className="h-3 w-3" />
                  <span>Unarchive ({selectedEligibility.unarchivable.length})</span>
                </Button>
              )}

              {selectedEligibility.deletable.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPendingAction({ type: "delete", jobIds: Array.from(selectedIds) })
                  }
                  className="h-7 px-2.5 text-xs font-medium rounded-md border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100/80 gap-1.5"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete ({selectedEligibility.deletable.length})</span>
                </Button>
              )}

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="p-1 text-[#6B7280] hover:text-[#111827] rounded-md"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Outbox Status Cards */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <EmptyState
            icon={activeTab === "archived" ? Archive : Mail}
            title={emptyStateMeta.title}
            description={emptyStateMeta.description}
            actionLabel={activeTab !== "all" ? "View Active Dispatches" : undefined}
            onAction={() => handleTabChange("all")}
          />
        ) : (
          filteredJobs.map((job) => {
            const isSelected = selectedIds.has(job.id);
            const isArchived = Boolean(job.archivedAt);

            return (
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
                className={cn(
                  "group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B]/20 select-none",
                  isSelected
                    ? "border-[#18181B] ring-1 ring-[#18181B]/10 bg-[#FAFAFA]"
                    : "border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="pt-2.5 shrink-0"
                  >
                    <CustomCheckbox
                      id={`select-job-${job.id}`}
                      checked={isSelected}
                      onChange={(checked) => toggleSelection(job.id, checked)}
                    />
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4F5F6] border border-[#E5E7EB] text-[#374151] group-hover:bg-[#EAECEF] group-hover:text-[#111827] transition-colors">
                    <Mail className="h-4.5 w-4.5" />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-[15px] font-semibold text-[#111827] group-hover:text-black transition-colors leading-snug">
                        {job.subject}
                      </h3>
                      {isArchived && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium px-2 py-0 rounded-full bg-[#F3F4F6] border-[#E5E7EB] text-[#6B7280]"
                        >
                          Archived
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280]">
                      <span className="text-[#9CA3AF]">Event:</span>
                      <span className="text-[#374151] font-medium">{job.eventTitle}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#6B7280] pt-1">
                      <span>
                        Audience:{" "}
                        <strong className="text-[#111827] font-semibold">
                          {job.recipientCount}
                        </strong>{" "}
                        recipients
                      </span>
                      {job.recipientEmail && (
                        <>
                          <span className="text-[#D1D5DB]">•</span>
                          <span
                            className="truncate max-w-[260px] sm:max-w-[340px]"
                            title={job.recipientEmail}
                          >
                            To:{" "}
                            <strong className="text-[#111827] font-semibold">
                              {job.recipientName
                                ? `${job.recipientName} (${job.recipientEmail})`
                                : job.recipientEmail}
                            </strong>
                          </span>
                        </>
                      )}
                      <span className="text-[#D1D5DB]">•</span>
                      <span>
                        Type:{" "}
                        <strong className="capitalize text-[#111827] font-semibold">
                          {job.type.replace("_", " ")}
                        </strong>
                      </span>
                      {job.deliveredAt && (
                        <>
                          <span className="text-[#D1D5DB]">•</span>
                          <span>
                            Dispatched:{" "}
                            <strong className="text-[#111827] font-semibold">
                              {job.deliveredAt}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge + Three-Dot Menu */}
                <div
                  className="flex items-center gap-2.5 shrink-0 self-start sm:self-center"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
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
                      {!isArchived && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleRetryJob(job.id, e)}
                          disabled={retryingJobId === job.id}
                          className="h-7 px-2.5 text-xs font-medium text-rose-700 border-rose-200 hover:bg-rose-50 rounded-md gap-1.5"
                          title="Retry sending this communication"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${retryingJobId === job.id ? "animate-spin" : ""}`}
                          />
                          <span>{retryingJobId === job.id ? "Retrying..." : "Retry"}</span>
                        </Button>
                      )}
                    </div>
                  ) : job.status === "processing" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing</span>
                    </span>
                  ) : job.status === "cancelled" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
                      <Ban className="h-3.5 w-3.5" />
                      <span>Cancelled</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F4F5F6] text-[#374151] border border-[#E5E7EB]">
                      <Clock className="h-3.5 w-3.5 text-[#6B7280]" />
                      <span>Queued</span>
                    </span>
                  )}

                  {/* Three-Dot Action Menu */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        aria-label={`Actions for ${job.subject}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#6B7280] hover:border-[#E5E7EB] hover:bg-[#F4F5F6] hover:text-[#111827] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B]/20"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="end"
                        sideOffset={6}
                        className="z-50 min-w-[180px] rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-lg text-xs text-[#111827] animate-in fade-in-0 zoom-in-95"
                      >
                        <DropdownMenu.Item
                          onSelect={() => setSelectedJob(job)}
                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[#374151] outline-none cursor-pointer hover:bg-[#F4F5F6] focus:bg-[#F4F5F6]"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#6B7280]" />
                          <span>{job.status === "failed" ? "View error" : "View details"}</span>
                        </DropdownMenu.Item>

                        {isArchived ? (
                          <DropdownMenu.Item
                            onSelect={() => executeArchiveJobs([job.id], false)}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[#374151] outline-none cursor-pointer hover:bg-[#F4F5F6] focus:bg-[#F4F5F6]"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5 text-[#6B7280]" />
                            <span>Unarchive</span>
                          </DropdownMenu.Item>
                        ) : (
                          <>
                            {job.status === "queued" && (
                              <>
                                <DropdownMenu.Item
                                  onSelect={() =>
                                    setPendingAction({ type: "cancel", jobIds: [job.id] })
                                  }
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-amber-800 outline-none cursor-pointer hover:bg-amber-50 focus:bg-amber-50"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  <span>Cancel</span>
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="my-1 h-px bg-[#F3F4F6]" />
                                <DropdownMenu.Item
                                  onSelect={() =>
                                    setPendingAction({ type: "delete", jobIds: [job.id] })
                                  }
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-rose-700 outline-none cursor-pointer hover:bg-rose-50 focus:bg-rose-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete</span>
                                </DropdownMenu.Item>
                              </>
                            )}

                            {job.status === "failed" && (
                              <>
                                <DropdownMenu.Item
                                  onSelect={() => handleRetryJob(job.id)}
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[#111827] outline-none cursor-pointer hover:bg-[#F4F5F6] focus:bg-[#F4F5F6]"
                                >
                                  <RefreshCw className="h-3.5 w-3.5 text-[#6B7280]" />
                                  <span>Retry</span>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  onSelect={() => executeArchiveJobs([job.id], true)}
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[#374151] outline-none cursor-pointer hover:bg-[#F4F5F6] focus:bg-[#F4F5F6]"
                                >
                                  <Archive className="h-3.5 w-3.5 text-[#6B7280]" />
                                  <span>Archive</span>
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="my-1 h-px bg-[#F3F4F6]" />
                                <DropdownMenu.Item
                                  onSelect={() =>
                                    setPendingAction({ type: "delete", jobIds: [job.id] })
                                  }
                                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-rose-700 outline-none cursor-pointer hover:bg-rose-50 focus:bg-rose-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete</span>
                                </DropdownMenu.Item>
                              </>
                            )}

                            {job.status === "sent" && (
                              <DropdownMenu.Item
                                onSelect={() => executeArchiveJobs([job.id], true)}
                                className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[#374151] outline-none cursor-pointer hover:bg-[#F4F5F6] focus:bg-[#F4F5F6]"
                              >
                                <Archive className="h-3.5 w-3.5 text-[#6B7280]" />
                                <span>Archive</span>
                              </DropdownMenu.Item>
                            )}
                          </>
                        )}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog.Root
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && !isExecutingAction) setPendingAction(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-2xl space-y-4">
            {confirmDialogSummary && (
              <>
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                      confirmDialogSummary.destructive
                        ? "bg-rose-50 border-rose-200 text-rose-600"
                        : "bg-[#F4F5F6] border-[#E5E7EB] text-[#111827]"
                    )}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <Dialog.Title className="text-base font-bold text-[#111827]">
                      {confirmDialogSummary.title}
                    </Dialog.Title>
                    <Dialog.Description className="text-xs text-[#6B7280] leading-relaxed">
                      {confirmDialogSummary.description}
                    </Dialog.Description>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isExecutingAction}
                    onClick={() => setPendingAction(null)}
                    className="rounded-lg text-xs h-9 px-4 border-[#E5E7EB] text-[#374151]"
                  >
                    Go Back
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isExecutingAction || confirmDialogSummary.disabled}
                    onClick={executePendingAction}
                    className={cn(
                      "rounded-lg text-xs font-semibold h-9 px-4 text-white",
                      confirmDialogSummary.destructive
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-[#18181B] hover:bg-[#27272A]"
                    )}
                  >
                    {isExecutingAction ? "Applying..." : confirmDialogSummary.confirmLabel}
                  </Button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
            <label className="text-xs font-semibold text-[#111827] block mb-1.5">
              Target Event *
            </label>
            <CustomSelect
              options={events.map((e) => ({ value: e.id, label: e.title }))}
              value={selectedEventId}
              onChange={setSelectedEventId}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111827] block mb-1.5">
              Audience Segment *
            </label>
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
            <label className="text-xs font-semibold text-[#111827] block mb-1.5">
              Subject Line *
            </label>
            <Input
              placeholder="e.g., Important Venue & Entry Pass Instructions"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-10 text-xs rounded-lg"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111827] block mb-1.5">
              Message Body
            </label>
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
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[#6B7280]">Recipient:</span>
                  <span className="font-mono text-[#111827] truncate">
                    {selectedJob.recipientName
                      ? `${selectedJob.recipientName} <${selectedJob.recipientEmail}>`
                      : selectedJob.recipientEmail}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Recipients Count:</span>
                <span className="font-mono font-bold text-[#111827]">
                  {selectedJob.recipientCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">Dispatch Status:</span>
                <span className="capitalize font-semibold text-[#111827]">
                  {selectedJob.status}
                  {selectedJob.archivedAt ? " (Archived)" : ""}
                </span>
              </div>
              {selectedJob.attempts !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Delivery Attempts:</span>
                  <span className="font-mono font-bold text-[#111827]">
                    {selectedJob.attempts} / 5
                  </span>
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
              {selectedJob.cancelledAt && (
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Cancelled At:</span>
                  <span className="text-[#111827] font-medium">{selectedJob.cancelledAt}</span>
                </div>
              )}
              {selectedJob.archivedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Archived At:</span>
                  <span className="text-[#111827] font-medium">{selectedJob.archivedAt}</span>
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

            {/* Contextual Drawer Actions */}
            <div className="flex flex-wrap gap-2">
              {selectedJob.status === "failed" && !selectedJob.archivedAt && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRetryJob(selectedJob.id)}
                  disabled={retryingJobId === selectedJob.id}
                  className="flex-1 rounded-lg text-xs font-semibold gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 h-9"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${retryingJobId === selectedJob.id ? "animate-spin" : ""}`}
                  />
                  <span>
                    {retryingJobId === selectedJob.id ? "Retrying..." : "Retry Failed Delivery"}
                  </span>
                </Button>
              )}

              {selectedJob.status === "queued" && !selectedJob.archivedAt && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPendingAction({ type: "cancel", jobIds: [selectedJob.id] })
                  }
                  className="flex-1 rounded-lg text-xs font-semibold gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50 h-9"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Cancel Dispatch</span>
                </Button>
              )}

              {(selectedJob.status === "sent" || selectedJob.status === "failed") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    executeArchiveJobs([selectedJob.id], !selectedJob.archivedAt)
                  }
                  className="rounded-lg text-xs font-semibold gap-1.5 border-[#D1D5DB] text-[#374151] hover:bg-[#F4F5F6] h-9 px-3.5"
                >
                  {selectedJob.archivedAt ? (
                    <>
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      <span>Unarchive</span>
                    </>
                  ) : (
                    <>
                      <Archive className="h-3.5 w-3.5" />
                      <span>Archive</span>
                    </>
                  )}
                </Button>
              )}

              {(selectedJob.status === "queued" || selectedJob.status === "failed") &&
                !selectedJob.archivedAt && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPendingAction({ type: "delete", jobIds: [selectedJob.id] })
                    }
                    className="rounded-lg text-xs font-semibold gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50 h-9 px-3.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </Button>
                )}
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                Broadcast Content Preview
              </span>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Dear attendee, this is an official operational broadcast regarding{" "}
                {selectedJob.eventTitle}. Please present your digital pass QR code at the desk
                upon arrival.
              </p>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Toast Notification Stack */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-[calc(100%-2.5rem)] max-w-sm"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.variant === "error" ? "alert" : "status"}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border p-3.5 shadow-lg text-xs bg-white",
                t.variant === "success" && "border-emerald-200",
                t.variant === "warning" && "border-amber-200",
                t.variant === "error" && "border-rose-200"
              )}
            >
              {t.variant === "success" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {t.variant === "warning" && (
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              {t.variant === "error" && (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-0.5">
                <div className="font-semibold text-[#111827]">{t.title}</div>
                {t.description && (
                  <div className="text-[11px] text-[#6B7280] leading-snug">{t.description}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-[#9CA3AF] hover:text-[#111827] p-0.5"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
