import { SketchRepository } from "@/lib/supabase/repository";
import { verifyAdminSession } from "@/lib/auth/session";
import { AccessDenied } from "@/components/auth/access-denied";
import { CertificateRecord, EventItem, Participant } from "@/types";
import CertificatesClient from "./certificates-client";

export default async function CertificatesPage() {
  const session = await verifyAdminSession();

  // Strict RBAC: Certificates is restricted to master_admin and event_manager
  if (session.user?.role !== "master_admin" && session.user?.role !== "event_manager") {
    return (
      <AccessDenied
        currentRole={session.user?.role}
        requiredRoles={["master_admin", "event_manager"]}
        moduleName="Certificates & Digital Credentials"
      />
    );
  }

  let certificates: CertificateRecord[] = [];
  let events: EventItem[] = [];
  let participants: Participant[] = [];
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedCerts, fetchedEvents, fetchedParticipants] = await Promise.all([
      SketchRepository.listCertificates(),
      SketchRepository.listEvents(),
      SketchRepository.listParticipants(),
    ]);
    certificates = fetchedCerts;
    events = fetchedEvents;
    participants = fetchedParticipants;
  } catch (err: unknown) {
    console.error("[CertificatesPage] Failed to load certificates data:", err);
  }

  return (
    <CertificatesClient
      initialCertificates={certificates}
      initialEvents={events}
      initialParticipants={participants}
      isPreview={isPreview}
    />
  );
}
