import { SketchRepository } from "@/lib/supabase/repository";
import { Participant, EventItem } from "@/types";
import AttendanceClient from "./attendance-client";

export default async function AttendancePage() {
  let events: EventItem[] = [];
  let participants: Participant[] = [];
  let fetchError: string | null = null;
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedEvents, fetchedParticipants] = await Promise.all([
      SketchRepository.listEvents(),
      SketchRepository.listParticipants(),
    ]);
    events = fetchedEvents;
    participants = fetchedParticipants;
  } catch (err: any) {
    console.error("[AttendancePage] Failed to load attendance data:", err);
    fetchError = err?.message || "Failed to load attendance data from the database.";
  }

  return (
    <AttendanceClient
      initialEvents={events}
      initialParticipants={participants}
      initialError={fetchError}
      isPreview={isPreview}
    />
  );
}
