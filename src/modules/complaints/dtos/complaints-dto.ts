import z from "zod";
import {
	complaintAttachmentSchema,
	complaintCaptureModeSchema,
	complaintCategorySchema,
	complaintStatusSchema,
	complaintsSchema,
	complaintVoteSchema,
	geospatialSchema,
	resolutionAttachmentSchema,
} from "../entities/complaint-entity.js";
import { hazardLevelSchema } from "@/modules/wastes/entities/waste-entity.js";

export type {
	Complaint,
	ComplaintAttachment,
	ComplaintCaptureMode,
	ComplaintCategory,
	ComplaintStatus,
	ComplaintVote,
	ComplaintVoteType,
	Geospatial,
	Resolution,
	ResolutionAttachment,
} from "../entities/complaint-entity.js";
export {
	complaintAttachmentSchema,
	complaintCaptureModeSchema,
	complaintCategorySchema,
	complaintSchema,
	complaintStatusSchema,
	complaintsSchema,
	complaintVoteSchema,
	complaintVoteTypeSchema,
	geospatialSchema,
	resolutionAttachmentSchema,
	resolutionSchema,
} from "../entities/complaint-entity.js";

export const complaintResumeSchema = z.object({
	total: z.number().int().nonnegative(),
	open: z.number().int().nonnegative(),
	resolved: z.number().int().nonnegative(),
	canceled: z.number().int().nonnegative(),
});
export type ComplaintResume = z.infer<typeof complaintResumeSchema>;

export const createComplaintSchema = z.object({
	date: z.coerce.date(),
	observations: z.string().optional().nullable(),
	geospatial: geospatialSchema,
	waste_category_ids: z
		.array(z.string())
		.min(1, "At least one waste category is required"),
});
export type CreateComplaint = z.infer<typeof createComplaintSchema>;

export const updateComplaintSchema = z
	.object({
		date: z.coerce.date().optional(),
		observations: z.string().optional().nullable(),
		geospatial: geospatialSchema.optional(),
		waste_category_ids: z.array(z.string()).min(1).optional(),
	})
	.refine(
		(data) =>
			data.date !== undefined ||
			data.observations !== undefined ||
			data.geospatial !== undefined ||
			data.waste_category_ids !== undefined,
		{ message: "At least one field must be provided" },
	);
export type UpdateComplaint = z.infer<typeof updateComplaintSchema>;

export const saveComplaintAttachmentSchema = z.object({
	url: z.string().min(1, "url is required"),
	file_name: z.string().min(1, "file_name is required"),
	path: z.string().min(1, "path is required"),
	base64: z.string().min(1, "base64 is required"),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	type: complaintCaptureModeSchema,
});
export type SaveComplaintAttachment = z.infer<
	typeof saveComplaintAttachmentSchema
>;

export const getComplaintsFiltersSchema = z.object({
	status: complaintStatusSchema.optional(),
});
export type GetComplaintsFilters = z.infer<typeof getComplaintsFiltersSchema>;

export const getComplaintsQuerySchema = getComplaintsFiltersSchema.extend({
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type GetComplaintsQuery = z.infer<typeof getComplaintsQuerySchema>;

export const paginatedComplaintsSchema = z.object({
	complaints: complaintsSchema,
	next_cursor: z.string().datetime().nullable(),
});
export type PaginatedComplaints = z.infer<typeof paginatedComplaintsSchema>;

export const resolverCompanySchema = z.object({
	type: z.literal("company"),
	corporate_name: z.string(),
	business_name: z.string(),
	avatar_url: z.string().nullable(),
});

export const resolverProfileSchema = z.object({
	type: z.literal("profile"),
	full_name: z.string(),
	display_name: z.string(),
	avatar_url: z.string().nullable(),
});

export const resolverSchema = z.discriminatedUnion("type", [
	resolverCompanySchema,
	resolverProfileSchema,
]);
export type Resolver = z.infer<typeof resolverSchema>;

export const publicResolutionSchema = z.object({
	id: z.string(),
	description: z.string(),
	resolver: resolverSchema,
	attachments: z.array(resolutionAttachmentSchema),
	created_at: z.date(),
});
export type PublicResolution = z.infer<typeof publicResolutionSchema>;

export const publicComplaintSchema = z.object({
	id: z.string(),
	status: complaintStatusSchema,
	date: z.date(),
	observations: z.string().nullable(),
	geospatial: geospatialSchema,
	location: z.object({ lat: z.number(), lon: z.number() }).nullable(),
	attachments: z.array(complaintAttachmentSchema),
	categories: z.array(complaintCategorySchema),
	vote_counts: z.object({
		resolved: z.number().int(),
		not_resolved: z.number().int(),
	}),
	resolutions: z.array(publicResolutionSchema),
	created_at: z.date(),
});
export type PublicComplaint = z.infer<typeof publicComplaintSchema>;

export const mapComplaintItemSchema = z.object({
	id: z.string(),
	status: complaintStatusSchema,
	date: z.date(),
	observations: z.string().nullable(),
	geospatial: geospatialSchema,
	location: z.object({ lat: z.number(), lon: z.number() }).nullable(),
	attachments: z.array(complaintAttachmentSchema),
	categories: z.array(complaintCategorySchema),
	vote_counts: z.object({
		resolved: z.number().int(),
		not_resolved: z.number().int(),
	}),
	resolution_count: z.number().int().nonnegative(),
	created_at: z.date(),
});
export type MapComplaintItem = z.infer<typeof mapComplaintItemSchema>;

export const getMapComplaintsQuerySchema = z.object({
	lat: z.coerce.number(),
	lon: z.coerce.number(),
	radius: z.coerce.number().int().positive().max(50000).default(1000),
	status: z.enum(["ALL", "OPEN", "RESOLVED"]).default("ALL"),
	waste_category_id: z
		.union([z.literal("ALL"), z.string().uuid()])
		.default("ALL"),
	hazard_level: z
		.enum(["ALL", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"])
		.default("ALL"),
});
export type GetMapComplaintsQuery = z.infer<typeof getMapComplaintsQuerySchema>;

export const submitVoteSchema = complaintVoteSchema.pick({
	vote_type: true,
});
export type SubmitVote = z.infer<typeof submitVoteSchema>;

export const submitResolutionSchema = z.object({
	description: z.string().min(1),
	company_id: z.uuid().optional(),
});
export type SubmitResolution = z.infer<typeof submitResolutionSchema>;

export type SaveResolutionAttachment = {
	url: string;
	file_name: string;
	path: string;
	base64: string;
};
