import z from "zod";
import {
	moderationSeveritySchema,
	moderationStatusSchema,
} from "@/modules/denunciation/entities/denunciation-entity.js";

export const getDenunciationsQuerySchema = z.object({
	status: moderationStatusSchema.optional(),
	severity: moderationSeveritySchema.optional(),
	cursor: z.coerce.date().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const moderateDenunciationBodySchema = z.object({
	status: z.enum(["CLOSED", "RESOLVED"]),
	severity: moderationSeveritySchema.optional(),
	reason: z.string().max(2000).optional(),
});
// Registers each schema above as a named OpenAPI component (Models tab in
// Scalar) instead of inlined-per-operation JSON Schema.
z.globalRegistry.add(moderateDenunciationBodySchema, {
	id: "ModerationSubModulesDenunciationModerateDenunciationBody",
});
