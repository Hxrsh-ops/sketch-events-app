import { describe, it, expect, vi, beforeEach } from "vitest";
import { SketchRepository } from "@/lib/supabase/repository";
import {
  createRoundAction,
  updateRoundAction,
  deleteRoundAction,
  setRoundStatusAction,
  reorderRoundsAction,
} from "@/app/actions/round-actions";
import { setEventLifecycleAction } from "@/app/actions/event-actions";
import { resetAppEnvCache } from "@/lib/env";
import { resetServerEnvCache } from "@/lib/env.server";
import { MOCK_ADMIN_USER } from "@/lib/mock-data";

// Mock next/cache so revalidatePath does not throw in test environment
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth session
const mockVerifyAdminSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  verifyAdminSession: () => mockVerifyAdminSession(),
}));

describe("Slice 4.3: Rounds & Event Lifecycle Integration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetAppEnvCache();
    resetServerEnvCache();
    process.env = { ...originalEnv };
    process.env.APP_MODE = "preview";
    vi.clearAllMocks();

    mockVerifyAdminSession.mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        ...MOCK_ADMIN_USER,
        role: "master_admin",
      },
    });
  });

  describe("1. Repository Rounds Operations (Preview/Authoritative Store)", () => {
    it("lists rounds deterministically ordered by order field", async () => {
      const rounds = await SketchRepository.listRounds();
      expect(Array.isArray(rounds)).toBe(true);
      expect(rounds.length).toBeGreaterThan(0);

      // Verify structure
      const first = rounds[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("eventId");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("order");
      expect(first).toHaveProperty("status");
    });

    it("filters rounds by specific eventId", async () => {
      const eventId = "evt-01";
      const rounds = await SketchRepository.listRounds(eventId);
      expect(Array.isArray(rounds)).toBe(true);
      expect(rounds.every((r) => r.eventId === eventId)).toBe(true);
    });

    it("creates a new round and assigns appropriate order and defaults", async () => {
      const newRound = await SketchRepository.createRound({
        eventId: "evt-01",
        name: "Quarter Finals Challenge",
        order: 99,
        venue: "Hall B",
        eligibleCount: 16,
        advancedCount: 8,
      });

      expect(newRound.id).toBeDefined();
      expect(newRound.name).toBe("Quarter Finals Challenge");
      expect(newRound.venue).toBe("Hall B");
      expect(newRound.status).toBe("upcoming");
      expect(newRound.eligibleCount).toBe(16);
      expect(newRound.advancedCount).toBe(8);

      // Verify retrieval
      const fetched = await SketchRepository.getRoundById(newRound.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe("Quarter Finals Challenge");
    });

    it("updates existing round details safely", async () => {
      const created = await SketchRepository.createRound({
        eventId: "evt-01",
        name: "Semi Finals",
        venue: "Room 101",
      });

      const updated = await SketchRepository.updateRound(created.id, {
        name: "Semi Finals (Extended)",
        venue: "Auditorium",
        status: "in_progress",
      });

      expect(updated.name).toBe("Semi Finals (Extended)");
      expect(updated.venue).toBe("Auditorium");
      expect(updated.status).toBe("in_progress");
    });

    it("reorders rounds sequence within an event", async () => {
      const r1 = await SketchRepository.createRound({ eventId: "evt-reorder", name: "Stage 1", order: 1 });
      const r2 = await SketchRepository.createRound({ eventId: "evt-reorder", name: "Stage 2", order: 2 });

      // Invert order
      const reordered = await SketchRepository.reorderRounds("evt-reorder", [r2.id, r1.id]);
      expect(reordered.length).toBe(2);
      expect(reordered[0].id).toBe(r2.id);
      expect(reordered[0].order).toBe(1);
      expect(reordered[1].id).toBe(r1.id);
      expect(reordered[1].order).toBe(2);
    });

    it("deletes a round cleanly", async () => {
      const created = await SketchRepository.createRound({
        eventId: "evt-delete",
        name: "Temporary Stage",
      });

      const delResult = await SketchRepository.deleteRound(created.id);
      expect(delResult.success).toBe(true);
      expect(delResult.eventId).toBe("evt-delete");

      const fetched = await SketchRepository.getRoundById(created.id);
      expect(fetched).toBeNull();
    });
  });

  describe("2. Server Actions Authorization & Validation", () => {
    it("rejects unauthenticated caller from creating a round", async () => {
      mockVerifyAdminSession.mockResolvedValueOnce({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const result = await createRoundAction({
        eventId: "evt-01",
        name: "Unauthorized Round",
        venue: "Auditorium",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Unauthorized/i);
      }
    });

    it("rejects caller without events:edit permission (e.g. attendance_staff)", async () => {
      mockVerifyAdminSession.mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: false,
        user: {
          ...MOCK_ADMIN_USER,
          role: "attendance_staff",
        },
      });

      const result = await createRoundAction({
        eventId: "evt-01",
        name: "Staff Round",
        venue: "Auditorium",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Forbidden/i);
      }
    });

    it("allows event_manager with events:edit permission to create and update rounds", async () => {
      mockVerifyAdminSession.mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          ...MOCK_ADMIN_USER,
          role: "event_manager",
        },
      });

      const createRes = await createRoundAction({
        eventId: "evt-01",
        name: "Manager Round",
        venue: "Design Lab",
      });

      expect(createRes.success).toBe(true);
      if (!createRes.success) return;
      expect(createRes.data.name).toBe("Manager Round");

      const updateRes = await updateRoundAction({
        id: createRes.data.id,
        eventId: "evt-01",
        name: "Manager Round Updated",
      });

      expect(updateRes.success).toBe(true);
      if (!updateRes.success) return;
      expect(updateRes.data.name).toBe("Manager Round Updated");
    });

    it("rejects cross-event ownership mismatch when updating or deleting a round", async () => {
      const created = await SketchRepository.createRound({
        eventId: "evt-legit",
        name: "Legit Round",
      });

      // Attempt to update with mismatched eventId
      const spoofedUpdate = await updateRoundAction({
        id: created.id,
        eventId: "evt-spoofed",
        name: "Hacked Round",
      });

      expect(spoofedUpdate.success).toBe(false);
      if (!spoofedUpdate.success) {
        expect(spoofedUpdate.error).toBe("CROSS_EVENT_MISMATCH");
      }

      // Attempt to delete with mismatched eventId
      const spoofedDelete = await deleteRoundAction({
        id: created.id,
        eventId: "evt-spoofed",
      });
      expect(spoofedDelete.success).toBe(false);
      if (!spoofedDelete.success) {
        expect(spoofedDelete.error).toBe("CROSS_EVENT_MISMATCH");
      }
    });

    it("updates round status through dedicated setRoundStatusAction", async () => {
      const created = await SketchRepository.createRound({
        eventId: "evt-01",
        name: "Status Test Round",
      });

      const res = await setRoundStatusAction({
        id: created.id,
        eventId: "evt-01",
        status: "in_progress",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.status).toBe("in_progress");
      }

      const res2 = await setRoundStatusAction({
        id: created.id,
        eventId: "evt-01",
        status: "completed",
      });
      expect(res2.success).toBe(true);
      if (res2.success) {
        expect(res2.data.status).toBe("completed");
      }
    });

    it("reorders rounds through reorderRoundsAction", async () => {
      const r1 = await SketchRepository.createRound({ eventId: "evt-seq", name: "Seq 1", order: 1 });
      const r2 = await SketchRepository.createRound({ eventId: "evt-seq", name: "Seq 2", order: 2 });

      const res = await reorderRoundsAction({
        eventId: "evt-seq",
        roundIds: [r2.id, r1.id],
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data[0].id).toBe(r2.id);
        expect(res.data[1].id).toBe(r1.id);
      }
    });
  });

  describe("3. Lifecycle State Invariants & Event Operations", () => {
    it("prevents demoting published event to draft if registeredCount > 0", async () => {
      // Create or ensure an event has registeredCount > 0
      const updatedLifecycle = SketchRepository.setEventLifecycle("evt-01", "draft");
      await expect(updatedLifecycle).rejects.toThrow(/Cannot revert an event to Draft once registrations have been recorded/i);
    });

    it("prevents completed/archived events from reverting to draft or live", async () => {
      // evt-05 is draft with 0 registrations. Transition to completed:
      await SketchRepository.setEventLifecycle("evt-05", "completed");

      // Attempt to revert completed event to draft
      await expect(SketchRepository.setEventLifecycle("evt-05", "draft")).rejects.toThrow(
        /Cannot transition event from terminal state "completed" to "draft"/i
      );

      // Attempt to revert completed event to live
      await expect(SketchRepository.setEventLifecycle("evt-05", "live")).rejects.toThrow(
        /Cannot transition event from terminal state "completed" to "live"/i
      );
    });

    it("auto-closes registration state and completes in-progress rounds when event is completed", async () => {
      // Setup an event with an in-progress round
      const ev = await SketchRepository.getEventById("evt-02");
      expect(ev).not.toBeNull();

      const round = await SketchRepository.createRound({
        eventId: "evt-02",
        name: "Live Stage",
        status: "in_progress",
      });

      // Complete event via lifecycle
      const completedEvent = await SketchRepository.setEventLifecycle("evt-02", "completed");
      expect(completedEvent.lifecycle).toBe("completed");
      expect(completedEvent.registrationState).toBe("closed");

      // Verify the in-progress round was auto-completed
      const fetchedRound = await SketchRepository.getRoundById(round.id);
      expect(fetchedRound?.status).toBe("completed");
    });

    it("enforces events:publish permission for lifecycle server action", async () => {
      // Analyst has events:read but not events:publish
      mockVerifyAdminSession.mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: false,
        user: {
          ...MOCK_ADMIN_USER,
          role: "analyst",
        },
      });

      const res = await setEventLifecycleAction({ id: "evt-01", lifecycle: "completed" });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toMatch(/Forbidden/i);
      }
    });
  });
});
