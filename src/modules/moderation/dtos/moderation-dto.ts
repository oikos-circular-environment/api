import z from "zod";
import { safeTextSchema } from "@/modules/common/dtos/safe-text-schema.js";

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

export const MAX_SUPPORT_REQUEST_TITLE_LENGTH = 200;

export const createSupportRequestBodySchema = z.object({
	title: safeTextSchema({
		min: 1,
		max: MAX_SUPPORT_REQUEST_TITLE_LENGTH,
		minMessage: "title is required",
		maxMessage: `title must be at most ${MAX_SUPPORT_REQUEST_TITLE_LENGTH} characters`,
	}),
	description: safeTextSchema({
		min: 1,
		max: MAX_SUPPORT_REQUEST_DESCRIPTION_LENGTH,
		minMessage: "description is required",
		maxMessage: `description must be at most ${MAX_SUPPORT_REQUEST_DESCRIPTION_LENGTH} characters`,
	}),
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
