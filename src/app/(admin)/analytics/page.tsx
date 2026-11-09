import { SketchRepository } from "@/lib/supabase/repository";
import { verifyAdminSession } from "@/lib/auth/session";
import { AccessDenied } from "@/components/auth/access-denied";
import { EventItem, Participant, CertificateRecord } from "@/types";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage() {
  const session = await verifyAdminSession();

  // Strict RBAC: Analytics is restricted to master_admin, event_manager, and analyst
  const role = session.user?.role;
  if (role !== "master_admin" && role !== "event_manager" && role !== "analyst") {
    return (
      <AccessDenied
        currentRole={role}
        requiredRoles={["master_admin", "event_manager", "analyst"]}
        moduleName="Analytics & Funnel Metrics"
      />
    );
  }

  let events: EventItem[] = [];
  let participants: Participant[] = [];
  let certificates: CertificateRecord[] = [];
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedEvents, fetchedParticipants, fetchedCertificates] = await Promise.all([
      SketchRepository.listEvents(),
      SketchRepository.listParticipants(),
      SketchRepository.listCertificates(),
    ]);
    events = fetchedEvents;
    participants = fetchedParticipants;
    certificates = fetchedCertificates;
  } catch (err: unknown) {
    console.error("[AnalyticsPage] Failed to load analytics data:", err);
  }

  return (
    <AnalyticsClient
      initialEvents={events}
      initialParticipants={participants}
      initialCertificates={certificates}
      isPreview={isPreview}
    />
  );
}
