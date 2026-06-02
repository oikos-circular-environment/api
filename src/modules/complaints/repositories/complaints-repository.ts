import type {
	Complaint,
	ComplaintResume,
	ComplaintStatus,
	ComplaintVote,
	ComplaintVoteType,
	CreateComplaint,
	GetComplaintsFilters,
	GetMapComplaintsQuery,
	MapComplaintItem,
	PublicComplaint,
	Resolution,
	ResolutionAttachment,
	SaveComplaintAttachment,
	SaveResolutionAttachment,
	SubmitResolution,
	UpdateComplaint,
} from "@/modules/complaints/dtos/complaints-dto.js";

export interface ComplaintsRepository {
	findManyByUserId(
		userId: string,
		params: { filters?: GetComplaintsFilters; cursor?: Date; limit: number },
	): Promise<Complaint[]>;

	findByUserAndComplaintId(
		userId: string,
		complaintId: string,
	): Promise<Complaint | null>;

	createForUser(
		userId: string,
		data: CreateComplaint,
	): Promise<Complaint>;

	updateByUserAndComplaintId(
		userId: string,
		complaintId: string,
		data: UpdateComplaint,
	): Promise<Complaint | null>;

	updateStatusByUserAndComplaintId(
		userId: string,
		complaintId: string,
		status: ComplaintStatus,
	): Promise<Complaint | null>;

	attachByComplaintId(
		userId: string,
		complaintId: string,
		data: SaveComplaintAttachment,
	): Promise<Complaint | null>;

	getDashboardByUserId(userId: string): Promise<ComplaintResume>;

	findMapComplaints(query: GetMapComplaintsQuery): Promise<MapComplaintItem[]>;

	findPublicComplaintById(complaintId: string): Promise<PublicComplaint | null>;

	// Votes
	findVoteByUserAndComplaint(
		userId: string,
		complaintId: string,
	): Promise<ComplaintVote | null>;

	voteOnComplaint(
		userId: string,
		complaintId: string,
		voteType: ComplaintVoteType,
	): Promise<ComplaintVote>;

	removeVoteFromComplaint(userId: string, complaintId: string): Promise<void>;

	// Resolutions
	findResolutionsByComplaintId(complaintId: string): Promise<Resolution[]>;

	findResolutionByUserAndComplaint(
		userId: string,
		complaintId: string,
	): Promise<{ id: string } | null>;

	submitResolution(
		userId: string,
		complaintId: string,
		data: SubmitResolution,
	): Promise<void>;

	updateResolution(
		userId: string,
		complaintId: string,
		data: SubmitResolution,
	): Promise<void>;

	deleteResolutionByUser(userId: string, complaintId: string): Promise<void>;

	// Resolution attachments
	addResolutionAttachment(
		userId: string,
		resolutionId: string,
		data: SaveResolutionAttachment,
	): Promise<ResolutionAttachment>;

	deleteResolutionAttachment(
		userId: string,
		resolutionId: string,
		attachmentId: string,
	): Promise<void>;
}
