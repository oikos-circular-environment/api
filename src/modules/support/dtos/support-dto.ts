import z from "zod";
import { safeTextSchema } from "@/modules/common/dtos/safe-text-schema.js";
import type {
	SupportEnvironment,
	SupportType,
} from "../entities/support-entity.js";
import {
	moderationSeveritySchema,
	moderationStatusSchema,
	supportAttachmentSchema,
	supportEnvironmentSchema,
	supportLastErrorSchema,
	supportSchema,
	supportTypeSchema,
} from "../entities/support-entity.js";

export type {
	ModerationSeverity,
	ModerationStatus,
	Support,
	SupportAttachment,
	SupportEnvironment,
	SupportLastError,
	SupportType,
} from "../entities/support-entity.js";
export {
	moderationSeveritySchema,
	moderationStatusSchema,
	supportAttachmentSchema,
	supportEnvironmentSchema,
	supportLastErrorSchema,
	supportSchema,
	supportTypeSchema,
};

export const MAX_SUPPORT_DESCRIPTION_LENGTH = 2500;

export const MAX_SUPPORT_TITLE_LENGTH = 200;

export const createSupportBodySchema = z.object({
	title: safeTextSchema({
		min: 1,
		max: MAX_SUPPORT_TITLE_LENGTH,
		minMessage: "title is required",
		maxMessage: `title must be at most ${MAX_SUPPORT_TITLE_LENGTH} characters`,
	}),
	description: safeTextSchema({
		min: 1,
		max: MAX_SUPPORT_DESCRIPTION_LENGTH,
		minMessage: "description is required",
		maxMessage: `description must be at most ${MAX_SUPPORT_DESCRIPTION_LENGTH} characters`,
	}),
	type: supportTypeSchema.default("SUPPORT"),
	environment: supportEnvironmentSchema.optional(),
	reporter_email: z.string().email().optional(),
});
export type CreateSupportBody = z.infer<typeof createSupportBodySchema>;

export type CreateSupport = {
	title: string;
	description: string;
	type: SupportType;
	environment?: SupportEnvironment | null;
	reporter_email: string;
	user_id?: string | null;
};

export const saveSupportAttachmentSchema = z.object({
	url: z.string().min(1, "url is required"),
	file_name: z.string().min(1, "file_name is required"),
	path: z.string().min(1, "path is required"),
});
export type SaveSupportAttachment = z.infer<typeof saveSupportAttachmentSchema>;

export const updateOwnSupportBodySchema = z.object({
	title: safeTextSchema({
		min: 1,
		max: MAX_SUPPORT_TITLE_LENGTH,
		minMessage: "title is required",
		maxMessage: `title must be at most ${MAX_SUPPORT_TITLE_LENGTH} characters`,
	}).optional(),
	description: safeTextSchema({
		min: 1,
		max: MAX_SUPPORT_DESCRIPTION_LENGTH,
		minMessage: "description is required",
		maxMessage: `description must be at most ${MAX_SUPPORT_DESCRIPTION_LENGTH} characters`,
	}).optional(),
});
export type UpdateOwnSupportBody = z.infer<typeof updateOwnSupportBodySchema>;

export const paginatedSupportsSchema = z.object({
	supports: z.array(supportSchema),
	nextCursor: z.string().datetime().nullable(),
});

export const getOwnQuerySchema = z.object({
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type GetOwnQuery = z.infer<typeof getOwnQuerySchema>;
