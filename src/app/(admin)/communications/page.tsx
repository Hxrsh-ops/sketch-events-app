import { SketchRepository } from "@/lib/supabase/repository";
import { CommunicationJob, EventItem, Participant } from "@/types";
import CommunicationsClient from "./communications-client";

export default async function CommunicationsPage() {
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
