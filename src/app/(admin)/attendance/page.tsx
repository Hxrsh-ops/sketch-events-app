import { SketchRepository } from "@/lib/supabase/repository";
import { Participant, EventItem } from "@/types";
import AttendanceClient from "./attendance-client";

export default async function AttendancePage() {
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
    console.error("[AttendancePage] Failed to load attendance data:", err);
  }

  return (
    <AttendanceClient
      initialEvents={events}
      initialParticipants={participants}
      isPreview={isPreview}
    />
  );
}
