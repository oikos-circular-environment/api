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
	formattedAddress: z.string().nullable(),
});

export const geospatialSchema = z.object({
	heading: headingSchema,
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
	type: complaintCaptureModeSchema,
	created_at: z.date(),
});

export type ComplaintAttachment = z.infer<typeof complaintAttachmentSchema>;

export const createComplaintSchema = z.object({
	date: z.coerce.date(),
	type: complaintTypeSchema,
	observations: z.string().optional().nullable(),
	geospatial: geospatialSchema,
});

export type CreateComplaint = z.infer<typeof createComplaintSchema>;

export const updateComplaintSchema = z
	.object({
		type: complaintTypeSchema.optional(),
		observations: z.string().optional().nullable(),
	})
	.refine(
		(data) => data.type !== undefined || data.observations !== undefined,
		{
			message: "At least one field must be provided",
		},
	);

export type UpdateComplaint = z.infer<typeof updateComplaintSchema>;

export const createComplaintAttachmentSchema = z.object({
	complaint_id: z.string().uuid(),
	url: z.string().min(1, "url is required"),
	file_name: z.string().min(1, "file_name is required"),
	path: z.string().min(1, "path is required"),
	base64: z.string().min(1, "base64 is required"),
	type: complaintCaptureModeSchema.default("PHOTO"),
});

export type CreateComplaintAttachment = z.infer<
	typeof createComplaintAttachmentSchema
>;

export const complaintSchema = z.object({
	id: z.string(),
	date: z.date(),
	type: complaintTypeSchema,
	observations: z.string().nullable(),
	geospatial: geospatialSchema,
	status: complaintStatusSchema,
	attachment: complaintAttachmentSchema.nullable(),
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
