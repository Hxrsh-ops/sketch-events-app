import { describe, it, expect, vi } from "vitest";
import {
  TicketDesignDataSchema,
  CreateTicketTemplateSchema,
  CanvasElementSchema,
} from "@/lib/validations/ticket-schemas";
import {
  createTicketTemplateAction,
  saveTemplateDraftAction,
  publishTemplateVersionAction,
} from "@/app/actions/ticket-actions";
import * as sessionModule from "@/lib/auth/session";

describe("Ticket Studio & Design Schema Security Invariants", () => {
  it("1. Schema Validation: strictly rejects malformed colors and script injections", () => {
    // A. Valid design schema
    const validDesign = {
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
        badgeText: "OFFICIAL ADMISSION",
        showPerforationDots: true,
      },
      qr: {
        size: 180,
        label: "SCAN AT TERMINAL",
        rotating: true,
        refreshIntervalSec: 30,
      },
      elements: [],
    };

    const parsed = TicketDesignDataSchema.safeParse(validDesign);
    expect(parsed.success).toBe(true);

    // B. Malicious script injection in color string
    const scriptInjection = {
      ...validDesign,
      theme: {
        ...validDesign.theme,
        accent: "javascript:alert(1)",
      },
    };
    const xssParsed = TicketDesignDataSchema.safeParse(scriptInjection);
    expect(xssParsed.success).toBe(false);

    // C. Malicious CSS injection in color string
    const cssInjection = {
      ...validDesign,
      theme: {
        ...validDesign.theme,
        accent: "<style>body{display:none}</style>",
      },
    };
    const cssParsed = TicketDesignDataSchema.safeParse(cssInjection);
    expect(cssParsed.success).toBe(false);

    // D. Invalid canvas bounds (overflow or tiny)
    const tinyCanvas = {
      ...validDesign,
      canvas: { width: 10, height: 10, unit: "px" },
    };
    const boundsParsed = TicketDesignDataSchema.safeParse(tinyCanvas);
    expect(boundsParsed.success).toBe(false);
  });

  it("2. Canvas Element Schema: validates bounds and element types", () => {
    const validElement = {
      id: "el-1",
      type: "text",
      x: 50,
      y: 50,
      width: 200,
      height: 40,
      zIndex: 1,
      isLocked: false,
      text: "VIP Guest",
      bindingKey: "attendee_name",
      fontSize: 16,
      color: "#FFFFFF",
      alignment: "left",
    };

    expect(CanvasElementSchema.safeParse(validElement).success).toBe(true);

    // Negative coordinates rejected
    const negativeCoord = { ...validElement, x: -10 };
    expect(CanvasElementSchema.safeParse(negativeCoord).success).toBe(false);

    // Unrecognized element type rejected
    const invalidType = { ...validElement, type: "executable_script" };
    expect(CanvasElementSchema.safeParse(invalidType).success).toBe(false);
  });

  it("3. Template RBAC: rejects unauthorized users from creating or publishing templates", async () => {
    // A. Unauthenticated caller
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: false,
      isAdmin: false,
      user: null,
    });

    const unauthRes = await createTicketTemplateAction({
      name: "Sneaky Template",
      category: "cinematic",
    });
    expect(unauthRes.success).toBe(false);
    if (!unauthRes.success) {
      expect(unauthRes.error).toBe("UNAUTHORIZED");
    }

    // B. Unauthorized role ('analyst')
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: "analyst-uuid",
        name: "Test Analyst",
        email: "analyst@sketch.test",
        role: "analyst",
      },
    });

    const forbiddenRes = await createTicketTemplateAction({
      name: "Analyst Template",
      category: "minimal",
    });
    expect(forbiddenRes.success).toBe(false);
    if (!forbiddenRes.success) {
      expect(forbiddenRes.error).toBe("FORBIDDEN");
    }

    // C. Unauthorized publish attempt by analyst
    vi.spyOn(sessionModule, "verifyAdminSession").mockResolvedValueOnce({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: "analyst-uuid",
        name: "Test Analyst",
        email: "analyst@sketch.test",
        role: "analyst",
      },
    });

    const pubRes = await publishTemplateVersionAction({
      templateId: "00000000-0000-0000-0000-000000000001",
      designData: {
        layout: "cinematic-horizontal",
      },
    });
    expect(pubRes.success).toBe(false);
    if (!pubRes.success) {
      expect(pubRes.error).toBe("FORBIDDEN");
    }
  });
});
