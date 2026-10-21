import { z } from "zod";

export interface RegistrationPassData {
  registrationId: string;
  qrCredentialId: string;
  attendeeName: string;
  email: string;
  teamName?: string;
  eventTitle: string;
  registeredAt: string;
  ticketNumber?: string;
  liveTicketUrl?: string;
  isExisting?: boolean;
}

export const RegisterForEventInputSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  slug: z.string().optional(),
  mode: z.enum(["individual", "team"]).default("individual"),
  attendeeName: z.string().trim().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  year: z.string().trim().optional().nullable(),
  teamName: z.string().trim().optional().nullable(),
  teamMembers: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Member name is required"),
        email: z.string().trim().email("Member email must be valid"),
        phone: z.string().trim().optional().nullable(),
        department: z.string().trim().optional().nullable(),
        role: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  customAnswers: z.record(z.string(), z.unknown()).optional().default({}),
});

export type RegisterForEventInput = z.infer<typeof RegisterForEventInputSchema>;
