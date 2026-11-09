import { SketchRepository } from "@/lib/supabase/repository";
import { verifyAdminSession } from "@/lib/auth/session";
import { AccessDenied } from "@/components/auth/access-denied";
import { Round, EventItem } from "@/types";
import RoundsClient from "./rounds-client";

export default async function RoundsPage() {
  const session = await verifyAdminSession();

  // Strict RBAC: Rounds management is restricted to master_admin and event_manager
  if (session.user?.role !== "master_admin" && session.user?.role !== "event_manager") {
    return (
      <AccessDenied
        currentRole={session.user?.role}
        requiredRoles={["master_admin", "event_manager"]}
        moduleName="Competition Rounds & Stages"
      />
    );
  }

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
