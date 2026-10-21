import { z } from "zod";

/**
 * Standard Email Delivery Job Interface
 */
export interface EmailDeliveryJob {
  id: string;
  eventId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  templateType: "ticket_pass" | "reminder" | "announcement" | "certificate";
  payload: Record<string, unknown>;
  status: "queued" | "processing" | "sent" | "failed";
  attempts: number;
  lastError: string | null;
  scheduledAt: string;
  deliveredAt: string | null;
  createdAt: string;
}

/**
 * Result of attempting to dispatch an email through a provider adapter
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryable?: boolean;
}

/**
 * Outgoing message options passed to a provider adapter
 */
export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  idempotencyKey?: string;
}

/**
 * Generic Email Provider Adapter
 */
export interface EmailProviderAdapter {
  name: string;
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}

/**
 * Zod validation schema for ticket pass email payload
 */
export const TicketPassPayloadSchema = z.object({
  registration_id: z.string().min(1, "Registration ID is required"),
  qr_credential_id: z.string().min(1, "QR credential is required"),
  event_title: z.string().min(1, "Event title is required"),
  venue: z.string().min(1, "Venue is required"),
  start_date: z.string().min(1, "Start date is required"),
  team_name: z.string().optional(),
  bearer_token: z.string().optional(),
  live_ticket_url: z.string().optional(),
  ticket_number: z.string().optional(),
  background_image_url: z.string().optional(),
});

export type TicketPassPayload = z.infer<typeof TicketPassPayloadSchema>;
