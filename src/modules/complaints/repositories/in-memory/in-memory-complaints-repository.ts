import { randomUUID } from "node:crypto";
import type {
	Complaint,
	ComplaintAttachment,
	ComplaintResume,
	ComplaintStatus,
	CreateComplaint,
	CreateComplaintAttachment,
	Geospatial,
	UpdateComplaint,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type ComplaintEntity = {
	id: string;
	date: Date;
	type: Complaint["type"];
	observations: string | null;
	geospatial: Geospatial;
	attachment_id: string | null;
};

type UserComplaintEntity = {
	id: string;
	user_id: string;
	complaint_id: string;
	status: ComplaintStatus;
	created_at: Date;
};

export class InMemoryComplaintsRepository implements ComplaintsRepository {
	public complaints: ComplaintEntity[] = [];
	public attachments: ComplaintAttachment[] = [];
	public userComplaints: UserComplaintEntity[] = [];

	async findManyByUserId(userId: string) {
		const userComplaints = this.userComplaints
			.filter((item) => item.user_id === userId)
			.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

		return userComplaints
			.map((item) => this.mapUserComplaint(item))
			.filter((item) => item !== null);
	}

	async findByUserAndComplaintId(userId: string, complaintId: string) {
		const userComplaint = this.userComplaints.find(
			(item) => item.user_id === userId && item.complaint_id === complaintId,
		);

		if (!userComplaint) {
			return null;
		}

		return this.mapUserComplaint(userComplaint);
	}

	async createForUser(userId: string, data: CreateComplaint) {
		const complaint = {
			id: randomUUID(),
			date: data.date,
			type: data.type,
			observations: data.observations ?? null,
			geospatial: data.geospatial,
			attachment_id: null,
		} satisfies ComplaintEntity;

		const userComplaint = {
			id: randomUUID(),
			user_id: userId,
			complaint_id: complaint.id,
			status: "OPEN",
			created_at: new Date(),
		} satisfies UserComplaintEntity;

		this.complaints.push(complaint);
		this.userComplaints.push(userComplaint);

		const mappedComplaint = this.mapUserComplaint(userComplaint);

		if (!mappedComplaint) {
			throw new Error("Failed to create complaint");
		}

		return mappedComplaint;
	}

	async updateByUserAndComplaintId(
		userId: string,
		complaintId: string,
		data: UpdateComplaint,
	) {
		const userComplaint = this.userComplaints.find(
			(item) => item.user_id === userId && item.complaint_id === complaintId,
		);

		if (!userComplaint) {
			return null;
		}

		const complaint = this.complaints.find((item) => item.id === complaintId);

		if (!complaint) {
			return null;
		}

		if (data.type !== undefined) {
			complaint.type = data.type;
		}

		if (data.observations !== undefined) {
			complaint.observations = data.observations;
		}

		return this.mapUserComplaint(userComplaint);
	}

	async updateStatusByUserAndComplaintId(
		userId: string,
		complaintId: string,
		status: ComplaintStatus,
	) {
		const userComplaint = this.userComplaints.find(
			(item) => item.user_id === userId && item.complaint_id === complaintId,
		);

		if (!userComplaint) {
			return null;
		}

		userComplaint.status = status;

		return this.mapUserComplaint(userComplaint);
	}

	async attachByUserAndComplaintId(
		userId: string,
		complaintId: string,
		data: Omit<CreateComplaintAttachment, "complaint_id">,
	) {
		const userComplaint = this.userComplaints.find(
			(item) => item.user_id === userId && item.complaint_id === complaintId,
		);

		if (!userComplaint) {
			return null;
		}

		const complaint = this.complaints.find((item) => item.id === complaintId);

		if (!complaint) {
			return null;
		}

		if (complaint.attachment_id) {
			return null;
		}

		const attachment = {
			id: randomUUID(),
			url: data.url,
			file_name: data.file_name,
			path: data.path,
			base64: data.base64,
			type: data.type,
			created_at: new Date(),
		} satisfies ComplaintAttachment;

		this.attachments.push(attachment);
		complaint.attachment_id = attachment.id;

		return this.mapUserComplaint(userComplaint);
	}

	async getDashboardByUserId(userId: string) {
		const userComplaints = this.userComplaints.filter(
			(item) => item.user_id === userId,
		);

		const open = userComplaints.filter((item) => item.status === "OPEN").length;
		const pending = userComplaints.filter(
			(item) => item.status === "IN_PROGRESS",
		).length;
		const resolved = userComplaints.filter(
			(item) => item.status === "RESOLVED",
		).length;
		const canceled = userComplaints.filter(
			(item) => item.status === "CANCELED",
		).length;
		const rejected = userComplaints.filter(
			(item) => item.status === "REJECTED",
		).length;

		return {
			total: userComplaints.length,
			open,
			pending,
			resolved,
			canceled,
			rejected,
		} satisfies ComplaintResume;
	}

	private mapUserComplaint(
		userComplaint: UserComplaintEntity,
	): Complaint | null {
		const complaint = this.complaints.find(
			(item) => item.id === userComplaint.complaint_id,
		);

		if (!complaint) {
			return null;
		}

		const attachment = complaint.attachment_id
			? (this.attachments.find((item) => item.id === complaint.attachment_id) ??
				null)
			: null;

		return {
			id: complaint.id,
			date: complaint.date,
			type: complaint.type,
			observations: complaint.observations,
			geospatial: complaint.geospatial,
			status: userComplaint.status,
			attachment,
			created_at: userComplaint.created_at,
		};
	}
}
