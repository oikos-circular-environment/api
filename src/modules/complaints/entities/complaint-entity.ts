import z from "zod";

export const complaintStatusSchema = z.enum(["OPEN", "RESOLVED", "CANCELED"]);
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

export const complaintCategorySchema = z.object({
	id: z.string(),
	name: z.string(),
	hazard_levels: z.array(z.enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"])),
});
export type ComplaintCategory = z.infer<typeof complaintCategorySchema>;

export const complaintSchema = z.object({
	id: z.string(),
	status: complaintStatusSchema,
	date: z.date(),
	observations: z.string().nullable(),
	geospatial: geospatialSchema,
	attachments: z.array(complaintAttachmentSchema),
	categories: z.array(complaintCategorySchema),
	vote_counts: z.object({
		resolved: z.number().int().nonnegative(),
		not_resolved: z.number().int().nonnegative(),
	}),
	resolution_count: z.number().int().nonnegative(),
	created_at: z.date(),
});
export type Complaint = z.infer<typeof complaintSchema>;

export const complaintsSchema = z.array(complaintSchema);

export const resolutionAttachmentSchema = z.object({
	id: z.string(),
	url: z.string(),
	file_name: z.string(),
	created_at: z.date(),
});
export type ResolutionAttachment = z.infer<typeof resolutionAttachmentSchema>;

export const resolutionSchema = z.object({
	id: z.string(),
	description: z.string(),
	company_id: z.string().nullable(),
	is_owner: z.boolean(),
	resolver_user_profile: z.object({
		type: z.literal("profile"),
		full_name: z.string(),
		display_name: z.string(),
		avatar_url: z.string().nullable(),
	}),
	resolver_company: z
		.object({
			type: z.literal("company"),
			corporate_name: z.string(),
			business_name: z.string(),
			avatar_url: z.string().nullable(),
		})
		.nullable(),
	attachments: z.array(resolutionAttachmentSchema),
	created_at: z.date(),
	updated_at: z.date(),
});
export type Resolution = z.infer<typeof resolutionSchema>;

export const complaintVoteSchema = z.object({
	id: z.string(),
	complaint_id: z.string(),
	user_id: z.string(),
	vote_type: complaintVoteTypeSchema,
	created_at: z.date(),
	updated_at: z.date(),
});
export type ComplaintVote = z.infer<typeof complaintVoteSchema>;
