import type {
	Complaint,
	ComplaintCapture,
	ComplaintMethod,
	ComplaintResume,
	ComplaintStatus,
	ComplaintVote,
	ComplaintVoteType,
	CreateComplaint,
	GetComplaintsFilters,
	GetMapComplaintsQuery,
	MapComplaintItem,
	PublicComplaint,
	SaveComplaintAttachment,
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

	findCaptureByUserAndCaptureId(
		userId: string,
		captureId: string,
	): Promise<ComplaintCapture | null>;

	createForUser(
		userId: string,
		data: CreateComplaint,
		method: ComplaintMethod,
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

	attachByCaptureId(
		userId: string,
		captureId: string,
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

	findResolutionByUserAndComplaint(
		userId: string,
		complaintId: string,
	): Promise<{ id: string } | null>;
}
