import z from "zod";
import {
	moderationSeveritySchema,
	moderationStatusSchema,
	supportTypeSchema,
} from "@/modules/support/entities/support-entity.js";

export const getSupportsQuerySchema = z.object({
	status: moderationStatusSchema.optional(),
	severity: moderationSeveritySchema.optional(),
	type: supportTypeSchema.optional(),
	cursor: z.coerce.date().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const moderateSupportBodySchema = z.object({
	status: z.enum(["CLOSED", "RESOLVED"]),
	severity: moderationSeveritySchema.optional(),
	reason: z.string().max(2000).optional(),
});
