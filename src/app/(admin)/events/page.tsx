import { SketchRepository } from "@/lib/supabase/repository";
import { EventItem } from "@/types";
import EventsDirectoryClient from "./events-directory-client";

export default async function EventsPage() {
  let events: EventItem[] = [];
  let fetchError: string | null = null;
  const isPreview = SketchRepository.isPreview();

  try {
    events = await SketchRepository.listEvents();
  } catch (err: any) {
    // In production, we capture and display the error honestly
    fetchError = err.message || "Failed to load events from the database.";
  }

  return (
    <EventsDirectoryClient
      initialEvents={events}
      initialError={fetchError}
      isPreview={isPreview}
    />
  );
}
