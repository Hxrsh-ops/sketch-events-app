import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listTicketTemplatesAction,
  getTicketTemplateAction,
  createTicketTemplateAction,
  saveTemplateDraftAction,
  publishTemplateVersionAction,
  assignEventTemplateAction,
} from "@/app/actions/ticket-actions";
import {
  createRoundAction,
  updateRoundAction,
  deleteRoundAction,
  setRoundStatusAction,
  reorderRoundsAction,
} from "@/app/actions/round-actions";
import * as sessionModule from "@/lib/auth/session";
import { AdminRole, AdminUser } from "@/types";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Ticket Studio & Round Management Independent Server-Action Authorization", () => {
  const mockUserWithRole = (role: AdminRole): AdminUser => ({
    id: "usr-test-123",
    name: "Test Admin",
    email: "admin@sketch.test",
    role,
  });

  const setAuthSession = (role: AdminRole | null) => {
    if (role === null) {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });
    } else {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
        isAuthenticated: true,
        isAdmin: true,
        user: mockUserWithRole(role),
      });
    }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Ticket Studio: Read and Write Authorization Enforcement", () => {
    it("permits master_admin to read ticket templates", async () => {
      setAuthSession("master_admin");
      const listRes = await listTicketTemplatesAction();
      expect(listRes.success).toBe(true);
    });

    it("permits event_manager to read ticket templates", async () => {
      setAuthSession("event_manager");
      const listRes = await listTicketTemplatesAction();
      expect(listRes.success).toBe(true);
    });

    it("strictly blocks attendance_staff from reading ticket templates (FORBIDDEN)", async () => {
      setAuthSession("attendance_staff");
      const listRes = await listTicketTemplatesAction();
      expect(listRes.success).toBe(false);
      if (!listRes.success) {
        expect(listRes.error).toBe("FORBIDDEN");
      }

      const getRes = await getTicketTemplateAction("tmpl-001");
      expect(getRes.success).toBe(false);
      if (!getRes.success) {
        expect(getRes.error).toBe("FORBIDDEN");
      }
    });

    it("strictly blocks analyst from reading ticket templates (FORBIDDEN)", async () => {
      setAuthSession("analyst");
      const listRes = await listTicketTemplatesAction();
      expect(listRes.success).toBe(false);
      if (!listRes.success) {
        expect(listRes.error).toBe("FORBIDDEN");
      }

      const getRes = await getTicketTemplateAction("tmpl-001");
      expect(getRes.success).toBe(false);
      if (!getRes.success) {
        expect(getRes.error).toBe("FORBIDDEN");
      }
    });

    it("strictly blocks attendance_staff from mutating ticket templates (FORBIDDEN)", async () => {
      setAuthSession("attendance_staff");

      const createRes = await createTicketTemplateAction({ name: "Hacked Template" });
      expect(createRes.success).toBe(false);
      if (!createRes.success) {
        expect(createRes.error).toBe("FORBIDDEN");
      }

      const saveRes = await saveTemplateDraftAction({ templateId: "tmpl-001", designData: {} });
      expect(saveRes.success).toBe(false);
      if (!saveRes.success) {
        expect(saveRes.error).toBe("FORBIDDEN");
      }

      const publishRes = await publishTemplateVersionAction({ templateId: "tmpl-001", designData: {} });
      expect(publishRes.success).toBe(false);
      if (!publishRes.success) {
        expect(publishRes.error).toBe("FORBIDDEN");
      }

      const assignRes = await assignEventTemplateAction({ eventId: "evt-001", templateVersionId: "ver-001" });
      expect(assignRes.success).toBe(false);
      if (!assignRes.success) {
        expect(assignRes.error).toBe("FORBIDDEN");
      }
    });

    it("strictly blocks analyst from mutating ticket templates (FORBIDDEN)", async () => {
      setAuthSession("analyst");

      const createRes = await createTicketTemplateAction({ name: "Hacked Template" });
      expect(createRes.success).toBe(false);
      if (!createRes.success) {
        expect(createRes.error).toBe("FORBIDDEN");
      }

      const saveRes = await saveTemplateDraftAction({ templateId: "tmpl-001", designData: {} });
      expect(saveRes.success).toBe(false);
      if (!saveRes.success) {
        expect(saveRes.error).toBe("FORBIDDEN");
      }

      const publishRes = await publishTemplateVersionAction({ templateId: "tmpl-001", designData: {} });
      expect(publishRes.success).toBe(false);
      if (!publishRes.success) {
        expect(publishRes.error).toBe("FORBIDDEN");
      }

      const assignRes = await assignEventTemplateAction({ eventId: "evt-001", templateVersionId: "ver-001" });
      expect(assignRes.success).toBe(false);
      if (!assignRes.success) {
        expect(assignRes.error).toBe("FORBIDDEN");
      }
    });

    it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
      setAuthSession(null);

      const listRes = await listTicketTemplatesAction();
      expect(listRes.success).toBe(false);
      if (!listRes.success) {
        expect(listRes.error).toBe("UNAUTHORIZED");
      }

      const createRes = await createTicketTemplateAction({ name: "Test" });
      expect(createRes.success).toBe(false);
      if (!createRes.success) {
        expect(createRes.error).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("2. Round Management: Independent rounds:manage Enforcement", () => {
    const validRoundPayload = {
      eventId: "e0000000-0000-4000-8000-000000000001",
      name: "Round 1 - Prelims",
      order: 1,
      startTime: new Date().toISOString(),
      status: "scheduled",
    };

    it("permits master_admin to execute round mutations", async () => {
      setAuthSession("master_admin");

      const res = await createRoundAction(validRoundPayload);
      if (!res.success) {
        expect(res.error).not.toBe("FORBIDDEN");
        expect(res.error).not.toBe("UNAUTHORIZED");
      }
    });

    it("permits event_manager to execute round mutations", async () => {
      setAuthSession("event_manager");

      const res = await createRoundAction(validRoundPayload);
      if (!res.success) {
        expect(res.error).not.toBe("FORBIDDEN");
        expect(res.error).not.toBe("UNAUTHORIZED");
      }
    });

    it("strictly blocks attendance_staff from executing round mutations (FORBIDDEN)", async () => {
      setAuthSession("attendance_staff");

      const createRes = await createRoundAction(validRoundPayload);
      expect(createRes.success).toBe(false);
      if (!createRes.success) {
        expect(createRes.error).toBe("FORBIDDEN");
      }

      const updateRes = await updateRoundAction({ id: "rnd-1", eventId: "evt-1", name: "Updated" });
      expect(updateRes.success).toBe(false);
      if (!updateRes.success) {
        expect(updateRes.error).toBe("FORBIDDEN");
      }

      const deleteRes = await deleteRoundAction({ id: "rnd-1", eventId: "evt-1" });
      expect(deleteRes.success).toBe(false);
      if (!deleteRes.success) {
        expect(deleteRes.error).toBe("FORBIDDEN");
      }

      const statusRes = await setRoundStatusAction({ id: "rnd-1", eventId: "evt-1", status: "completed" });
      expect(statusRes.success).toBe(false);
      if (!statusRes.success) {
        expect(statusRes.error).toBe("FORBIDDEN");
      }

      const reorderRes = await reorderRoundsAction({ eventId: "evt-1", roundIds: ["rnd-1"] });
      expect(reorderRes.success).toBe(false);
      if (!reorderRes.success) {
        expect(reorderRes.error).toBe("FORBIDDEN");
      }
    });

    it("strictly blocks analyst from executing round mutations (FORBIDDEN)", async () => {
      setAuthSession("analyst");

      const createRes = await createRoundAction(validRoundPayload);
      expect(createRes.success).toBe(false);
      if (!createRes.success) {
        expect(createRes.error).toBe("FORBIDDEN");
      }

      const updateRes = await updateRoundAction({ id: "rnd-1", eventId: "evt-1", name: "Updated" });
      expect(updateRes.success).toBe(false);
      if (!updateRes.success) {
        expect(updateRes.error).toBe("FORBIDDEN");
      }

      const deleteRes = await deleteRoundAction({ id: "rnd-1", eventId: "evt-1" });
      expect(deleteRes.success).toBe(false);
      if (!deleteRes.success) {
        expect(deleteRes.error).toBe("FORBIDDEN");
      }

      const statusRes = await setRoundStatusAction({ id: "rnd-1", eventId: "evt-1", status: "completed" });
      expect(statusRes.success).toBe(false);
      if (!statusRes.success) {
        expect(statusRes.error).toBe("FORBIDDEN");
      }

      const reorderRes = await reorderRoundsAction({ eventId: "evt-1", roundIds: ["rnd-1"] });
      expect(reorderRes.success).toBe(false);
      if (!reorderRes.success) {
        expect(reorderRes.error).toBe("FORBIDDEN");
      }
    });

    it("rejects unauthenticated round mutations with UNAUTHORIZED", async () => {
      setAuthSession(null);

      const createRes = await createRoundAction(validRoundPayload);
      expect(createRes.success).toBe(false);
      if (!createRes.success) {
        expect(createRes.error).toBe("UNAUTHORIZED");
      }
    });
  });
});
