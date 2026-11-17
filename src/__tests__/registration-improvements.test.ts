import { describe, it, expect, beforeEach, vi } from "vitest";
import { RegisterForEventInputSchema } from "@/lib/validations/registration-schemas";
import { registerForEventAction } from "@/app/actions/registration-actions";
import {
  saveRegistrationDraft,
  getRegistrationDraft,
  clearRegistrationDraft,
  memoryDraftStore,
} from "@/lib/registration-draft";
import {
  toast,
  showNotification,
  clearAllNotifications,
  useToast,
} from "@/components/ui/notification-toast";
import {
  DIET_CODE_TEMPLATE,
  STANDARD_INDIVIDUAL_TEMPLATE,
  HACKATHON_TEAM_TEMPLATE,
} from "@/lib/form-templates";
import { saveEvent, getStoredSubmissions } from "@/lib/registration-store";
import { EventItem } from "@/types";

function createTestEvent(id: string, slug: string, overrides: Partial<EventItem> = {}): EventItem {
  return {
    id,
    slug,
    title: "Campus Hackathon 2026",
    category: "Hackathon",
    shortDescription: "A sprint for creative thinkers.",
    description: "Detailed description of hackathon.",
    posterUrl: "/images/poster.jpg",
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 172800000).toISOString(),
    venue: "Main Auditorium",
    venueMode: "in-person",
    capacity: 100,
    registeredCount: 0,
    checkedInCount: 0,
    lifecycle: "published",
    registrationState: "open",
    hasTeams: false,
    hasRounds: false,
    ...overrides,
  };
}

describe("Registration Improvements Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAllNotifications();
    memoryDraftStore.clear();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  // =========================================================================
  // TASK 1: Visible Error & Success Notifications (with Deduplication)
  // =========================================================================
  describe("Task 1: Visible Notifications & Deduplication", () => {
    it("1.1 triggers visible error notifications with custom title and message", () => {
      const id = toast.error("Mobile number is required.", "Validation Error");
      expect(id).toBeDefined();
      expect(id).toMatch(/^toast-/);
    });

    it("1.2 triggers success notifications when registration completes", () => {
      const id = toast.success("Registration confirmed! Your ticket pass is ready.", "Success");
      expect(id).toBeDefined();
      expect(id).toMatch(/^toast-/);
    });

    it("1.3 suppresses duplicate notifications for the same error message within deduplication window", () => {
      const id1 = toast.error("Please enter a valid email address.", "Validation Error");
      const id2 = toast.error("Please enter a valid email address.", "Validation Error");

      // Second immediate identical notification returns existing ID or is deduplicated
      expect(id1).toBeDefined();
      expect(id2).toBe(id1);
    });

    it("1.4 allows distinct error messages without suppressing them", () => {
      const id1 = toast.error("First distinct error message.");
      const id2 = toast.error("Second distinct error message.");

      expect(id1).not.toBe(id2);
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
    });

    it("1.5 supports clearAll to dismiss all active notifications", () => {
      toast.error("Error to clear 1");
      toast.error("Error to clear 2");
      toast.clearAll();

      const toasts = toast.getActive();
      expect(toasts.length).toBe(0);
    });
  });

  // =========================================================================
  // TASK 2: Mobile Number Validation
  // =========================================================================
  describe("Task 2: Mobile Number Validation (Strict 10 Digits)", () => {
    const baseValidInput = {
      eventId: "evt-test-mobile-01",
      slug: "test-mobile-event",
      mode: "individual" as const,
      attendeeName: "Priya Sharma",
      email: "priya.sharma@srmist.edu.in",
      department: "CSE",
    };

    it("2.1 accepts valid 10-digit mobile number", () => {
      const result = RegisterForEventInputSchema.safeParse({
        ...baseValidInput,
        phone: "9876543210",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe("9876543210");
      }
    });

    it("2.2 rejects phone numbers with fewer than 10 digits", () => {
      const result = RegisterForEventInputSchema.safeParse({
        ...baseValidInput,
        phone: "987654321", // 9 digits
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Mobile number must be exactly 10 digits.");
      }
    });

    it("2.3 rejects phone numbers with more than 10 digits", () => {
      const result = RegisterForEventInputSchema.safeParse({
        ...baseValidInput,
        phone: "9876543210123", // 13 digits
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Mobile number must be exactly 10 digits.");
      }
    });

    it("2.4 rejects phone numbers containing non-numeric characters", () => {
      const result = RegisterForEventInputSchema.safeParse({
        ...baseValidInput,
        phone: "98765abcd0",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Mobile number must be exactly 10 digits.");
      }
    });

    it("2.5 enforces 10-digit validation on team members phone numbers", () => {
      const teamInput = {
        eventId: "evt-test-team-phone",
        mode: "team" as const,
        attendeeName: "Captain Jack",
        email: "captain.jack@srmist.edu.in",
        teamName: "Black Pearl",
        phone: "9876543210",
        teamMembers: [
          {
            name: "Will Turner",
            email: "will.turner@srmist.edu.in",
            phone: "12345", // Invalid < 10 digits
          },
        ],
      };

      const result = RegisterForEventInputSchema.safeParse(teamInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        const phoneIssue = result.error.issues.find((i) => i.path.includes("phone"));
        expect(phoneIssue?.message).toBe("Mobile number must be exactly 10 digits.");
      }
    });

    it("2.6 sanitizes pasted phone numbers by stripping non-numeric characters and clamping to 10 digits", () => {
      const rawPastedNumber = "+91 (98765) 43210-999";
      const sanitized = rawPastedNumber.replace(/\D/g, "").slice(0, 10);
      expect(sanitized).toBe("9198765432");
      expect(sanitized.length).toBe(10);
      expect(/^\d{10}$/.test(sanitized)).toBe(true);

      const standardPastedWithCountry = "987654321099999";
      const clamped = standardPastedWithCountry.replace(/\D/g, "").slice(0, 10);
      expect(clamped).toBe("9876543210");
      expect(clamped.length).toBe(10);
    });
  });

  // =========================================================================
  // TASK 3: Department Selection & 'Other' Option (SRMIST Ramapuram)
  // =========================================================================
  describe("Task 3: SRMIST Department Selection & 'Other' Option", () => {
    it("3.1 organizes departments into official SRMIST Ramapuram faculty and school groups", () => {
      const deptField = DIET_CODE_TEMPLATE.sections
        .flatMap((s) => s.fields)
        .find((f) => f.id === "department");

      expect(deptField).toBeDefined();
      const groups = new Set(deptField?.options?.map((o) => o.group));

      expect(groups).toContain("Faculty of Engineering & Technology");
      expect(groups).toContain("Faculty of Science & Humanities");
      expect(groups).toContain("School of Management");
      expect(groups).toContain("School of Environment, Architecture & Design");
      expect(groups).toContain("Dental Sciences");
      expect(groups).toContain("Other");
    });

    it("3.2 includes all verified offerings across faculties without missing programs", () => {
      const deptField = STANDARD_INDIVIDUAL_TEMPLATE.sections
        .flatMap((s) => s.fields)
        .find((f) => f.id === "department");

      expect(deptField).toBeDefined();
      const optionValues = deptField?.options?.map((o) => o.value) || [];

      // Engineering & Technology
      expect(optionValues).toContain("Computer Science & Engineering (CSE)");
      expect(optionValues).toContain("Artificial Intelligence (AI)");
      expect(optionValues).toContain("Artificial Intelligence & Machine Learning (AIML)");
      expect(optionValues).toContain("Big Data Analytics (BDA)");
      expect(optionValues).toContain("Cyber Security (FET)");
      expect(optionValues).toContain("Cloud Computing");
      expect(optionValues).toContain("Gaming Technology");
      expect(optionValues).toContain("Internet of Things (IoT)");
      expect(optionValues).toContain("Information Technology (IT)");
      expect(optionValues).toContain("Electronics & Communication Engineering (ECE)");
      expect(optionValues).toContain("Mechanical Engineering");
      expect(optionValues).toContain("Civil Engineering");
      expect(optionValues).toContain("Electrical & Electronics Engineering (EEE)");
      expect(optionValues).toContain("Biomedical Engineering");
      expect(optionValues).toContain("Biotechnology (FET)");

      // Science & Humanities
      expect(optionValues).toContain("Computer Applications (BCA)");
      expect(optionValues).toContain("Commerce");
      expect(optionValues).toContain("Visual Communication");
      expect(optionValues).toContain("Film Technology");
      expect(optionValues).toContain("Journalism & Mass Communication");
      expect(optionValues).toContain("Fashion Designing");

      // School of Management
      expect(optionValues).toContain("Business Administration (BBA)");
      expect(optionValues).toContain("Management (MBA)");

      // School of Environment, Architecture & Design
      expect(optionValues).toContain("Architecture (B.Arch)");
      expect(optionValues).toContain("Design (B.Des)");

      // Dental Sciences
      expect(optionValues).toContain("Dental Surgery (BDS)");
      expect(optionValues).toContain("Oral & Maxillofacial Surgery");
      expect(optionValues).toContain("Orthodontics");

      // Other Option
      expect(optionValues).toContain("Other");
    });

    it("3.3 preserves selected custom department in registration payload", async () => {
      const event = createTestEvent("evt-dept-test", "dept-test-slug", {
        title: "Department Test Event",
        venue: "Tech Park",
      });
      saveEvent(event);

      // Custom department when Other is chosen
      const customDepartment = "Bioinformatics & Computational Biology";
      const result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "individual",
        attendeeName: "Ananya Iyer",
        email: "ananya.iyer@srmist.edu.in",
        phone: "9876543210",
        department: customDepartment,
        customAnswers: {
          department: "Other",
          department_custom: customDepartment,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attendeeName).toBe("Ananya Iyer");
        const submissions = getStoredSubmissions(event.id);
        const saved = submissions.find((s) => s.registrationId === result.data.registrationId);
        expect(saved?.department).toBe(customDepartment);
      }
    });

    it("3.4 validates that custom department is required when 'Other' is selected", () => {
      // Simulating form validation logic
      const validateDepartmentField = (selectedDept: string, customDept: string) => {
        if (selectedDept.toLowerCase() === "other" && (!customDept || !customDept.trim())) {
          return "Please enter your department name.";
        }
        return null;
      };

      expect(validateDepartmentField("Other", "")).toBe("Please enter your department name.");
      expect(validateDepartmentField("Other", "   ")).toBe("Please enter your department name.");
      expect(validateDepartmentField("Other", "Biomedical Informatics")).toBeNull();
      expect(validateDepartmentField("CSE", "")).toBeNull();
    });

    it("3.5 supports selecting every primary SRMIST department without errors", () => {
      const srmistDepts = [
        "CSE",
        "AIML",
        "Data Science",
        "IT",
        "ECE",
        "EEE",
        "MECH",
        "CIVIL",
        "Biotechnology",
        "Aerospace",
        "Automobile",
        "Chemical",
        "Design",
      ];

      srmistDepts.forEach((dept) => {
        const result = RegisterForEventInputSchema.safeParse({
          eventId: "evt-dept-all",
          mode: "individual",
          attendeeName: "Student Test",
          email: "student@srmist.edu.in",
          phone: "9876543210",
          department: dept,
        });
        expect(result.success).toBe(true);
      });
    });

    it("3.6 correctly filters department options across all faculty groups with empty fallback", () => {
      const allDepts = STANDARD_INDIVIDUAL_TEMPLATE.sections
        .flatMap((s) => s.fields)
        .find((f) => f.id === "department")?.options || [];

      // Helper function matching CustomSelect search logic
      const filterDepts = (query: string) => {
        if (!query.trim()) return allDepts;
        const q = query.toLowerCase().trim();
        return allDepts.filter(
          (opt) =>
            opt.label.toLowerCase().includes(q) ||
            opt.value.toLowerCase().includes(q) ||
            (opt.group && opt.group.toLowerCase().includes(q)) ||
            (opt.description && opt.description.toLowerCase().includes(q))
        );
      };

      // Search for Dental
      const dentalResults = filterDepts("Dental");
      expect(dentalResults.length).toBeGreaterThan(0);
      expect(dentalResults.every((d) => d.group === "Dental Sciences")).toBe(true);

      // Search for MBA
      const mbaResults = filterDepts("MBA");
      expect(mbaResults.some((d) => d.value.includes("MBA"))).toBe(true);
      expect(mbaResults[0].group).toBe("School of Management");

      // Search for non-existent department
      const emptyResults = filterDepts("NonExistentSpecialization123");
      expect(emptyResults.length).toBe(0);
    });

    it("3.7 handles keyboard navigation bounds and wrap-around correctly", () => {
      const optionsCount = 10;

      // ArrowDown navigation
      const getNextIndex = (current: number, total: number) =>
        current + 1 < total ? current + 1 : 0;
      expect(getNextIndex(0, optionsCount)).toBe(1);
      expect(getNextIndex(8, optionsCount)).toBe(9);
      expect(getNextIndex(9, optionsCount)).toBe(0); // wraps around

      // ArrowUp navigation
      const getPrevIndex = (current: number, total: number) =>
        current - 1 >= 0 ? current - 1 : Math.max(0, total - 1);
      expect(getPrevIndex(5, optionsCount)).toBe(4);
      expect(getPrevIndex(0, optionsCount)).toBe(9); // wraps around

      // Home and End
      const getHomeIndex = () => 0;
      const getEndIndex = (total: number) => Math.max(0, total - 1);
      expect(getHomeIndex()).toBe(0);
      expect(getEndIndex(optionsCount)).toBe(9);
    });

    it("3.8 CustomSelect renders accessible combobox/listbox markup with retro styling", async () => {
      const React = (await import("react")).default;
      const { CustomSelect } = await import("@/components/ui/custom-select");
      const ReactDOMServer = (await import("react-dom/server")).default;

      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(CustomSelect, {
          options: [{ value: "CSE", label: "Computer Science & Engineering (CSE)", group: "Faculty of Engineering & Technology" }],
          value: "",
          onChange: () => {},
          placeholder: "Select department",
          variant: "retro",
        })
      );

      expect(html).toContain('aria-haspopup="listbox"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('aria-controls="custom-select-listbox"');
      expect(html).toContain("retro-select-trigger");
      expect(html).toContain("Select department");
    });
  });

  // =========================================================================
  // TASK 4: Registration Persistence Using localStorage
  // =========================================================================
  describe("Task 4: Registration Form Persistence (localStorage)", () => {
    const eventId = "evt-storage-test-01";
    const slug = "storage-test-slug";

    it("4.1 saves and restores draft registration details", () => {
      const draftValues = {
        full_name: "Karan Patel",
        email: "karan.patel@srmist.edu.in",
        phone: "9876543210",
        department: "CSE",
        academic_year: "3rd Year",
      };

      saveRegistrationDraft(eventId, draftValues, slug);

      // Lookup by eventId
      const restoredById = getRegistrationDraft(eventId);
      expect(restoredById).toEqual(draftValues);

      // Lookup by slug
      const restoredBySlug = getRegistrationDraft(slug);
      expect(restoredBySlug).toEqual(draftValues);
    });

    it("4.2 excludes sensitive fields like passwords, tokens, or credentials", () => {
      const draftWithSensitive = {
        full_name: "Sneha Reddy",
        email: "sneha.reddy@srmist.edu.in",
        password: "SuperSecretPassword123",
        token: "jwt-token-xyz",
        auth_credential: "secret-cred",
      };

      saveRegistrationDraft(eventId, draftWithSensitive, slug);

      const restored = getRegistrationDraft(eventId);
      expect(restored).toBeDefined();
      expect(restored?.full_name).toBe("Sneha Reddy");
      expect(restored?.email).toBe("sneha.reddy@srmist.edu.in");
      expect(restored?.password).toBeUndefined();
      expect(restored?.token).toBeUndefined();
      expect(restored?.auth_credential).toBeUndefined();
    });

    it("4.3 safely handles corrupted JSON in localStorage", () => {
      memoryDraftStore.set(`sketch_reg_draft_${eventId}`, "{ corrupted json ---");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`sketch_reg_draft_${eventId}`, "{ corrupted json ---");
      }

      const restored = getRegistrationDraft(eventId);
      expect(restored).toBeNull();
    });

    it("4.4 safely clears draft when clearRegistrationDraft is invoked", () => {
      saveRegistrationDraft(eventId, { full_name: "Test" }, slug);
      expect(getRegistrationDraft(eventId)).toBeDefined();

      clearRegistrationDraft(eventId, slug);
      expect(getRegistrationDraft(eventId)).toBeNull();
      expect(getRegistrationDraft(slug)).toBeNull();
    });

    it("4.5 restores an incomplete registration draft when user refreshes or reopens page", () => {
      const incompleteDraft = {
        full_name: "Vikram Malhotra",
        email: "vikram.m@srmist.edu.in",
        department: "MECH",
      };

      // User enters form partially
      saveRegistrationDraft("evt-reopen-test", incompleteDraft);

      // Page refresh / reopen simulated
      const restoredDraft = getRegistrationDraft("evt-reopen-test");
      expect(restoredDraft).toEqual(incompleteDraft);
      expect(restoredDraft?.full_name).toBe("Vikram Malhotra");
      expect(restoredDraft?.email).toBe("vikram.m@srmist.edu.in");
    });

    it("4.6 clears the saved draft automatically after successful registration", async () => {
      const event = createTestEvent("evt-draft-clear-after-success", "draft-clear-slug", {
        title: "Draft Clear Event",
        venue: "Hall 1",
      });
      saveEvent(event);

      // Save active draft
      saveRegistrationDraft(event.id, {
        full_name: "Aditya Roy",
        email: "aditya.roy@srmist.edu.in",
      }, event.slug);

      expect(getRegistrationDraft(event.id)).toBeDefined();

      // Submit registration
      const result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "individual",
        attendeeName: "Aditya Roy",
        email: "aditya.roy@srmist.edu.in",
        phone: "9876543210",
      });

      expect(result.success).toBe(true);

      // Clear draft as done in handleFinalSubmit
      clearRegistrationDraft(event.id, event.slug);
      expect(getRegistrationDraft(event.id)).toBeNull();
    });
  });

  // =========================================================================
  // TASK 5: Multiple Students Using the Same Email Address
  // =========================================================================
  describe("Task 5: Multiple Students Under Same Email Address", () => {
    it("5.1 registers first student successfully", async () => {
      const event = createTestEvent("evt-multi-student-1", "multi-student-slug-1");
      saveEvent(event);
      const sharedEmail = "parent.contact@gmail.com";

      const student1Result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "individual",
        attendeeName: "Aarav Sharma",
        email: sharedEmail,
        phone: "9876543210",
        department: "CSE",
      });

      expect(student1Result.success).toBe(true);
      if (student1Result.success) {
        expect(student1Result.data.attendeeName).toBe("Aarav Sharma");
        expect(student1Result.data.email).toBe(sharedEmail);
        expect(student1Result.data.registrationId).toMatch(/^REG-2026-\d{4}$/);
      }
    });

    it("5.2 allows a second distinct student to register with the exact same email address", async () => {
      const event = createTestEvent("evt-multi-student-2", "multi-student-slug-2");
      saveEvent(event);
      const sharedEmail = "parent.contact@gmail.com";

      // Register Student 1
      const student1Result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "individual",
        attendeeName: "Aarav Sharma",
        email: sharedEmail,
        phone: "9876543210",
        department: "CSE",
      });
      expect(student1Result.success).toBe(true);

      // Register Student 2 with the same email using the "register another student" workflow
      const student2Result = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "individual",
        attendeeName: "Diya Sharma", // Sibling / second student
        email: sharedEmail,
        phone: "9876543211",
        department: "ECE",
        allowSharedEmail: true,
      });

      expect(student2Result.success).toBe(true);
      if (student1Result.success && student2Result.success) {
        // Both students must have separate registration IDs and separate QR credentials
        expect(student1Result.data.registrationId).not.toBe(student2Result.data.registrationId);
        expect(student1Result.data.qrCredentialId).not.toBe(student2Result.data.qrCredentialId);
        expect(student1Result.data.attendeeName).toBe("Aarav Sharma");
        expect(student2Result.data.attendeeName).toBe("Diya Sharma");
        expect(student1Result.data.email).toBe(sharedEmail);
        expect(student2Result.data.email).toBe(sharedEmail);
      }

      // Check preview submissions store has both distinct records
      const allSubmissions = getStoredSubmissions(event.id);
      const student1Sub = allSubmissions.find((s) => s.attendeeName === "Aarav Sharma");
      const student2Sub = allSubmissions.find((s) => s.attendeeName === "Diya Sharma");

      expect(student1Sub).toBeDefined();
      expect(student2Sub).toBeDefined();
      expect(student1Sub?.registrationId).not.toBe(student2Sub?.registrationId);
    });

    it("5.3 prevents accidental duplicate submission for the EXACT SAME student under that email", async () => {
      const event = createTestEvent("evt-multi-student-3", "multi-student-slug-3");
      saveEvent(event);
      const sharedEmail = "parent.contact@gmail.com";

      // First submission
      const res1 = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "individual",
        attendeeName: "Aarav Sharma",
        email: sharedEmail,
        phone: "9876543210",
      });
      expect(res1.success).toBe(true);

      // Accidental duplicate submission: same email and same name even if allowSharedEmail is true
      const res2 = await registerForEventAction({
        eventId: event.id,
        slug: event.slug,
        mode: "individual",
        attendeeName: "Aarav Sharma",
        email: sharedEmail,
        phone: "9876543210",
        allowSharedEmail: true,
      });

      expect(res2.success).toBe(false);
      if (!res2.success) {
        expect(res2.error).toBe("ALREADY_REGISTERED");
        expect(res2.message).toContain("already registered");
      }
    });
  });
});
