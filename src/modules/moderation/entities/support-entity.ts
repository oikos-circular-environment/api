import z from "zod";

export const moderationStatusSchema = z.enum([
	"OPEN",
	"CLOSED",
	"CANCELLED",
	"RESOLVED",
]);
export type ModerationStatus = z.infer<typeof moderationStatusSchema>;

export const moderationSeveritySchema = z.enum([
	"LOW",
	"MEDIUM",
	"HIGH",
	"CRITICAL",
]);
export type ModerationSeverity = z.infer<typeof moderationSeveritySchema>;

export const supportTypeSchema = z.enum(["ERROR", "SUPPORT", "IMPROVEMENT"]);
export type SupportType = z.infer<typeof supportTypeSchema>;

export const supportLastErrorSchema = z.object({
	message: z.string().max(2000),
	stack: z.string().max(8000).optional(),
	component_stack: z.string().max(8000).optional(),
	occurred_at: z.string().datetime().optional(),
});
export type SupportLastError = z.infer<typeof supportLastErrorSchema>;

export const supportEnvironmentSchema = z.object({
	platform: z.enum(["ios", "android", "web"]),
	app_version: z.string().max(50),
	os_version: z.string().max(50).optional(),
	screen_size: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional(),
	last_error: supportLastErrorSchema.optional(),
});
export type SupportEnvironment = z.infer<typeof supportEnvironmentSchema>;

export const supportAttachmentSchema = z.object({
	id: z.string(),
	url: z.string(),
	file_name: z.string(),
	path: z.string(),
	created_at: z.date(),
});
export type SupportAttachment = z.infer<typeof supportAttachmentSchema>;

export const supportSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	type: supportTypeSchema,
	environment: supportEnvironmentSchema.nullable(),
	reporter_email: z.string().email().nullable(),
	status: moderationStatusSchema,
	severity: moderationSeveritySchema.nullable(),
	attachments: z.array(supportAttachmentSchema),
	moderated_by: z.string().nullable(),
	moderated_at: z.date().nullable(),
	reason: z.string().nullable(),
	created_at: z.date(),
	updated_at: z.date(),
});
export type Support = z.infer<typeof supportSchema>;
