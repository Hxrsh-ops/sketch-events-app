import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import {
  TicketDesignDataSchema,
  TicketBackgroundImageSchema,
} from "@/lib/validations/ticket-schemas";
import { uploadTicketBackgroundAction } from "@/app/actions/ticket-actions";
import * as sessionModule from "@/lib/auth/session";
import * as serverModule from "@/lib/supabase/server";
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
    vi.spyOn(serverModule, "createAdminClient").mockReturnValue({
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string) => ({
            data: { path },
            error: null,
          }),
          getPublicUrl: (path: string) => ({
            data: {
              publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`,
            },
          }),
        }),
      },
    } as any);
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
          text: "#FFFFFF",
          mutedText: "#8A9098",
          border: "#25292F",
        },
        typography: {
          fontFamily: "Inter, sans-serif",
          headerScale: "xl",
        },
        branding: {
          showLogo: true,
          showBadge: true,
          accentBar: true,
        },
        qrCode: {
          size: 140,
          foreground: "#111315",
          background: "#FFFFFF",
          errorCorrection: "M" as const,
          position: "right" as const,
        },
        elements: [],
        backgroundImage: validBg,
      };

      const parsedFull = TicketDesignDataSchema.safeParse(fullDesign);
      expect(parsedFull.success).toBe(true);
    });

    it("rejects invalid background image overlay colors or opacity out of bounds", () => {
      const invalidOpacity = {
        url: "https://example.com/bg.png",
        overlayOpacity: 1.5, // max 1.0
      };
      expect(TicketBackgroundImageSchema.safeParse(invalidOpacity).success).toBe(false);

      const negativeOpacity = {
        url: "https://example.com/bg.png",
        overlayOpacity: -0.2, // min 0.0
      };
      expect(TicketBackgroundImageSchema.safeParse(negativeOpacity).success).toBe(false);

      const invalidColor = {
        url: "https://example.com/bg.png",
        overlayColor: "not-a-color",
      };
      expect(TicketBackgroundImageSchema.safeParse(invalidColor).success).toBe(false);
    });

    it("rejects malicious script / javascript URLs in background image", () => {
      const xssUrl = {
        url: "javascript:alert(1)",
        fit: "cover" as const,
      };
      expect(TicketBackgroundImageSchema.safeParse(xssUrl).success).toBe(false);

      const dataUrl = {
        url: "data:text/html,<script>alert(1)</script>",
        fit: "cover" as const,
      };
      expect(TicketBackgroundImageSchema.safeParse(dataUrl).success).toBe(false);
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
      formData.append("file", new File(["fake"], "bg.png", { type: "image/png" }));

      const res = await uploadTicketBackgroundAction(formData);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe("UNAUTHORIZED");
      }
    });

    it("rejects unauthorized roles (e.g. attendee or analyst)", async () => {
      vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
        isAuthenticated: true,
        isAdmin: false,
        user: {
          id: "u-1",
          name: "Volunteer",
          email: "vol@sketch.test",
          role: "volunteer" as any,
        },
      });

      const formData = new FormData();
      formData.append("file", new File(["fake"], "bg.png", { type: "image/png" }));

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
      // file intentionally omitted

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

      // 6MB buffer
      const largeBuffer = new Uint8Array(6 * 1024 * 1024);
      const file = new File([largeBuffer], "huge.png", { type: "image/png" });

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

      const file = new File(["<svg></svg>"], "exploit.svg", { type: "image/svg+xml" });
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
