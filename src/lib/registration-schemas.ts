import { z } from "zod";

/**
 * Team member sub-schema for team registrations
 */
export const teamMemberSchema = z.object({
  name: z.string().trim().min(1, "Team member name is required"),
  email: z.string().trim().email("Invalid email address for team member"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s\-().]{7,20}$/, "Invalid phone format")
    .optional()
    .or(z.literal("")),
  department: z.string().trim().optional(),
  role: z.string().trim().optional(),
});

/**
 * Schema for individual participant registration
 */
export const individualRegistrationSchema = z.object({
  eventSlug: z.string().trim().min(1, "Event identifier is required"),
  mode: z.literal("individual"),
  attendeeName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address"),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
  year: z.string().trim().optional(),
  answers: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Schema for team participant registration
 */
export const teamRegistrationSchema = z.object({
  eventSlug: z.string().trim().min(1, "Event identifier is required"),
  mode: z.literal("team"),
  attendeeName: z.string().trim().min(2, "Team leader name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address for team leader"),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
  year: z.string().trim().optional(),
  teamName: z.string().trim().min(2, "Team name must be at least 2 characters"),
  teamMembers: z.array(teamMemberSchema).default([]),
  answers: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Combined discriminated union for registration submissions
 */
export const registrationActionSchema = z.discriminatedUnion("mode", [
  individualRegistrationSchema,
  teamRegistrationSchema,
]);

export type RegistrationActionInput = z.infer<typeof registrationActionSchema>;

export interface RegistrationActionResult {
  success: boolean;
  registrationId?: string;
  qrCredentialId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  isMockPreview?: boolean;
  registeredAt?: string;
  attendeeName?: string;
  email?: string;
  teamName?: string;
}
