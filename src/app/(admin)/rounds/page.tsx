import { SketchRepository } from "@/lib/supabase/repository";
import { Round, EventItem } from "@/types";
import RoundsClient from "./rounds-client";

export default async function RoundsPage() {
  let rounds: Round[] = [];
  let events: EventItem[] = [];
  let fetchError: string | null = null;
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedRounds, fetchedEvents] = await Promise.all([
      SketchRepository.listRounds(),
      SketchRepository.listEvents(),
    ]);
    rounds = fetchedRounds;
    events = fetchedEvents;
  } catch (err: unknown) {
    fetchError = err instanceof Error ? err.message : "Failed to load rounds.";
  }

  return (
    <RoundsClient
      initialRounds={rounds}
      initialEvents={events}
      isPreview={isPreview}
      initialError={fetchError}
    />
  );
}
