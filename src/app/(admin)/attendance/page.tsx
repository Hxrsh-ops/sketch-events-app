import { SketchRepository } from "@/lib/supabase/repository";
import { verifyAdminSession } from "@/lib/auth/session";
import { AccessDenied } from "@/components/auth/access-denied";
import { Participant, EventItem } from "@/types";
import AttendanceClient from "./attendance-client";

export default async function AttendancePage() {
  const session = await verifyAdminSession();

  // Strict RBAC: Attendance is restricted to master_admin, event_manager, and attendance_staff
  const role = session.user?.role;
  if (role !== "master_admin" && role !== "event_manager" && role !== "attendance_staff") {
    return (
      <AccessDenied
        currentRole={role}
        requiredRoles={["master_admin", "event_manager", "attendance_staff"]}
        moduleName="Attendance Verification & Desk Scanner"
      />
    );
  }

  let events: EventItem[] = [];
  let participants: Participant[] = [];
  let fetchError: string | null = null;
  const isPreview = SketchRepository.isPreview();

  try {
    const [fetchedEvents, fetchedParticipants] = await Promise.all([
      SketchRepository.listEvents(),
      SketchRepository.listParticipants(),
    ]);
    events = fetchedEvents;
    participants = fetchedParticipants;
  } catch (err: any) {
    console.error("[AttendancePage] Failed to load attendance data:", err);
    fetchError = err?.message || "Failed to load attendance data from the database.";
  }

  return (
    <AttendanceClient
      initialEvents={events}
      initialParticipants={participants}
      initialError={fetchError}
      isPreview={isPreview}
    />
  );
}
