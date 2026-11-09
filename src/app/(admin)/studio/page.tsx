import { SketchRepository } from "@/lib/supabase/repository";
import { verifyAdminSession } from "@/lib/auth/session";
import { AccessDenied } from "@/components/auth/access-denied";
import { TicketTemplate, EventItem } from "@/types";
import StudioClient from "./studio-client";

export default async function TicketStudioPage() {
  const session = await verifyAdminSession();

  // Strict RBAC: Studio is restricted to master_admin and event_manager
  if (session.user?.role !== "master_admin" && session.user?.role !== "event_manager") {
    return (
      <AccessDenied
        currentRole={session.user?.role}
        requiredRoles={["master_admin", "event_manager"]}
        moduleName="Ticket Studio & Form Generator"
      />
    );
  }

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
