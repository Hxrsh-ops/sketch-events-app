import { SketchRepository } from "@/lib/supabase/repository";
import { Participant, EventItem } from "@/types";
import ParticipantsClient from "./participants-client";

export default async function ParticipantsPage() {
  let participants: Participant[] = [];
  let events: EventItem[] = [];
  let fetchError: string | null = null;
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedParticipants, fetchedEvents] = await Promise.all([
      SketchRepository.listParticipants(),
      SketchRepository.listEvents(),
    ]);
    participants = fetchedParticipants;
    events = fetchedEvents;
  } catch (err: unknown) {
    fetchError = err instanceof Error ? err.message : "Failed to load participants.";
  }

  return (
    <ParticipantsClient
      initialParticipants={participants}
      initialEvents={events}
      isPreview={isPreview}
      initialError={fetchError}
    />
  );
}
