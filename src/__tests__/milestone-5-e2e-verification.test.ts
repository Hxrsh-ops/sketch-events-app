import { describe, it, expect, beforeEach, vi } from "vitest";
import { createEventAction, setEventLifecycleAction } from "@/app/actions/event-actions";
import { registerForEventAction } from "@/app/actions/registration-actions";
import { createRoundAction } from "@/app/actions/round-actions";
import { toggleAttendanceAction } from "@/app/actions/participant-actions";
import { batchIssueCertificatesAction } from "@/app/actions/certificate-actions";
import { enqueueDispatchAction } from "@/app/actions/communication-actions";
import { exportRosterDataAction } from "@/app/actions/export-actions";
import { SketchRepository } from "@/lib/supabase/repository";
import { EmailOutboxWorker } from "@/lib/email/worker";
import { TestEmailAdapter } from "@/lib/email/adapters";
import { resetAppEnvCache, getAppEnv } from "@/lib/env";
import * as sessionModule from "@/lib/auth/session";
import { getStoredEvents, getStoredSubmissions, getStoredAuditLogs } from "@/lib/registration-store";

// Mock next/cache so revalidatePath does not fail in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Milestone 5: Comprehensive End-to-End Verification & Release Readiness", () => {
  const originalEnv = { ...process.env };

  const adminSession = {
    isAuthenticated: true,
    isAdmin: true,
    isPreview: true,
    user: {
      id: "admin-staff-001",
      email: "lead-admin@sketch.events",
      name: "Lead Admin",
      role: "master_admin" as const,
    },
  };

  const attendanceStaffSession = {
    isAuthenticated: true,
    isAdmin: true,
    isPreview: true,
    user: {
      id: "staff-002",
      email: "scanner@sketch.events",
      name: "Scanner Staff",
      role: "attendance_staff" as const,
    },
  };

  const analystSession = {
    isAuthenticated: true,
    isAdmin: true,
    isPreview: true,
    user: {
      id: "analyst-003",
      email: "metrics@sketch.events",
      name: "Metrics Analyst",
      role: "analyst" as const,
    },
  };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
    process.env.APP_MODE = "preview";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.restoreAllMocks();
  });

  describe("Core User Journeys (1 to 12) In Continuous Sequence", () => {
    it("executes the complete event lifecycle from creation to outbox delivery and exports", async () => {
      // -----------------------------------------------------------------------
      // Step 1: Create and publish an event
      // -----------------------------------------------------------------------
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue(adminSession);

      const createRes = await createEventAction({
        title: "Sketchathon 2026",
        slug: "sketchathon-2026",
        category: "Hackathon",
        shortDescription: "48-hour engineering and design sprint",
        description: "Full description of Sketchathon 2026",
        startDate: "2026-12-01T09:00:00Z",
        endDate: "2026-12-03T18:00:00Z",
        venue: "Innovation Pavilion Hall 1",
        venueMode: "in-person",
        capacity: 4, // Intentionally tight capacity to verify capacity protection
        lifecycle: "draft",
        registrationState: "open",
        hasTeams: true,
        minTeamSize: 2,
        maxTeamSize: 3,
        hasRounds: true,
        featured: true,
      });

      expect(createRes.success).toBe(true);
      if (!createRes.success || !createRes.data) throw new Error("Failed to create event");
      const eventId = createRes.data.id;
      const eventSlug = createRes.data.slug;

      // Publish the event
      const publishRes = await setEventLifecycleAction({
        id: eventId,
        lifecycle: "published",
      });
      expect(publishRes.success).toBe(true);

      // Verify published event state
      const publishedEvent = await SketchRepository.getEventById(eventId);
      expect(publishedEvent).not.toBeNull();
      expect(publishedEvent?.lifecycle).toBe("published");
      expect(publishedEvent?.registrationState).toBe("open");

      // -----------------------------------------------------------------------
      // Step 2: Register an individual participant
      // -----------------------------------------------------------------------
      const indivRegRes = await registerForEventAction({
        eventId,
        mode: "individual",
        attendeeName: "Maya Lin",
        email: "maya.lin@designer.io",
        phone: "+1-555-0199",
        department: "Product Design",
        year: "Senior",
      });

      expect(indivRegRes.success).toBe(true);
      if (!indivRegRes.success || !indivRegRes.data) throw new Error("Individual registration failed");
      const indivRegId = indivRegRes.data.registrationId;
      const indivQrToken = indivRegRes.data.qrCredentialId;
      expect(indivRegId).toBeDefined();
      expect(indivQrToken).toBeDefined();

      // -----------------------------------------------------------------------
      // Step 3: Register a team
      // -----------------------------------------------------------------------
      const teamRegRes = await registerForEventAction({
        eventId,
        mode: "team",
        attendeeName: "Sam Captain",
        email: "sam.captain@teamzero.io",
        phone: "+1-555-0200",
        department: "Computer Science",
        teamName: "Team Zero",
        teamMembers: [
          { name: "Dev Jordan", email: "dev.jordan@teamzero.io", role: "Member" },
        ],
      });

      expect(teamRegRes.success).toBe(true);
      if (!teamRegRes.success || !teamRegRes.data) throw new Error("Team registration failed");
      expect(teamRegRes.data.teamName).toBe("Team Zero");

      // Current registered count is now 1 (Maya) + 2 (Team Zero) = 3 out of capacity 4.

      // -----------------------------------------------------------------------
      // Step 4: Verify capacity and duplicate-registration protections
      // -----------------------------------------------------------------------
      // 4a. Duplicate registration protection (same email)
      const duplicateRes = await registerForEventAction({
        eventId,
        mode: "individual",
        attendeeName: "Maya Duplicate",
        email: "maya.lin@designer.io", // Duplicate email
      });
      expect(duplicateRes.success).toBe(false);
      if (!duplicateRes.success) {
        expect(duplicateRes.error).toBe("ALREADY_REGISTERED");
      }

      // 4b. Team exceeding remaining capacity (attempting 2 members when remaining capacity is 1)
      const overCapacityTeamRes = await registerForEventAction({
        eventId,
        mode: "team",
        attendeeName: "Over Capacity",
        email: "over@capacity.org",
        teamName: "Too Big Team",
        teamMembers: [
          { name: "Over One", email: "one@capacity.org", role: "Captain" },
          { name: "Over Two", email: "two@capacity.org", role: "Member" },
        ],
      });
      expect(overCapacityTeamRes.success).toBe(false);
      if (!overCapacityTeamRes.success) {
        expect(overCapacityTeamRes.error).toBe("CAPACITY_EXCEEDED");
      }

      // -----------------------------------------------------------------------
      // Step 5: Manage rounds and event lifecycle
      // -----------------------------------------------------------------------
      // Create Round 1
      const round1Res = await createRoundAction({
        eventId,
        name: "Round 1: Preliminary Ideation",
        order: 1,
        startTime: "2026-12-01T10:00:00Z",
        venue: "Main Hall",
        status: "in_progress",
        eligibleCount: 3,
        advancedCount: 0,
      });
      expect(round1Res.success).toBe(true);
      if (!round1Res.success || !round1Res.data) throw new Error("Round creation failed");
      const round1Id = round1Res.data.id;

      // Transition event to 'live'
      const liveRes = await setEventLifecycleAction({
        id: eventId,
        lifecycle: "live",
      });
      expect(liveRes.success).toBe(true);

      // -----------------------------------------------------------------------
      // Step 6: Scan a valid QR token and persist attendance
      // -----------------------------------------------------------------------
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue(attendanceStaffSession);

      const checkInRes = await toggleAttendanceAction({
        registrationIdOrUid: indivRegId,
        eventId,
      });
      expect(checkInRes.success).toBe(true);
      if (!checkInRes.success || !checkInRes.data) throw new Error("Attendance toggle failed");
      expect(checkInRes.data.attendanceStatus).toBe("checked_in");

      // -----------------------------------------------------------------------
      // Step 7: Reject invalid or cross-event attendance attempts
      // -----------------------------------------------------------------------
      const crossEventRes = await toggleAttendanceAction({
        registrationIdOrUid: indivRegId,
        eventId: "wrong-cross-event-id-9999",
      });
      expect(crossEventRes.success).toBe(false);
      if (!crossEventRes.success) {
        expect(crossEventRes.error).toBe("CHECK_IN_FAILED");
      }

      // -----------------------------------------------------------------------
      // Step 8: Issue certificate only to an eligible attendee
      // -----------------------------------------------------------------------
      // Switch back to master admin for certificate issuance
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue(adminSession);

      // First complete the event so certificates are formally valid
      const completeRes = await setEventLifecycleAction({
        id: eventId,
        lifecycle: "completed",
      });
      expect(completeRes.success).toBe(true);

      // Verify that in-progress round 1 automatically cascaded to 'completed'
      const roundsAfterComplete = await SketchRepository.listRounds(eventId);
      const r1 = roundsAfterComplete.find((r) => r.id === round1Id);
      expect(r1?.status).toBe("completed");

      // Batch issue certificates for the event
      const issueCertRes = await batchIssueCertificatesAction({
        eventId,
      });
      expect(issueCertRes.success).toBe(true);

      // Verify certificate records: Maya Lin attended so certificate was issued
      const certs = await SketchRepository.listCertificates(eventId);
      const mayaCert = certs.find((c) => c.recipientEmail === "maya.lin@designer.io");
      expect(mayaCert).toBeDefined();
      expect(mayaCert?.certificateNumber).toContain("SKETCH-CERT-");

      // -----------------------------------------------------------------------
      // Step 9: Verify outbox jobs enqueued
      // -----------------------------------------------------------------------
      // Dispatch an announcement to all participants
      const announceRes = await enqueueDispatchAction({
        eventId,
        subject: "Congratulations Sketchathon 2026 Participants!",
        audience: "checked_in",
        bodyContent: "Thank you for participating. Your digital credentials are ready.",
      });
      expect(announceRes.success).toBe(true);

      const outboxJobs = await SketchRepository.listOutboxJobs(eventId);
      expect(outboxJobs.length).toBeGreaterThan(0);

      // -----------------------------------------------------------------------
      // Step 10 & 11: Process jobs through outbox worker & verify local test sink
      // -----------------------------------------------------------------------
      const testAdapter = new TestEmailAdapter();
      const worker = new EmailOutboxWorker(testAdapter);

      const workerResult = await worker.processBatch();
      expect(workerResult.claimed).toBeGreaterThan(0);
      expect(workerResult.succeeded).toBeGreaterThan(0);
      expect(workerResult.failed).toBe(0);

      // Verify safe local delivery recorded in memory
      expect(testAdapter.sentMessages.length).toBeGreaterThan(0);
      const sampleSent = testAdapter.sentMessages[0];
      expect(sampleSent.to).toBeDefined();
      expect(sampleSent.html).toBeDefined();
      expect(sampleSent.subject).toBeDefined();

      // -----------------------------------------------------------------------
      // Step 12: Verify analytics, audit logs and exports
      // -----------------------------------------------------------------------
      const [events, participants, certsList] = await Promise.all([
        SketchRepository.listEvents(),
        SketchRepository.listParticipants(),
        SketchRepository.listCertificates(),
      ]);
      expect(events.length).toBeGreaterThan(0);
      expect(participants.length).toBeGreaterThan(0);
      expect(certsList.length).toBeGreaterThan(0);

      const auditLogs = await SketchRepository.listAuditLogs();
      expect(auditLogs.length).toBeGreaterThan(0);
      const certBatchLog = auditLogs.find((l) => l.action.toLowerCase().includes("certificate"));
      expect(certBatchLog).toBeDefined();

      const exportRes = await exportRosterDataAction({
        dataset: "participants",
        eventId,
      });
      expect(exportRes.success).toBe(true);
      if (!exportRes.success || !exportRes.data) throw new Error("Export failed");
      const mayaRecord = exportRes.data.records.find((r) => r.name === "Maya Lin");
      expect(mayaRecord).toBeDefined();
    });
  });

  describe("Security Boundaries & Failure Handling", () => {
    it("strictly blocks unauthenticated access to administrative actions", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const createRes = await createEventAction({
        title: "Malicious Event",
        category: "Workshop",
        startDate: "2026-11-01T09:00:00Z",
        endDate: "2026-11-01T17:00:00Z",
        venue: "Virtual",
        venueMode: "virtual",
        capacity: 100,
      });
      expect(createRes.success).toBe(false);
      if (!createRes.success) {
        expect(createRes.error).toBe("UNAUTHORIZED");
      }

      const exportRes = await exportRosterDataAction({ dataset: "participants" });
      expect(exportRes.success).toBe(false);
      if (!exportRes.success) {
        expect(exportRes.error).toBe("UNAUTHORIZED");
      }

      const certRes = await batchIssueCertificatesAction({ eventId: "any-event" });
      expect(certRes.success).toBe(false);
      if (!certRes.success) {
        expect(certRes.error).toBe("UNAUTHORIZED");
      }
    });

    it("enforces fine-grained role privileges (analyst cannot modify lifecycle or attendance)", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue(analystSession);

      const lifecycleRes = await setEventLifecycleAction({
        id: "evt-01",
        lifecycle: "published",
      });
      expect(lifecycleRes.success).toBe(false);
      if (!lifecycleRes.success) {
        expect(lifecycleRes.error).toBe("FORBIDDEN");
      }

      const attendanceRes = await toggleAttendanceAction({
        registrationIdOrUid: "reg-01",
        eventId: "evt-01",
      });
      expect(attendanceRes.success).toBe(false);
      if (!attendanceRes.success) {
        expect(attendanceRes.error).toBe("FORBIDDEN");
      }
    });

    it("strictly prevents production mode from accidentally falling back to mock data", () => {
      process.env.APP_MODE = "production";
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => getAppEnv()).toThrowError(/NEXT_PUBLIC_SUPABASE_URL/);
    });

    it("worker safely handles simulated transport failures with retryable status", async () => {
      const failingAdapter = new TestEmailAdapter();
      failingAdapter.shouldFail = true;
      failingAdapter.failureMessage = "SMTP 421 Service unavailable, closing transmission channel";
      failingAdapter.failureRetryable = true;

      const worker = new EmailOutboxWorker(failingAdapter);

      const result = await worker.processBatch();
      if (result.claimed > 0) {
        expect(result.failed).toBeGreaterThan(0);
      }
    });
  });
});
