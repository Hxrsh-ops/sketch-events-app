import { z } from "zod";

export const CreateRoundSchema = z.object({
  eventId: z.string().trim().min(1, "Event ID is required"),
  name: z.string().trim().min(1, "Stage name is required").max(100, "Stage name cannot exceed 100 characters"),
  order: z.number().int().positive().optional(),
  startTime: z.string().datetime().optional(),
  venue: z.string().trim().min(1, "Venue is required").max(100, "Venue cannot exceed 100 characters"),
  status: z.enum(["upcoming", "in_progress", "completed"]).default("upcoming"),
  eligibleCount: z.number().int().min(0).default(10),
  advancedCount: z.number().int().min(0).default(0),
});

export const UpdateRoundSchema = z.object({
  id: z.string().trim().min(1, "Round ID is required"),
  eventId: z.string().trim().min(1, "Event ID is required"),
  name: z.string().trim().min(1).max(100).optional(),
  order: z.number().int().positive().optional(),
  startTime: z.string().datetime().optional(),
  venue: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["upcoming", "in_progress", "completed"]).optional(),
  eligibleCount: z.number().int().min(0).optional(),
  advancedCount: z.number().int().min(0).optional(),
});

export const DeleteRoundSchema = z.object({
  id: z.string().trim().min(1, "Round ID is required"),
  eventId: z.string().trim().min(1, "Event ID is required"),
});

export const SetRoundStatusSchema = z.object({
  id: z.string().trim().min(1, "Round ID is required"),
  eventId: z.string().trim().min(1, "Event ID is required"),
  status: z.enum(["upcoming", "in_progress", "completed"]),
  advancedCount: z.number().int().min(0).optional(),
});

export const ReorderRoundsSchema = z.object({
  eventId: z.string().trim().min(1, "Event ID is required"),
  roundIds: z.array(z.string().trim().min(1)).min(1, "At least one round ID is required"),
});

export type CreateRoundInput = z.infer<typeof CreateRoundSchema>;
export type UpdateRoundInput = z.infer<typeof UpdateRoundSchema>;
export type DeleteRoundInput = z.infer<typeof DeleteRoundSchema>;
export type SetRoundStatusInput = z.infer<typeof SetRoundStatusSchema>;
export type ReorderRoundsInput = z.infer<typeof ReorderRoundsSchema>;
