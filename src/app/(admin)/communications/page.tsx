import { SketchRepository } from "@/lib/supabase/repository";
import { verifyAdminSession } from "@/lib/auth/session";
import { AccessDenied } from "@/components/auth/access-denied";
import { CommunicationJob, EventItem, Participant } from "@/types";
import CommunicationsClient from "./communications-client";

export default async function CommunicationsPage() {
  const session = await verifyAdminSession();

  // Strict RBAC: Communications is restricted to master_admin and event_manager
  if (session.user?.role !== "master_admin" && session.user?.role !== "event_manager") {
    return (
      <AccessDenied
        currentRole={session.user?.role}
        requiredRoles={["master_admin", "event_manager"]}
        moduleName="Communications & Outbox Delivery"
      />
    );
  }

  let jobs: CommunicationJob[] = [];
  let events: EventItem[] = [];
  let participants: Participant[] = [];
  let fetchError: string | null = null;
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedJobs, fetchedEvents, fetchedParticipants] = await Promise.all([
      SketchRepository.listOutboxJobs(),
      SketchRepository.listEvents(),
      SketchRepository.listParticipants(),
    ]);
    jobs = fetchedJobs;
    events = fetchedEvents;
    participants = fetchedParticipants;
  } catch (err: any) {
    console.error("[CommunicationsPage] Failed to load communications data:", err);
    fetchError = err?.message || "Failed to load communications data from the database.";
  }

  return (
    <CommunicationsClient
      initialJobs={jobs}
      initialEvents={events}
      initialParticipants={participants}
      initialError={fetchError}
      isPreview={isPreview}
    />
  );
}
