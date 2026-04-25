import type {
	Complaint,
	ComplaintResume,
	ComplaintStatus,
	CreateComplaint,
	SaveComplaintAttachment,
	UpdateComplaint,
} from "@/modules/complaints/dtos/complaints-dto.js";

export interface ComplaintsRepository {
	findManyByUserId(userId: string): Promise<Complaint[]>;
	findByUserAndComplaintId(
		userId: string,
		complaintId: string,
	): Promise<Complaint | null>;
	createForUser(userId: string, data: CreateComplaint): Promise<Complaint>;
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
	attachByUserAndComplaintId(
		userId: string,
		complaintId: string,
		data: SaveComplaintAttachment,
	): Promise<Complaint | null>;
	getDashboardByUserId(userId: string): Promise<ComplaintResume>;
}
