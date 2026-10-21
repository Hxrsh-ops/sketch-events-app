import { z } from "zod";

/**
 * Ticket Layout Categories
 */
export const TicketCategorySchema = z.enum([
  "cinematic",
  "minimal",
  "modern",
  "vip",
  "conference",
]);

export type TicketCategory = z.infer<typeof TicketCategorySchema>;

/**
 * Safe Color Validator (Hex, RGB, HSL - blocks script/url injection)
 */
const SafeColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^rgb\([^)]+\)$|^hsl\([^)]+\)$/, {
    message: "Invalid color format. Must be a valid HEX, RGB, or HSL color.",
  });

/**
 * Ticket Canvas Dimensions
 */
export const TicketCanvasSchema = z.object({
  width: z.number().min(300).max(1200).default(800),
  height: z.number().min(200).max(800).default(380),
  unit: z.enum(["px", "pt", "mm"]).default("px"),
});

/**
 * Perforated Stub Configuration
 */
export const TicketStubSchema = z.object({
  perforationPosition: z.enum(["left", "right", "none"]).default("right"),
  stubWidth: z.number().min(120).max(400).default(240),
  badgeText: z.string().max(40).default("ENTRY PASS"),
  showPerforationDots: z.boolean().default(true),
});

/**
 * QR Code Container Configuration
 */
export const TicketQrConfigSchema = z.object({
  size: z.number().min(100).max(300).default(180),
  label: z.string().max(40).default("SCAN TO VERIFY"),
  rotating: z.boolean().default(true),
  refreshIntervalSec: z.number().min(15).max(120).default(30),
});

/**
 * Safe Image URL Validator (http, https, or root-relative paths; blocks javascript/data protocols)
 */
const SafeImageUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (val) => {
      if (val.startsWith("/")) return !val.startsWith("//");
      try {
        const parsed = new URL(val);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Invalid image URL. Must be an http/https URL or local relative path." }
  );

/**
 * Ticket Background Image Configuration
 */
export const TicketBackgroundImageSchema = z.object({
  url: SafeImageUrlSchema,
  fit: z.enum(["cover", "contain"]).default("cover"),
  position: z
    .enum([
      "center",
      "top",
      "bottom",
      "left",
      "right",
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ])
    .default("center"),
  overlayColor: SafeColorSchema.default("#000000"),
  overlayOpacity: z.number().min(0).max(0.95).default(0.25),
});

export type TicketBackgroundImage = z.infer<typeof TicketBackgroundImageSchema>;

/**
 * Theme Styling Schema
 */
export const TicketThemeSchema = z.object({
  background: SafeColorSchema.default("#111315"),
  surface: SafeColorSchema.default("#181B1E"),
  accent: SafeColorSchema.default("#E2B857"),
  textColor: SafeColorSchema.default("#F3F4F6"),
  secondaryTextColor: SafeColorSchema.default("#9CA3AF"),
  borderColor: SafeColorSchema.default("#2C3136"),
  fontFamily: z.enum(["sans", "serif", "mono", "cinematic"]).default("sans"),
});

/**
 * Canvas Element for Advanced Visual Editor
 */
export const CanvasElementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "badge", "qr", "separator", "artwork", "stub_info"]),
  x: z.number().min(0).max(1200),
  y: z.number().min(0).max(800),
  width: z.number().min(20).max(1200),
  height: z.number().min(10).max(800),
  zIndex: z.number().min(0).max(100).default(1),
  isLocked: z.boolean().default(false),
  text: z.string().max(200).optional(),
  bindingKey: z.enum([
    "event_title",
    "attendee_name",
    "team_name",
    "ticket_number",
    "venue",
    "start_date",
    "category",
    "status",
    "qr_code",
    "custom",
  ]).optional(),
  fontSize: z.number().min(8).max(72).optional(),
  fontWeight: z.enum(["normal", "medium", "semibold", "bold", "extrabold"]).optional(),
  color: SafeColorSchema.optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
});

export type CanvasElement = z.infer<typeof CanvasElementSchema>;

/**
 * Complete Ticket Design Data Schema (Immutable Version Payload)
 */
export const TicketDesignDataSchema = z.object({
  layout: z.enum(["cinematic-horizontal", "modern-compact", "vip-vertical"]).default("cinematic-horizontal"),
  canvas: TicketCanvasSchema.default({ width: 800, height: 380, unit: "px" }),
  theme: TicketThemeSchema.default({
    background: "#111315",
    surface: "#181B1E",
    accent: "#E2B857",
    textColor: "#F3F4F6",
    secondaryTextColor: "#9CA3AF",
    borderColor: "#2C3136",
    fontFamily: "sans",
  }),
  stub: TicketStubSchema.default({
    perforationPosition: "right",
    stubWidth: 240,
    badgeText: "ENTRY PASS",
    showPerforationDots: true,
  }),
  qr: TicketQrConfigSchema.default({
    size: 180,
    label: "SCAN TO VERIFY",
    rotating: true,
    refreshIntervalSec: 30,
  }),
  backgroundImage: TicketBackgroundImageSchema.optional(),
  elements: z.array(CanvasElementSchema).default([]),
});

export type TicketDesignData = z.infer<typeof TicketDesignDataSchema>;

/**
 * Template Action Schemas
 */
export const CreateTicketTemplateSchema = z.object({
  name: z.string().trim().min(2, "Template name must be at least 2 characters").max(100),
  category: TicketCategorySchema.default("cinematic"),
  description: z.string().trim().max(500).optional(),
  initialDesign: TicketDesignDataSchema.optional(),
});

export const UpdateTicketDraftSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
  designData: TicketDesignDataSchema,
});

export const PublishTemplateVersionSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
  designData: TicketDesignDataSchema,
  notes: z.string().max(200).optional(),
});

export const AssignEventTemplateSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  templateVersionId: z.string().uuid("Invalid template version ID"),
});

/**
 * Rotating QR Verification Schema
 */
export const VerifyRotatingQrSchema = z.object({
  token: z.string().trim().min(20, "Invalid QR token length"),
  eventId: z.string().uuid("Invalid event ID"),
  method: z.enum(["camera", "manual"]).default("camera"),
});
