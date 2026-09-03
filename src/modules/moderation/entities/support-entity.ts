import z from "zod";

export const moderationStatusSchema = z.enum([
	"PENDING",
	"APPROVED",
	"REJECTED",
]);
export type ModerationStatus = z.infer<typeof moderationStatusSchema>;

export const supportRequestAttachmentSchema = z.object({
	id: z.string(),
	url: z.string(),
	file_name: z.string(),
	path: z.string(),
	created_at: z.date(),
});
export type SupportRequestAttachment = z.infer<
	typeof supportRequestAttachmentSchema
>;

export const supportRequestSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	status: moderationStatusSchema,
	attachments: z.array(supportRequestAttachmentSchema),
	created_at: z.date(),
});
export type SupportRequest = z.infer<typeof supportRequestSchema>;
