import { SketchRepository } from "@/lib/supabase/repository";
import { EventItem, Participant } from "@/types";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage() {
  let events: EventItem[] = [];
  let participants: Participant[] = [];
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedEvents, fetchedParticipants] = await Promise.all([
      SketchRepository.listEvents(),
      SketchRepository.listParticipants(),
    ]);
    events = fetchedEvents;
    participants = fetchedParticipants;
  } catch (err: unknown) {
    console.error("[AnalyticsPage] Failed to load analytics data:", err);
  }

  return (
    <AnalyticsClient
      initialEvents={events}
      initialParticipants={participants}
      isPreview={isPreview}
    />
  );
}
