import { SketchRepository } from "@/lib/supabase/repository";
import { verifyAdminSession } from "@/lib/auth/session";
import { AccessDenied } from "@/components/auth/access-denied";
import { EventItem, Participant, Team, CertificateRecord, AuditLogEntry } from "@/types";
import ExportsClient from "./exports-client";

export default async function ExportsPage() {
  const session = await verifyAdminSession();

  // Strict RBAC: Exports is restricted to master_admin, event_manager, and analyst
  const role = session.user?.role;
  if (role !== "master_admin" && role !== "event_manager" && role !== "analyst") {
    return (
      <AccessDenied
        currentRole={role}
        requiredRoles={["master_admin", "event_manager", "analyst"]}
        moduleName="Data Exports & Compliance Archives"
      />
    );
  }

  let events: EventItem[] = [];
  let participants: Participant[] = [];
  let teams: Team[] = [];
  let certificates: CertificateRecord[] = [];
  let auditLogs: AuditLogEntry[] = [];
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedEvents, fetchedParticipants, fetchedTeams, fetchedCerts, fetchedLogs] = await Promise.all([
      SketchRepository.listEvents(),
      SketchRepository.listParticipants(),
      SketchRepository.listTeams(),
      SketchRepository.listCertificates(),
      SketchRepository.listAuditLogs({ limit: 500 }),
    ]);
    events = fetchedEvents;
    participants = fetchedParticipants;
    teams = fetchedTeams;
    certificates = fetchedCerts;
    auditLogs = fetchedLogs;
  } catch (err: unknown) {
    console.error("[ExportsPage] Failed to load export data:", err);
  }

  return (
    <ExportsClient
      initialEvents={events}
      initialParticipants={participants}
      initialTeams={teams}
      initialCertificates={certificates}
      initialAuditLogs={auditLogs}
      isPreview={isPreview}
    />
  );
}
