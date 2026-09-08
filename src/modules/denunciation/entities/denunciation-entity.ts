import z from "zod";
import {
	moderationSeveritySchema,
	moderationStatusSchema,
} from "@/modules/common/dtos/moderation-status-dto.js";

export type {
	ModerationSeverity,
	ModerationStatus,
} from "@/modules/common/dtos/moderation-status-dto.js";
export { moderationSeveritySchema, moderationStatusSchema };

export const denunciationAttachmentTypeSchema = z.enum(["PHOTO", "VIDEO"]);
export type DenunciationAttachmentType = z.infer<
	typeof denunciationAttachmentTypeSchema
>;

export const denunciationAttachmentSchema = z.object({
	id: z.string(),
	url: z.string(),
	file_name: z.string(),
	path: z.string(),
	base64: z.string(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	type: denunciationAttachmentTypeSchema,
	created_at: z.date(),
});
export type DenunciationAttachment = z.infer<
	typeof denunciationAttachmentSchema
>;

export const denunciationSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	status: moderationStatusSchema,
	severity: moderationSeveritySchema.nullable(),
	reporter_email: z.string().email().nullable(),
	reporter_user_id: z.string().nullable(),
	reported_user_id: z.string().nullable(),
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
	attachments: z.array(denunciationAttachmentSchema),
	moderated_by: z.string().nullable(),
	moderated_at: z.date().nullable(),
	reason: z.string().nullable(),
	created_at: z.date(),
	updated_at: z.date(),
});
export type Denunciation = z.infer<typeof denunciationSchema>;
// Named OpenAPI component so it shows up in Scalar's Models tab, like Better Auth's entities.
z.globalRegistry.add(denunciationSchema, { id: "Denunciation" });
