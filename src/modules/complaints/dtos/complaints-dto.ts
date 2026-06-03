import z from "zod";

export const complaintTypeSchema = z.enum([
	"IRREGULAR_DISPOSAL",
	"DEFORESTATION",
	"BURNING",
	"VACANT_LOT",
]);

export type ComplaintType = z.infer<typeof complaintTypeSchema>;

export const complaintStatusSchema = z.enum([
	"OPEN",
	"IN_PROGRESS",
	"RESOLVED",
	"REJECTED",
	"CANCELED",
]);

export type ComplaintStatus = z.infer<typeof complaintStatusSchema>;

export const complaintCaptureModeSchema = z.enum(["PHOTO", "VIDEO"]);

export type ComplaintCaptureMode = z.infer<typeof complaintCaptureModeSchema>;

export const complaintVoteTypeSchema = z.enum(["RESOLVED", "NOT_RESOLVED"]);

export type ComplaintVoteType = z.infer<typeof complaintVoteTypeSchema>;

const headingSchema = z.object({
	trueHeading: z.number(),
	magHeading: z.number(),
	accuracy: z.number(),
});

const locationCoordsSchema = z.object({
	latitude: z.number(),
	longitude: z.number(),
	altitude: z.number().nullable(),
	accuracy: z.number().nullable(),
	altitudeAccuracy: z.number().nullable(),
	heading: z.number().nullable(),
	speed: z.number().nullable(),
});

const locationSchema = z.object({
	coords: locationCoordsSchema,
	timestamp: z.number(),
	mocked: z.boolean().optional(),
});

const addressesSchema = z.object({
	city: z.string().nullable(),
	district: z.string().nullable(),
	streetNumber: z.string().nullable(),
	street: z.string().nullable(),
	region: z.string().nullable(),
	subregion: z.string().nullable(),
	country: z.string().nullable(),
	postalCode: z.string().nullable(),
	name: z.string().nullable(),
	isoCountryCode: z.string().nullable(),
	timezone: z.string().nullable(),
	formattedAddress: z.string().nullish(),
});

export const geospatialSchema = z.object({
	heading: headingSchema.nullable(),
	location: locationSchema,
	addresses: addressesSchema,
});

export type Geospatial = z.infer<typeof geospatialSchema>;

export const complaintAttachmentSchema = z.object({
	id: z.string(),
	url: z.string(),
	file_name: z.string(),
	path: z.string(),
	base64: z.string(),
	metadata: z.record(z.string(), z.unknown()).nullable(),
	type: complaintCaptureModeSchema,
	created_at: z.date(),
});

export type ComplaintAttachment = z.infer<typeof complaintAttachmentSchema>;

export const complaintSchema = z.object({
	id: z.string(),
	type: complaintTypeSchema,
	status: complaintStatusSchema,
	date: z.date(),
	observations: z.string().nullable(),
	geospatial: geospatialSchema,
	attachments: z.array(complaintAttachmentSchema),
	vote_counts: z.object({
		resolved: z.number().int().nonnegative(),
		not_resolved: z.number().int().nonnegative(),
	}),
	resolution_count: z.number().int().nonnegative(),
	created_at: z.date(),
});

export type Complaint = z.infer<typeof complaintSchema>;

export const complaintsSchema = z.array(complaintSchema);

export const complaintResumeSchema = z.object({
	total: z.number().int().nonnegative(),
	open: z.number().int().nonnegative(),
	pending: z.number().int().nonnegative(),
	resolved: z.number().int().nonnegative(),
	canceled: z.number().int().nonnegative(),
	rejected: z.number().int().nonnegative(),
});

export type ComplaintResume = z.infer<typeof complaintResumeSchema>;

export const createComplaintSchema = z.object({
	date: z.coerce.date(),
	type: complaintTypeSchema,
	observations: z.string().optional().nullable(),
	geospatial: geospatialSchema,
});

export type CreateComplaint = z.infer<typeof createComplaintSchema>;

export const updateComplaintSchema = z
	.object({
		date: z.coerce.date().optional(),
		type: complaintTypeSchema.optional(),
		observations: z.string().optional().nullable(),
		geospatial: geospatialSchema.optional(),
	})
	.refine(
		(data) =>
			data.date !== undefined ||
			data.type !== undefined ||
			data.observations !== undefined ||
			data.geospatial !== undefined,
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
	type: complaintTypeSchema.optional(),
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

export const resolverSchema = z.union([
	resolverCompanySchema,
	resolverProfileSchema,
]);
export type Resolver = z.infer<typeof resolverSchema>;

export const resolutionAttachmentSchema = z.object({
	id: z.string(),
	url: z.string(),
	file_name: z.string(),
	created_at: z.date(),
});
export type ResolutionAttachment = z.infer<typeof resolutionAttachmentSchema>;

export const publicResolutionSchema = z.object({
	id: z.string(),
	description: z.string(),
	resolver: resolverSchema,
	attachments: z.array(resolutionAttachmentSchema),
	created_at: z.date(),
});
export type PublicResolution = z.infer<typeof publicResolutionSchema>;

export const resolutionSchema = z.object({
	id: z.string(),
	description: z.string(),
	company_id: z.string().nullable(),
	resolver_user_profile: resolverProfileSchema,
	resolver_company: resolverCompanySchema.nullable(),
	attachments: z.array(resolutionAttachmentSchema),
	created_at: z.date(),
	updated_at: z.date(),
});
export type Resolution = z.infer<typeof resolutionSchema>;

export const publicComplaintSchema = z.object({
	id: z.string(),
	type: complaintTypeSchema,
	status: complaintStatusSchema,
	date: z.date(),
	observations: z.string().nullable(),
	geospatial: geospatialSchema,
	location: z.object({ lat: z.number(), lon: z.number() }).nullable(),
	attachments: z.array(complaintAttachmentSchema),
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
	type: complaintTypeSchema,
	status: complaintStatusSchema,
	date: z.date(),
	observations: z.string().nullable(),
	geospatial: geospatialSchema,
	location: z.object({ lat: z.number(), lon: z.number() }).nullable(),
	attachments: z.array(complaintAttachmentSchema),
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
	type: complaintTypeSchema.optional(),
	status: complaintStatusSchema.optional(),
});
export type GetMapComplaintsQuery = z.infer<typeof getMapComplaintsQuerySchema>;

export const complaintVoteSchema = z.object({
	id: z.string(),
	complaint_id: z.string(),
	user_id: z.string(),
	vote_type: complaintVoteTypeSchema,
	created_at: z.date(),
	updated_at: z.date(),
});
export type ComplaintVote = z.infer<typeof complaintVoteSchema>;

export const submitVoteSchema = z.object({
	vote_type: complaintVoteTypeSchema,
});
export type SubmitVote = z.infer<typeof submitVoteSchema>;

export const submitResolutionSchema = z.object({
	description: z.string().min(1),
	company_id: z.string().uuid().optional(),
});
export type SubmitResolution = z.infer<typeof submitResolutionSchema>;

export type SaveResolutionAttachment = {
	url: string;
	file_name: string;
	path: string;
	base64: string;
};
