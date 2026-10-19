import { SketchRepository } from "@/lib/supabase/repository";
import { Team, EventItem } from "@/types";
import TeamsClient from "./teams-client";

export default async function TeamsPage() {
  let teams: Team[] = [];
  let events: EventItem[] = [];
  let fetchError: string | null = null;
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedTeams, fetchedEvents] = await Promise.all([
      SketchRepository.listTeams(),
      SketchRepository.listEvents(),
    ]);
    teams = fetchedTeams;
    events = fetchedEvents;
  } catch (err: unknown) {
    fetchError = err instanceof Error ? err.message : "Failed to load teams.";
  }

  return (
    <TeamsClient
      initialTeams={teams}
      initialEvents={events}
      isPreview={isPreview}
      initialError={fetchError}
    />
  );
}
