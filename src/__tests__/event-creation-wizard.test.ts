import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEventAction } from "@/app/actions/event-actions";
import { SketchRepository } from "@/lib/supabase/repository";
import * as sessionModule from "@/lib/auth/session";
import { resetAppEnvCache } from "@/lib/env";
import { cloneFormSchema, STANDARD_INDIVIDUAL_TEMPLATE, HACKATHON_TEAM_TEMPLATE } from "@/lib/form-templates";

// Mock next/cache so revalidatePath does not fail in Vitest
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Slice 3.3: Event Creation Wizard Integration & Server Actions", () => {
  const originalEnv = { ...process.env };

  const adminUser = {
    id: "usr-admin-test",
    email: "admin@sketchclub.internal",
    name: "Alex Organizer",
    role: "event_manager" as const,
  };

  const baseWizardPayload = {
    title: "Sketch Dynamic Interaction Symposium 2026",
    slug: "sketch-interaction-symposium-2026",
    category: "Design",
    shortDescription: "Exploring tactile interfaces and creative code.",
    description: "Full day symposium featuring workshops, panels, and live coding demos.",
    directoryImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
    directoryImageFocalPoint: "center center",
    heroImage: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
    heroImageFocalPoint: "center top",
    posterUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
    startDate: "2026-11-15T10:00:00.000Z",
    endDate: "2026-11-15T18:00:00.000Z",
    venue: "Design Studio Alpha, Floor 3",
    venueMode: "in-person" as const,
    capacity: 120,
    lifecycle: "draft" as const,
    registrationState: "upcoming" as const,
    hasTeams: false,
    minTeamSize: null,
    maxTeamSize: null,
    hasRounds: true,
    registrationForm: cloneFormSchema(STANDARD_INDIVIDUAL_TEMPLATE) as unknown as Record<string, unknown>,
  };

  beforeEach(() => {
    resetAppEnvCache();
    process.env = { ...originalEnv };
    process.env.APP_MODE = "preview";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.restoreAllMocks();

    // Default authenticated session as event_manager
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      isPreview: true,
      user: adminUser,
    });
  });

  describe("1. Draft Submission vs. Publish Submission", () => {
    it("persists a newly created event as Draft with 'upcoming' registration state", async () => {
      const draftPayload = {
        ...baseWizardPayload,
        lifecycle: "draft" as const,
        registrationState: "upcoming" as const,
      };

      const result = await createEventAction(draftPayload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.id).toMatch(/^evt-/);
        expect(result.data.lifecycle).toBe("draft");
        expect(result.data.registrationState).toBe("upcoming");
        expect(result.data.title).toBe(draftPayload.title);

        // Verify retrievable in repository
        const retrieved = await SketchRepository.getEventById(result.data.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.lifecycle).toBe("draft");
      }
    });

    it("persists a newly created event as Published with 'open' registration state", async () => {
      const publishPayload = {
        ...baseWizardPayload,
        title: "Published Open Hackathon 2026",
        slug: "published-open-hackathon-2026",
        lifecycle: "published" as const,
        registrationState: "open" as const,
      };

      const result = await createEventAction(publishPayload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.lifecycle).toBe("published");
        expect(result.data.registrationState).toBe("open");

        const retrieved = await SketchRepository.getEventById(result.data.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.lifecycle).toBe("published");
      }
    });
  });

  describe("2. Custom Registration Form Schema Preservation", () => {
    it("preserves dynamic form builder sections and fields accurately", async () => {
      const customForm = cloneFormSchema(HACKATHON_TEAM_TEMPLATE);
      customForm.sections[0].fields.push({
        id: "q-custom-diet",
        type: "select",
        label: "Dietary Preferences",
        required: true,
        options: [
          { label: "Vegan", value: "vegan" },
          { label: "Vegetarian", value: "vegetarian" },
          { label: "Gluten-Free", value: "gluten-free" },
          { label: "Standard", value: "standard" },
        ],
      });

      const payload = {
        ...baseWizardPayload,
        title: "Hackathon with Custom Registration Schema",
        hasTeams: true,
        minTeamSize: 2,
        maxTeamSize: 4,
        registrationForm: customForm as unknown as Record<string, unknown>,
      };

      const result = await createEventAction(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.registrationForm).toBeDefined();
        const savedForm = result.data.registrationForm as typeof customForm;
        expect(savedForm.sections.length).toBe(customForm.sections.length);
        const customField = savedForm.sections[0].fields.find((f) => f.id === "q-custom-diet");
        expect(customField).toBeDefined();
        expect(customField?.label).toBe("Dietary Preferences");
        expect(customField?.options?.map((o) => o.label)).toContain("Vegan");
      }
    });
  });

  describe("3. Independent Artwork Asset Preservation", () => {
    it("preserves separate directoryImage and heroImage alongside their focal anchors", async () => {
      const payload = {
        ...baseWizardPayload,
        directoryImage: "https://example.com/directory-16-9.jpg",
        directoryImageFocalPoint: "center center",
        heroImage: "https://example.com/hero-panorama.jpg",
        heroImageFocalPoint: "top center",
      };

      const result = await createEventAction(payload);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.directoryImage).toBe("https://example.com/directory-16-9.jpg");
        expect(result.data.directoryImageFocalPoint).toBe("center center");
        expect(result.data.heroImage).toBe("https://example.com/hero-panorama.jpg");
        expect(result.data.heroImageFocalPoint).toBe("top center");
      }
    });
  });

  describe("4. Team Participation Constraints", () => {
    it("validates team sizes when hasTeams is true", async () => {
      const validTeamPayload = {
        ...baseWizardPayload,
        hasTeams: true,
        minTeamSize: 3,
        maxTeamSize: 5,
      };

      const result = await createEventAction(validTeamPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasTeams).toBe(true);
        expect(result.data.minTeamSize).toBe(3);
        expect(result.data.maxTeamSize).toBe(5);
      }
    });

    it("rejects submission when maxTeamSize is strictly less than minTeamSize", async () => {
      const invalidTeamPayload = {
        ...baseWizardPayload,
        hasTeams: true,
        minTeamSize: 5,
        maxTeamSize: 2, // invalid
      };

      const result = await createEventAction(invalidTeamPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("VALIDATION_FAILED");
        expect(result.details?.maxTeamSize).toBeDefined();
      }
    });
  });

  describe("5. Validation and Input Integrity", () => {
    it("rejects event when end date is not strictly after start date", async () => {
      const invalidDatePayload = {
        ...baseWizardPayload,
        startDate: "2026-11-15T18:00:00.000Z",
        endDate: "2026-11-15T10:00:00.000Z", // before start
      };

      const result = await createEventAction(invalidDatePayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("VALIDATION_FAILED");
        expect(result.details?.endDate).toBeDefined();
      }
    });

    it("rejects event when capacity is non-positive", async () => {
      const invalidCapacityPayload = {
        ...baseWizardPayload,
        capacity: 0,
      };

      const result = await createEventAction(invalidCapacityPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("VALIDATION_FAILED");
        expect(result.details?.capacity).toBeDefined();
      }
    });
  });

  describe("6. Authorization and Role Enforcement", () => {
    it("permits master_admin to create events", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        isPreview: true,
        user: { ...adminUser, role: "master_admin" },
      });

      const result = await createEventAction(baseWizardPayload);
      expect(result.success).toBe(true);
    });

    it("forbids attendance_staff and analyst from creating events", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        isPreview: true,
        user: { ...adminUser, role: "attendance_staff" },
      });

      const staffResult = await createEventAction(baseWizardPayload);
      expect(staffResult.success).toBe(false);
      if (!staffResult.success) {
        expect(staffResult.error).toBe("FORBIDDEN");
      }

      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        isPreview: true,
        user: { ...adminUser, role: "analyst" },
      });

      const analystResult = await createEventAction(baseWizardPayload);
      expect(analystResult.success).toBe(false);
      if (!analystResult.success) {
        expect(analystResult.error).toBe("FORBIDDEN");
      }
    });

    it("rejects unauthenticated requests", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: false,
        isAdmin: false,
        isPreview: false,
        user: null,
      });

      const result = await createEventAction(baseWizardPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("UNAUTHORIZED");
      }
    });
  });
});
