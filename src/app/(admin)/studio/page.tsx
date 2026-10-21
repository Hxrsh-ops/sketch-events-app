import { SketchRepository } from "@/lib/supabase/repository";
import { TicketTemplate, EventItem } from "@/types";
import StudioClient from "./studio-client";

export default async function TicketStudioPage() {
  let templates: TicketTemplate[] = [];
  let events: EventItem[] = [];
  let initialError: string | null = null;
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedTemplates, fetchedEvents] = await Promise.all([
      SketchRepository.listTicketTemplates(),
      SketchRepository.listEvents(),
    ]);
    templates = fetchedTemplates;
    events = fetchedEvents;
  } catch (err: any) {
    console.error("[TicketStudioPage] Failed to load studio data:", err);
    initialError = err?.message || "Failed to load ticket studio data.";
  }

  return (
    <StudioClient
      initialTemplates={templates}
      initialEvents={events}
      initialError={initialError}
      isPreview={isPreview}
    />
  );
}
