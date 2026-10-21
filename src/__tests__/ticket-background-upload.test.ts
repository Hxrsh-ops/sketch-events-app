import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import {
  TicketDesignDataSchema,
  TicketBackgroundImageSchema,
} from "@/lib/validations/ticket-schemas";
import { uploadTicketBackgroundAction } from "@/app/actions/ticket-actions";
import * as sessionModule from "@/lib/auth/session";
import { resetAppEnvCache } from "@/lib/env";
import { resetServerEnvCache } from "@/lib/env.server";

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("Ticket Studio: Background Image Upload and Persistence", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_APP_MODE = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    resetAppEnvCache();
    resetServerEnvCache();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Schema Validation for Background Image", () => {
    it("accepts valid background image configurations", () => {
      const validBg = {
        url: "https://fvnkhzlbvxemwlkmwhbz.supabase.co/storage/v1/object/public/ticket-assets/backgrounds/bg-1.png",
        fit: "cover" as const,
        position: "center" as const,
        overlayColor: "#000000",
        overlayOpacity: 0.45,
      };

      const parsed = TicketBackgroundImageSchema.safeParse(validBg);
      expect(parsed.success).toBe(true);

      const fullDesign = {
        layout: "cinematic-horizontal",
        canvas: { width: 800, height: 380, unit: "px" },
        theme: {
          background: "#111315",
          surface: "#181B1E",
          accent: "#E2B857",
          textColor: "#F3F4F6",
          secondaryTextColor: "#9CA3AF",
          borderColor: "#2C3136",
          fontFamily: "cinematic",
        },
        stub: {
          perforationPosition: "right",
          stubWidth: 240,
          badgeText: "ENTRY PASS",
          showPerforationDots: true,
        },
        qr: {
          size: 180,
          label: "SCAN TO VERIFY",
          rotating: true,
          refreshIntervalSec: 30,
        },
        backgroundImage: validBg,
        elements: [],
      };

      const designParsed = TicketDesignDataSchema.safeParse(fullDesign);
      expect(designParsed.success).toBe(true);
    });

    it("rejects invalid background image overlay colors or opacity out of bounds", () => {
      // Invalid hex
      const invalidHex = {
        url: "/uploads/ticket-backgrounds/test.jpg",
        fit: "cover" as const,
        position: "center" as const,
        overlayColor: "not-a-hex",
        overlayOpacity: 0.5,
      };
      expect(TicketBackgroundImageSchema.safeParse(invalidHex).success).toBe(false);

      // Opacity > 1
      const highOpacity = {
        url: "/uploads/ticket-backgrounds/test.jpg",
        fit: "cover" as const,
        position: "center" as const,
        overlayColor: "#000000",
        overlayOpacity: 1.5,
      };
      expect(TicketBackgroundImageSchema.safeParse(highOpacity).success).toBe(false);

      // Opacity < 0
      const negativeOpacity = {
        url: "/uploads/ticket-backgrounds/test.jpg",
        fit: "cover" as const,
        position: "center" as const,
        overlayColor: "#000000",
        overlayOpacity: -0.1,
      };
      expect(TicketBackgroundImageSchema.safeParse(negativeOpacity).success).toBe(false);
    });

    it("rejects malicious script / javascript URLs in background image", () => {
      const maliciousUrl = {
        url: "javascript:alert(1)",
        fit: "cover" as const,
        position: "center" as const,
        overlayColor: "#000000",
        overlayOpacity: 0.5,
      };
      expect(TicketBackgroundImageSchema.safeParse(maliciousUrl).success).toBe(false);
    });
  });

  describe("uploadTicketBackgroundAction Security & Integrity", () => {
    it("rejects unauthenticated requests", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: false,
        isAdmin: false,
        user: null,
      });

      const formData = new FormData();
      const res = await uploadTicketBackgroundAction(formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("UNAUTHORIZED");
      }
    });

    it("rejects unauthorized roles (e.g. attendee or analyst)", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "analyst-1",
          name: "Test Analyst",
          email: "analyst@sketch.test",
          role: "analyst",
        },
      });

      const formData = new FormData();
      const res = await uploadTicketBackgroundAction(formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("FORBIDDEN");
      }
    });

    it("rejects requests with missing file", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "admin-1",
          name: "Test Admin",
          email: "admin@sketch.test",
          role: "master_admin",
        },
      });

      const formData = new FormData();
      const res = await uploadTicketBackgroundAction(formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("NO_FILE");
      }
    });

    it("rejects files exceeding 5MB limit", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "admin-1",
          name: "Test Admin",
          email: "admin@sketch.test",
          role: "master_admin",
        },
      });

      // Construct a fake oversized file > 5MB
      const oversizedBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: "image/png" });
      const file = new File([oversizedBlob], "huge.png", { type: "image/png" });

      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadTicketBackgroundAction(formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("FILE_TOO_LARGE");
      }
    });

    it("rejects unsupported MIME types such as SVG or HTML", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "admin-1",
          name: "Test Admin",
          email: "admin@sketch.test",
          role: "master_admin",
        },
      });

      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`;
      const file = new File([svgContent], "vector.svg", { type: "image/svg+xml" });

      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadTicketBackgroundAction(formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("INVALID_FILE_TYPE");
      }
    });

    it("rejects disguised files with invalid magic bytes", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "admin-1",
          name: "Test Admin",
          email: "admin@sketch.test",
          role: "master_admin",
        },
      });

      // Content claims to be PNG, but bytes are plain text
      const fakeBytes = new TextEncoder().encode("NOT A REAL PNG FILE AT ALL");
      const file = new File([fakeBytes], "fake.png", { type: "image/png" });

      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadTicketBackgroundAction(formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("INVALID_MAGIC_BYTES");
      }
    });

    it("accepts valid PNG image with verified magic bytes", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "admin-1",
          name: "Test Admin",
          email: "admin@sketch.test",
          role: "master_admin",
        },
      });

      // Genuine PNG header bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const file = new File([pngHeader], "valid.png", { type: "image/png" });

      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadTicketBackgroundAction(formData);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.url).toBeDefined();
        expect(res.data.url).toContain("/storage/v1/object/public/ticket-assets/");
        expect(res.data.fileName).toMatch(/^ticket-bg-\d+-[a-f0-9]+\.png$/);
        expect(res.data.size).toBe(pngHeader.length);
      }
    });

    it("accepts valid JPEG image with verified magic bytes", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: true,
        user: {
          id: "admin-1",
          name: "Test Admin",
          email: "admin@sketch.test",
          role: "master_admin",
        },
      });

      // Genuine JPEG header bytes: FF D8 FF E0
      const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
      const file = new File([jpegHeader], "valid.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadTicketBackgroundAction(formData);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.url).toBeDefined();
        expect(res.data.url).toContain("/storage/v1/object/public/ticket-assets/");
        expect(res.data.fileName).toMatch(/^ticket-bg-\d+-[a-f0-9]+\.jpg$/);
      }
    });
  });
});
