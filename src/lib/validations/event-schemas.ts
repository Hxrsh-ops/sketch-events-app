import { z } from "zod";

/**
 * Standard Result Type for Server Actions
 */
export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; message: string; details?: Record<string, string[]> };

export const CreateEventSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters").max(120, "Title cannot exceed 120 characters"),
    slug: z.string().trim().max(100).optional(),
    category: z.string().trim().min(1, "Category is required"),
    shortDescription: z.string().trim().max(280, "Short description cannot exceed 280 characters").optional(),
    description: z.string().trim().optional(),
    posterUrl: z.string().optional().nullable().or(z.literal("")),
    heroImage: z.string().optional().nullable().or(z.literal("")),
    heroImageFocalPoint: z.string().optional().nullable(),
    directoryImage: z.string().optional().nullable().or(z.literal("")),
    directoryImageFocalPoint: z.string().optional().nullable(),
    startDate: z.string().datetime({ message: "Start date must be an ISO timestamp" }),
    endDate: z.string().datetime({ message: "End date must be an ISO timestamp" }),
    venue: z.string().trim().min(2, "Venue is required and must be at least 2 characters"),
    venueMode: z.enum(["in-person", "online", "hybrid"]),
    capacity: z.number().int().positive("Capacity must be a positive integer"),
    lifecycle: z.enum(["draft", "published", "live", "completed", "archived"]).default("draft"),
    registrationState: z.enum(["upcoming", "open", "closed", "full"]).default("upcoming"),
    hasTeams: z.boolean().default(false),
    minTeamSize: z.number().int().positive().optional().nullable(),
    maxTeamSize: z.number().int().positive().optional().nullable(),
    hasRounds: z.boolean().default(false),
    featured: z.boolean().default(false),
    contactEmail: z.string().email("Contact email must be valid").optional().nullable().or(z.literal("")),
    contactPhone: z.string().optional().nullable(),
    communityLink: z.string().optional().nullable().or(z.literal("")),
    registrationForm: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => new Date(data.endDate) > new Date(data.startDate),
    {
      message: "Event end date must occur after start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.hasTeams) {
        const min = data.minTeamSize ?? 1;
        const max = data.maxTeamSize ?? 1;
        return max >= min;
      }
      return true;
    },
    {
      message: "Maximum team size cannot be less than minimum team size",
      path: ["maxTeamSize"],
    }
  );

export const UpdateEventSchema = z
  .object({
    id: z.string().min(1, "Invalid event ID"),
    title: z.string().trim().min(2).max(120).optional(),
    slug: z.string().trim().max(100).optional(),
    category: z.string().trim().min(1).optional(),
    shortDescription: z.string().trim().max(280).optional(),
    description: z.string().trim().optional(),
    posterUrl: z.string().optional().nullable().or(z.literal("")),
    heroImage: z.string().optional().nullable().or(z.literal("")),
    heroImageFocalPoint: z.string().optional().nullable(),
    directoryImage: z.string().optional().nullable().or(z.literal("")),
    directoryImageFocalPoint: z.string().optional().nullable(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    venue: z.string().trim().min(2).optional(),
    venueMode: z.enum(["in-person", "online", "hybrid"]).optional(),
    capacity: z.number().int().positive().optional(),
    registrationState: z.enum(["upcoming", "open", "closed", "full"]).optional(),
    hasTeams: z.boolean().optional(),
    minTeamSize: z.number().int().positive().optional().nullable(),
    maxTeamSize: z.number().int().positive().optional().nullable(),
    hasRounds: z.boolean().optional(),
    featured: z.boolean().optional(),
    contactEmail: z.string().email().optional().nullable().or(z.literal("")),
    contactPhone: z.string().optional().nullable(),
    communityLink: z.string().url().optional().nullable().or(z.literal("")),
    registrationForm: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: "Event end date must occur after start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.hasTeams && data.minTeamSize && data.maxTeamSize) {
        return data.maxTeamSize >= data.minTeamSize;
      }
      return true;
    },
    {
      message: "Maximum team size cannot be less than minimum team size",
      path: ["maxTeamSize"],
    }
  );

export const SetLifecycleSchema = z.object({
  id: z.string().min(1, "Invalid event ID"),
  lifecycle: z.enum(["draft", "published", "live", "completed", "archived"]),
});
