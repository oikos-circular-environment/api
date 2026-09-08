import z from "zod";
import { safeTextSchema } from "@/modules/common/dtos/safe-text-schema.js";
import {
	denunciationAttachmentSchema,
	denunciationAttachmentTypeSchema,
	denunciationSchema,
	moderationSeveritySchema,
	moderationStatusSchema,
} from "../entities/denunciation-entity.js";

export type {
	Denunciation,
	DenunciationAttachment,
	DenunciationAttachmentType,
	ModerationSeverity,
	ModerationStatus,
} from "../entities/denunciation-entity.js";
export {
	denunciationAttachmentSchema,
	denunciationAttachmentTypeSchema,
	denunciationSchema,
	moderationSeveritySchema,
	moderationStatusSchema,
};

export const MAX_DENUNCIATION_TITLE_LENGTH = 200;

export const MAX_DENUNCIATION_DESCRIPTION_LENGTH = 2500;

export const createDenunciationSchema = z.object({
	title: safeTextSchema({
		min: 1,
		max: MAX_DENUNCIATION_TITLE_LENGTH,
		minMessage: "title is required",
		maxMessage: `title must be at most ${MAX_DENUNCIATION_TITLE_LENGTH} characters`,
	}),
	description: safeTextSchema({
		min: 1,
		max: MAX_DENUNCIATION_DESCRIPTION_LENGTH,
		minMessage: "description is required",
		maxMessage: `description must be at most ${MAX_DENUNCIATION_DESCRIPTION_LENGTH} characters`,
	}),
	reporter_email: z.string().email().optional(),
	reported_user_id: z.string().uuid().optional(),
	latitude: z.number().min(-90).max(90).optional(),
	longitude: z.number().min(-180).max(180).optional(),
});
export type CreateDenunciationBody = z.infer<typeof createDenunciationSchema>;

export type CreateDenunciation = {
	title: string;
	description: string;
	reporter_email: string;
	reporter_user_id?: string | null;
	reported_user_id?: string | null;
	latitude?: number | null;
	longitude?: number | null;
};

export const denunciationAttachmentMetadataSchema = z
	.record(z.string(), z.unknown())
	.nullable()
	.optional();

export const saveDenunciationAttachmentSchema = z.object({
	url: z.string().min(1, "url is required"),
	file_name: z.string().min(1, "file_name is required"),
	path: z.string().min(1, "path is required"),
	base64: z.string().min(1, "base64 is required"),
	metadata: denunciationAttachmentMetadataSchema,
	type: denunciationAttachmentTypeSchema,
});
export type SaveDenunciationAttachment = z.infer<
	typeof saveDenunciationAttachmentSchema
>;

export const updateOwnDenunciationBodySchema = z.object({
	title: safeTextSchema({
		min: 1,
		max: MAX_DENUNCIATION_TITLE_LENGTH,
		minMessage: "title is required",
		maxMessage: `title must be at most ${MAX_DENUNCIATION_TITLE_LENGTH} characters`,
	}).optional(),
	description: safeTextSchema({
		min: 1,
		max: MAX_DENUNCIATION_DESCRIPTION_LENGTH,
		minMessage: "description is required",
		maxMessage: `description must be at most ${MAX_DENUNCIATION_DESCRIPTION_LENGTH} characters`,
	}).optional(),
});
export type UpdateOwnDenunciationBody = z.infer<
	typeof updateOwnDenunciationBodySchema
>;

export const paginatedDenunciationsSchema = z.object({
	denunciations: z.array(denunciationSchema),
	nextCursor: z.string().datetime().nullable(),
});

export const getOwnQuerySchema = z.object({
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type GetOwnQuery = z.infer<typeof getOwnQuerySchema>;
// Registers each schema above as a named OpenAPI component (Models tab in
// Scalar) instead of inlined-per-operation JSON Schema.
z.globalRegistry.add(createDenunciationSchema, {
	id: "DenunciationCreateDenunciation",
});
z.globalRegistry.add(denunciationAttachmentMetadataSchema, {
	id: "DenunciationDenunciationAttachmentMetadata",
});
z.globalRegistry.add(paginatedDenunciationsSchema, {
	id: "DenunciationPaginatedDenunciations",
});
z.globalRegistry.add(saveDenunciationAttachmentSchema, {
	id: "DenunciationSaveDenunciationAttachment",
});
z.globalRegistry.add(updateOwnDenunciationBodySchema, {
	id: "DenunciationUpdateOwnDenunciationBody",
});
