import z from "zod";

export type {
	ModerationStatus,
	SupportRequest,
	SupportRequestAttachment,
} from "../entities/support-request-entity.js";
export {
	moderationStatusSchema,
	supportRequestAttachmentSchema,
	supportRequestSchema,
} from "../entities/support-request-entity.js";

export const MAX_SUPPORT_REQUEST_DESCRIPTION_LENGTH = 2500;

export const createSupportRequestBodySchema = z.object({
	title: z.string().trim().min(1, "title is required"),
	description: z
		.string()
		.trim()
		.min(1, "description is required")
		.max(
			MAX_SUPPORT_REQUEST_DESCRIPTION_LENGTH,
			`description must be at most ${MAX_SUPPORT_REQUEST_DESCRIPTION_LENGTH} characters`,
		),
});
export type CreateSupportRequestBody = z.infer<
	typeof createSupportRequestBodySchema
>;

export type CreateSupportRequest = CreateSupportRequestBody & {
	user_id?: string | null;
};

export const saveSupportRequestAttachmentSchema = z.object({
	url: z.string().min(1, "url is required"),
	file_name: z.string().min(1, "file_name is required"),
	path: z.string().min(1, "path is required"),
});
export type SaveSupportRequestAttachment = z.infer<
	typeof saveSupportRequestAttachmentSchema
>;
