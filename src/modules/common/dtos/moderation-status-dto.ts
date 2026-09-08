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
// Registers each schema above as a named OpenAPI component (Models tab in
// Scalar) instead of inlined-per-operation JSON Schema.
z.globalRegistry.add(moderationSeveritySchema, {
	id: "CommonModerationSeverity",
});
z.globalRegistry.add(moderationStatusSchema, { id: "CommonModerationStatus" });
