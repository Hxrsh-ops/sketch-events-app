import { SketchRepository } from "@/lib/supabase/repository";
import { EventItem, Participant, Team } from "@/types";
import ExportsClient from "./exports-client";

export default async function ExportsPage() {
  let events: EventItem[] = [];
  let participants: Participant[] = [];
  let teams: Team[] = [];
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedEvents, fetchedParticipants, fetchedTeams] = await Promise.all([
      SketchRepository.listEvents(),
      SketchRepository.listParticipants(),
      SketchRepository.listTeams(),
    ]);
    events = fetchedEvents;
    participants = fetchedParticipants;
    teams = fetchedTeams;
  } catch (err: unknown) {
    console.error("[ExportsPage] Failed to load export data:", err);
  }

  return (
    <ExportsClient
      initialEvents={events}
      initialParticipants={participants}
      initialTeams={teams}
      isPreview={isPreview}
    />
  );
}
