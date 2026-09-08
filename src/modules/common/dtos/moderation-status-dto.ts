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
