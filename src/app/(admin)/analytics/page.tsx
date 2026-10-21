import { SketchRepository } from "@/lib/supabase/repository";
import { EventItem, Participant, CertificateRecord } from "@/types";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage() {
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
