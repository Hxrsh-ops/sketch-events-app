import { SketchRepository } from "@/lib/supabase/repository";
import { CertificateRecord, EventItem, Participant } from "@/types";
import CertificatesClient from "./certificates-client";

export default async function CertificatesPage() {
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
