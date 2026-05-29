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

export const complaintMethodSchema = z.enum(["AUTOMATIC", "MANUAL"]);

export type ComplaintMethod = z.infer<typeof complaintMethodSchema>;

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
	heading: headingSchema,
	location: locationSchema,
	addresses: addressesSchema,
});

export type Geospatial = z.infer<typeof geospatialSchema>;

export const geospatialManualSchema = z.object({
	heading: z.null(),
	location: locationSchema,
	addresses: addressesSchema.extend({
		city: z.string().min(1),
		district: z.string().min(1),
		street: z.string().min(1),
		streetNumber: z.string().min(1),
		postalCode: z.string().min(1),
		region: z.string().min(1),
	}),
});

export type GeospatialManual = z.infer<typeof geospatialManualSchema>;

export const geospatialReadSchema = z.union([
	geospatialSchema,
	geospatialManualSchema,
]);

export type GeospatialRead = z.infer<typeof geospatialReadSchema>;

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

export const complaintCaptureSchema = z.object({
	id: z.string(),
	date: z.date(),
	observations: z.string().nullable(),
	geospatial: geospatialReadSchema,
	attachments: z.array(complaintAttachmentSchema),
	created_at: z.date(),
});

export type ComplaintCapture = z.infer<typeof complaintCaptureSchema>;

export const complaintSchema = z.object({
	id: z.string(),
	type: complaintTypeSchema,
	status: complaintStatusSchema,
	complaint_method: complaintMethodSchema,
	event_group_id: z.string().nullable(),
	captures: z.array(complaintCaptureSchema),
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

export const createComplaintManualSchema = z.object({
	date: z.coerce.date(),
	type: complaintTypeSchema,
	observations: z.string().optional().nullable(),
	geospatial: geospatialManualSchema,
});

export type CreateComplaintManual = z.infer<typeof createComplaintManualSchema>;

export const updateComplaintSchema = z
	.object({
		observations: z.string().optional().nullable(),
	})
	.refine((data) => data.observations !== undefined, {
		message: "At least one field must be provided",
	});

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

// Shape polimórfico do resolver (nunca expõe user_id)
export const resolverCompanySchema = z.object({
	type: z.literal("company"),
	corporate_name: z.string(),
	business_name: z.string().nullable(),
	description: z.string().nullable(),
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

export const publicResolutionSchema = z.object({
	id: z.string(),
	description: z.string(),
	resolver_name: z.string(),
	rating: z.number().int().min(1).max(5),
	resolver: resolverSchema,
	attachment_count: z.number().int().nonnegative(),
	created_at: z.date(),
});
export type PublicResolution = z.infer<typeof publicResolutionSchema>;

export const publicComplaintSchema = z.object({
	id: z.string(),
	type: complaintTypeSchema,
	status: complaintStatusSchema,
	complaint_method: complaintMethodSchema,
	event_group_id: z.string().nullable(),
	location: z.object({ lat: z.number(), lon: z.number() }).nullable(),
	captures: z.array(complaintCaptureSchema),
	vote_counts: z.object({
		resolved: z.number().int(),
		not_resolved: z.number().int(),
	}),
	resolutions: z.array(publicResolutionSchema),
	created_at: z.date(),
});
export type PublicComplaint = z.infer<typeof publicComplaintSchema>;

// Para o mapa, retorna item resumido (sem captures detalhadas, sem base64)
export const mapComplaintItemSchema = z.object({
	id: z.string(),
	type: complaintTypeSchema,
	status: complaintStatusSchema,
	event_group_id: z.string().nullable(),
	location: z.object({ lat: z.number(), lon: z.number() }).nullable(),
	vote_counts: z.object({
		resolved: z.number().int(),
		not_resolved: z.number().int(),
	}),
	resolution_count: z.number().int().nonnegative(),
	capture_count: z.number().int().nonnegative(),
	created_at: z.date(),
});
export type MapComplaintItem = z.infer<typeof mapComplaintItemSchema>;

export const getMapComplaintsQuerySchema = z.object({
	lat: z.coerce.number(),
	lon: z.coerce.number(),
	radius: z.coerce.number().int().positive().max(50000).default(1000),
	type: complaintTypeSchema.optional(),
	status: z.array(complaintStatusSchema).optional(),
	from: z.iso.datetime().optional(),
	to: z.iso.datetime().optional(),
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
	resolver: z.string().min(1),
	rating: z.number().int().min(1).max(5),
});
export type SubmitResolution = z.infer<typeof submitResolutionSchema>;
