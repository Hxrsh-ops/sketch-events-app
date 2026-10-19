import { SketchRepository } from "@/lib/supabase/repository";
import { CommunicationJob, EventItem, Participant } from "@/types";
import CommunicationsClient from "./communications-client";

export default async function CommunicationsPage() {
  let jobs: CommunicationJob[] = [];
  let events: EventItem[] = [];
  let participants: Participant[] = [];
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
  } catch (err: unknown) {
    console.error("[CommunicationsPage] Failed to load communications data:", err);
  }

  return (
    <CommunicationsClient
      initialJobs={jobs}
      initialEvents={events}
      initialParticipants={participants}
      isPreview={isPreview}
    />
  );
}
