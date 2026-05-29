import { randomUUID } from "node:crypto";
import type {
	Complaint,
	ComplaintCapture,
	ComplaintCaptureMode,
	ComplaintMethod,
	ComplaintResume,
	ComplaintStatus,
	ComplaintType,
	ComplaintVote,
	ComplaintVoteType,
	CreateComplaint,
	Geospatial,
	GetComplaintsFilters,
	GetMapComplaintsQuery,
	MapComplaintItem,
	PublicComplaint,
	Resolver,
	SaveComplaintAttachment,
	SubmitResolution,
	UpdateComplaint,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type ComplaintEntity = {
	id: string;
	user_id: string;
	status: ComplaintStatus;
	type: ComplaintType;
	complaint_method: ComplaintMethod;
	event_group_id: string | null;
	created_at: Date;
};

type CaptureEntity = {
	id: string;
	complaint_id: string;
	date: Date;
	observations: string | null;
	geospatial: Geospatial;
	created_at: Date;
};

type AttachmentEntity = {
	id: string;
	capture_id: string;
	url: string;
	file_name: string;
	path: string;
	base64: string;
	metadata: Record<string, unknown> | null;
	type: ComplaintCaptureMode;
	created_at: Date;
};

type ResolutionEntity = {
	id: string;
	complaint_id: string;
	resolver_user_id: string;
	description: string;
	resolver: string;
	rating: number;
	attachment_count: number;
	created_at: Date;
};

type VoteEntity = {
	id: string;
	complaint_id: string;
	user_id: string;
	vote_type: ComplaintVoteType;
	created_at: Date;
	updated_at: Date;
};

export class InMemoryComplaintsRepository implements ComplaintsRepository {
	public complaints: ComplaintEntity[] = [];
	public captures: CaptureEntity[] = [];
	public attachments: AttachmentEntity[] = [];
	public resolutions: ResolutionEntity[] = [];
	public votes: VoteEntity[] = [];

	async findManyByUserId(
		userId: string,
		params: { filters?: GetComplaintsFilters; cursor?: Date; limit: number },
	) {
		const { filters, cursor, limit } = params;

		const userComplaints = this.complaints
			.filter((item) => item.user_id === userId)
			.filter((item) => !filters?.status || item.status === filters.status)
			.filter((item) => !cursor || item.created_at < cursor)
			.filter((item) => !filters?.type || item.type === filters.type)
			.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

		return userComplaints
			.slice(0, limit + 1)
			.map((item) => this.mapComplaint(item));
	}

	async findByUserAndComplaintId(userId: string, complaintId: string) {
		const complaint = this.complaints.find(
			(item) => item.user_id === userId && item.id === complaintId,
		);

		if (!complaint) {
			return null;
		}

		return this.mapComplaint(complaint);
	}

	async findCaptureByUserAndCaptureId(
		userId: string,
		captureId: string,
	): Promise<ComplaintCapture | null> {
		const capture = this.captures.find((c) => c.id === captureId);

		if (!capture) {
			return null;
		}

		const complaint = this.complaints.find(
			(c) => c.id === capture.complaint_id && c.user_id === userId,
		);

		if (!complaint) {
			return null;
		}

		return this.mapCapture(capture);
	}

	async createForUser(
		userId: string,
		data: CreateComplaint,
		method: ComplaintMethod,
	) {
		const complaint: ComplaintEntity = {
			id: randomUUID(),
			user_id: userId,
			status: "OPEN",
			type: data.type,
			complaint_method: method,
			event_group_id: null,
			created_at: new Date(),
		};

		const capture: CaptureEntity = {
			id: randomUUID(),
			complaint_id: complaint.id,
			date: data.date,
			observations: data.observations ?? null,
			geospatial: data.geospatial,
			created_at: new Date(),
		};

		this.complaints.push(complaint);
		this.captures.push(capture);

		return this.mapComplaint(complaint);
	}

	async updateByUserAndComplaintId(
		userId: string,
		complaintId: string,
		data: UpdateComplaint,
	) {
		const complaint = this.complaints.find(
			(item) => item.user_id === userId && item.id === complaintId,
		);

		if (!complaint) {
			return null;
		}

		// Update observations on the most recent capture
		const complainCaptures = this.captures
			.filter((c) => c.complaint_id === complaintId)
			.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

		const latestCapture = complainCaptures[0];

		if (latestCapture && data.observations !== undefined) {
			latestCapture.observations = data.observations;
		}

		return this.mapComplaint(complaint);
	}

	async updateStatusByUserAndComplaintId(
		userId: string,
		complaintId: string,
		status: ComplaintStatus,
	) {
		const complaint = this.complaints.find(
			(item) => item.user_id === userId && item.id === complaintId,
		);

		if (!complaint) {
			return null;
		}

		complaint.status = status;

		return this.mapComplaint(complaint);
	}

	async attachByCaptureId(
		userId: string,
		captureId: string,
		data: SaveComplaintAttachment,
	) {
		const capture = this.captures.find((c) => c.id === captureId);

		if (!capture) {
			return null;
		}

		const complaint = this.complaints.find(
			(c) => c.id === capture.complaint_id && c.user_id === userId,
		);

		if (!complaint) {
			return null;
		}

		const attachment: AttachmentEntity = {
			id: randomUUID(),
			capture_id: captureId,
			url: data.url,
			file_name: data.file_name,
			path: data.path,
			base64: data.base64,
			metadata: data.metadata ?? null,
			type: data.type,
			created_at: new Date(),
		};

		this.attachments.push(attachment);

		return this.mapComplaint(complaint);
	}

	async setEventGroupId(complaintId: string, eventGroupId: string) {
		const complaint = this.complaints.find((c) => c.id === complaintId);

		if (complaint) {
			complaint.event_group_id = eventGroupId;
		}
	}

	async getDashboardByUserId(userId: string) {
		const userComplaints = this.complaints.filter(
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

	async findMapComplaints(query: GetMapComplaintsQuery): Promise<MapComplaintItem[]> {
		const { type, status } = query;
		const statusValue = status ?? "OPEN";

		const filtered = this.complaints
			.filter((c) => c.status === statusValue)
			.filter((c) => !type || c.type === type);

		return filtered.slice(0, 500).map((c) => {
			const captures = this.captures
				.filter((cap) => cap.complaint_id === c.id)
				.map((cap) => this.mapCapture(cap));
			const resolutionCount = this.resolutions.filter((r) => r.complaint_id === c.id).length;
			const coords = captures[0]?.geospatial?.location?.coords;

			return {
				id: c.id,
				type: c.type,
				status: c.status,
				complaint_method: c.complaint_method,
				event_group_id: c.event_group_id,
				location:
					coords?.latitude != null && coords?.longitude != null
						? { lat: coords.latitude, lon: coords.longitude }
						: null,
				captures,
				vote_counts: { resolved: 0, not_resolved: 0 },
				resolution_count: resolutionCount,
				created_at: c.created_at,
			} satisfies MapComplaintItem;
		});
	}

	async findPublicComplaintById(complaintId: string): Promise<PublicComplaint | null> {
		const complaint = this.complaints.find((c) => c.id === complaintId);

		if (!complaint) {
			return null;
		}

		const complaintCaptures = this.captures.filter((c) => c.complaint_id === complaint.id);
		const complaintResolutions = this.resolutions.filter((r) => r.complaint_id === complaint.id);

		const anonymousResolver: Resolver = {
			type: "profile",
			full_name: "Anonymous",
			display_name: "Anonymous",
			avatar_url: null,
		};

		return {
			id: complaint.id,
			type: complaint.type,
			status: complaint.status,
			complaint_method: complaint.complaint_method,
			event_group_id: complaint.event_group_id,
			location: null,
			captures: complaintCaptures.map((c) => this.mapCapture(c)),
			vote_counts: { resolved: 0, not_resolved: 0 },
			resolutions: complaintResolutions.map((r) => ({
				id: r.id,
				description: r.description,
				resolver_name: r.resolver,
				rating: r.rating,
				resolver: anonymousResolver,
				attachment_count: r.attachment_count,
				created_at: r.created_at,
			})),
			created_at: complaint.created_at,
		} satisfies PublicComplaint;
	}

	async voteOnComplaint(
		userId: string,
		complaintId: string,
		voteType: ComplaintVoteType,
	): Promise<ComplaintVote> {
		const existing = this.votes.find(
			(v) => v.complaint_id === complaintId && v.user_id === userId,
		);

		if (existing) {
			existing.vote_type = voteType;
			existing.updated_at = new Date();
			return { ...existing };
		}

		const vote: VoteEntity = {
			id: randomUUID(),
			complaint_id: complaintId,
			user_id: userId,
			vote_type: voteType,
			created_at: new Date(),
			updated_at: new Date(),
		};

		this.votes.push(vote);
		return { ...vote };
	}

	async removeVoteFromComplaint(userId: string, complaintId: string): Promise<void> {
		const index = this.votes.findIndex(
			(v) => v.complaint_id === complaintId && v.user_id === userId,
		);
		if (index !== -1) {
			this.votes.splice(index, 1);
		}
	}

	async submitResolution(
		userId: string,
		complaintId: string,
		data: SubmitResolution,
	): Promise<void> {
		const resolution: ResolutionEntity = {
			id: randomUUID(),
			complaint_id: complaintId,
			resolver_user_id: userId,
			description: data.description,
			resolver: data.resolver,
			rating: data.rating,
			attachment_count: 0,
			created_at: new Date(),
		};
		this.resolutions.push(resolution);
	}

	async updateResolution(
		userId: string,
		complaintId: string,
		data: SubmitResolution,
	): Promise<void> {
		const resolution = this.resolutions.find(
			(r) => r.complaint_id === complaintId && r.resolver_user_id === userId,
		);
		if (resolution) {
			resolution.description = data.description;
			resolution.resolver = data.resolver;
			resolution.rating = data.rating;
		}
	}

	async findResolutionByUserAndComplaint(
		userId: string,
		complaintId: string,
	): Promise<{ id: string } | null> {
		const resolution = this.resolutions.find(
			(r) => r.complaint_id === complaintId && r.resolver_user_id === userId,
		);
		return resolution ? { id: resolution.id } : null;
	}

	private mapCapture(capture: CaptureEntity): ComplaintCapture {
		const captureAttachments = this.attachments.filter(
			(a) => a.capture_id === capture.id,
		);

		return {
			id: capture.id,
			date: capture.date,
			observations: capture.observations,
			geospatial: capture.geospatial,
			attachments: captureAttachments.map((a) => ({
				id: a.id,
				url: a.url,
				file_name: a.file_name,
				path: a.path,
				base64: a.base64,
				metadata: a.metadata,
				type: a.type,
				created_at: a.created_at,
			})),
			created_at: capture.created_at,
		};
	}

	private mapComplaint(complaint: ComplaintEntity): Complaint {
		const complaintCaptures = this.captures.filter(
			(c) => c.complaint_id === complaint.id,
		);

		return {
			id: complaint.id,
			type: complaint.type,
			status: complaint.status,
			complaint_method: complaint.complaint_method,
			event_group_id: complaint.event_group_id,
			captures: complaintCaptures.map((c) => this.mapCapture(c)),
			vote_counts: {
				resolved: 0,
				not_resolved: 0,
			},
			resolution_count: 0,
			created_at: complaint.created_at,
		};
	}
}
