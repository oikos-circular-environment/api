import { randomUUID } from "node:crypto";
import type {
	Complaint,
	ComplaintCaptureMode,
	ComplaintCategory,
	ComplaintResume,
	ComplaintStatus,
	ComplaintVote,
	ComplaintVoteType,
	CreateComplaint,
	Geospatial,
	GetComplaintsFilters,
	GetMapComplaintsQuery,
	MapComplaintItem,
	PublicComplaint,
	Resolution,
	ResolutionAttachment,
	Resolver,
	SaveComplaintAttachment,
	SaveResolutionAttachment,
	SubmitResolution,
	UpdateComplaint,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type ComplaintEntity = {
	id: string;
	user_id: string;
	status: ComplaintStatus;
	date: Date;
	observations: string | null;
	geospatial: Geospatial;
	categories: ComplaintCategory[];
	created_at: Date;
};

type AttachmentEntity = {
	id: string;
	complaint_id: string;
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
	company_id: string | null;
	created_at: Date;
	updated_at: Date;
};

type ResolutionAttachmentEntity = {
	id: string;
	resolution_id: string;
	url: string;
	file_name: string;
	path: string;
	base64: string;
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
	public attachments: AttachmentEntity[] = [];
	public resolutions: ResolutionEntity[] = [];
	public resolutionAttachments: ResolutionAttachmentEntity[] = [];
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
			.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

		return userComplaints
			.slice(0, limit + 1)
			.map((item) => this.mapComplaint(item));
	}

	async findByUserAndComplaintId(userId: string, complaintId: string) {
		const complaint = this.complaints.find(
			(item) => item.id === complaintId && item.user_id === userId,
		);

		if (!complaint) return null;

		return this.mapComplaint(complaint);
	}

	async createForUser(userId: string, data: CreateComplaint) {
		const complaint: ComplaintEntity = {
			id: randomUUID(),
			user_id: userId,
			status: "OPEN",
			date: data.date,
			observations: data.observations ?? null,
			geospatial: data.geospatial,
			categories: data.waste_category_ids.map((id) => ({
				id,
				name: id,
				hazard_levels: [],
			})),
			created_at: new Date(),
		};

		this.complaints.push(complaint);

		return this.mapComplaint(complaint);
	}

	async updateByUserAndComplaintId(
		userId: string,
		complaintId: string,
		data: UpdateComplaint,
	) {
		const complaint = this.complaints.find(
			(item) => item.id === complaintId && item.user_id === userId,
		);

		if (!complaint) return null;

		if (data.date !== undefined) complaint.date = data.date;
		if (data.observations !== undefined)
			complaint.observations = data.observations ?? null;
		if (data.geospatial !== undefined) complaint.geospatial = data.geospatial;
		if (data.waste_category_ids !== undefined) {
			complaint.categories = data.waste_category_ids.map((id) => ({
				id,
				name: id,
				hazard_levels: [],
			}));
		}

		return this.mapComplaint(complaint);
	}

	async updateStatusByUserAndComplaintId(
		userId: string,
		complaintId: string,
		status: ComplaintStatus,
	) {
		const complaint = this.complaints.find(
			(item) => item.id === complaintId && item.user_id === userId,
		);

		if (!complaint) throw new Error(`Complaint ${complaintId} not found`);

		complaint.status = status;
		return this.mapComplaint(complaint);
	}

	async attachByComplaintId(
		userId: string,
		complaintId: string,
		data: SaveComplaintAttachment,
	) {
		const complaint = this.complaints.find(
			(c) => c.id === complaintId && c.user_id === userId,
		);
		if (!complaint) return null;

		const attachment: AttachmentEntity = {
			id: randomUUID(),
			complaint_id: complaintId,
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

	async getDashboardByUserId(userId: string) {
		const userComplaints = this.complaints.filter(
			(item) => item.user_id === userId,
		);

		const open = userComplaints.filter((item) => item.status === "OPEN").length;
		const resolved = userComplaints.filter(
			(item) => item.status === "RESOLVED",
		).length;
		const canceled = userComplaints.filter(
			(item) => item.status === "CANCELED",
		).length;

		return {
			total: userComplaints.length,
			open,
			resolved,
			canceled,
		} satisfies ComplaintResume;
	}

	async findMapComplaints(
		query: GetMapComplaintsQuery,
	): Promise<MapComplaintItem[]> {
		const { lat, lon, radius, status } = query;
		const statusValue = status ?? "OPEN";

		const toRad = (deg: number) => (deg * Math.PI) / 180;
		const haversine = (
			lat1: number,
			lon1: number,
			lat2: number,
			lon2: number,
		) => {
			const R = 6371000;
			const dLat = toRad(lat2 - lat1);
			const dLon = toRad(lon2 - lon1);
			const a =
				Math.sin(dLat / 2) ** 2 +
				Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
			return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		};

		const filtered = this.complaints
			.filter((c) => c.status === statusValue)
			.filter((c) => {
				const coords = c.geospatial?.location?.coords;
				if (!coords) return false;
				return haversine(lat, lon, coords.latitude, coords.longitude) <= radius;
			});

		return filtered.slice(0, 500).map((c) => {
			const coords = c.geospatial.location.coords;
			const resolutionCount = this.resolutions.filter(
				(r) => r.complaint_id === c.id,
			).length;

			return {
				id: c.id,
				status: c.status,
				date: c.date,
				observations: c.observations,
				geospatial: c.geospatial,
				location:
					coords.latitude != null && coords.longitude != null
						? { lat: coords.latitude, lon: coords.longitude }
						: null,
				attachments: this.attachments
					.filter((a) => a.complaint_id === c.id)
					.map((a) => ({
						id: a.id,
						url: a.url,
						file_name: a.file_name,
						path: a.path,
						base64: a.base64,
						metadata: a.metadata,
						type: a.type,
						created_at: a.created_at,
					})),
				categories: c.categories,
				vote_counts: { resolved: 0, not_resolved: 0 },
				resolution_count: resolutionCount,
				created_at: c.created_at,
			} satisfies MapComplaintItem;
		});
	}

	async findPublicComplaintById(
		complaintId: string,
	): Promise<PublicComplaint | null> {
		const complaint = this.complaints.find((c) => c.id === complaintId);
		if (!complaint) return null;

		const complaintResolutions = this.resolutions.filter(
			(r) => r.complaint_id === complaint.id,
		);

		const anonymousResolver: Resolver = {
			type: "profile",
			full_name: "Anonymous",
			display_name: "Anonymous",
			avatar_url: null,
		};

		const coords = complaint.geospatial.location.coords;

		return {
			id: complaint.id,
			status: complaint.status,
			date: complaint.date,
			observations: complaint.observations,
			geospatial: complaint.geospatial,
			location:
				coords.latitude != null && coords.longitude != null
					? { lat: coords.latitude, lon: coords.longitude }
					: null,
			attachments: this.attachments
				.filter((a) => a.complaint_id === complaint.id)
				.map((a) => ({
					id: a.id,
					url: a.url,
					file_name: a.file_name,
					path: a.path,
					base64: a.base64,
					metadata: a.metadata,
					type: a.type,
					created_at: a.created_at,
				})),
			categories: complaint.categories,
			vote_counts: { resolved: 0, not_resolved: 0 },
			resolutions: complaintResolutions.map((r) => ({
				id: r.id,
				description: r.description,
				resolver: anonymousResolver,
				attachments: this.resolutionAttachments
					.filter((a) => a.resolution_id === r.id)
					.map((a) => ({
						id: a.id,
						url: a.url,
						file_name: a.file_name,
						created_at: a.created_at,
					})),
				created_at: r.created_at,
			})),
			created_at: complaint.created_at,
		} satisfies PublicComplaint;
	}

	async findVoteByUserAndComplaint(
		userId: string,
		complaintId: string,
	): Promise<ComplaintVote | null> {
		const vote = this.votes.find(
			(v) => v.complaint_id === complaintId && v.user_id === userId,
		);
		return vote ? { ...vote } : null;
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

	async removeVoteFromComplaint(
		userId: string,
		complaintId: string,
	): Promise<void> {
		const index = this.votes.findIndex(
			(v) => v.complaint_id === complaintId && v.user_id === userId,
		);
		if (index !== -1) this.votes.splice(index, 1);
	}

	async findResolutionsByComplaintId(
		complaintId: string,
	): Promise<Resolution[]> {
		const resolutions = this.resolutions.filter(
			(r) => r.complaint_id === complaintId,
		);
		return resolutions.map((r) => ({
			id: r.id,
			description: r.description,
			company_id: r.company_id,
			resolver_user_profile: {
				type: "profile" as const,
				full_name: "Anonymous",
				display_name: "Anonymous",
				avatar_url: null,
			},
			resolver_company: null,
			attachments: this.resolutionAttachments
				.filter((a) => a.resolution_id === r.id)
				.map((a) => ({
					id: a.id,
					url: a.url,
					file_name: a.file_name,
					created_at: a.created_at,
				})),
			created_at: r.created_at,
			updated_at: r.updated_at,
		}));
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
			company_id: data.company_id ?? null,
			created_at: new Date(),
			updated_at: new Date(),
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
			resolution.company_id = data.company_id ?? null;
			resolution.updated_at = new Date();
		}
	}

	async deleteResolutionByUser(
		userId: string,
		complaintId: string,
	): Promise<void> {
		const index = this.resolutions.findIndex(
			(r) => r.complaint_id === complaintId && r.resolver_user_id === userId,
		);
		if (index !== -1) {
			const resolutionId = this.resolutions[index]?.id;
			this.resolutions.splice(index, 1);
			this.resolutionAttachments = this.resolutionAttachments.filter(
				(a) => a.resolution_id !== resolutionId,
			);
		}
	}

	async addResolutionAttachment(
		_userId: string,
		resolutionId: string,
		data: SaveResolutionAttachment,
	): Promise<ResolutionAttachment> {
		const attachment: ResolutionAttachmentEntity = {
			id: randomUUID(),
			resolution_id: resolutionId,
			url: data.url,
			file_name: data.file_name,
			path: data.path,
			base64: data.base64,
			created_at: new Date(),
		};
		this.resolutionAttachments.push(attachment);
		return {
			id: attachment.id,
			url: attachment.url,
			file_name: attachment.file_name,
			created_at: attachment.created_at,
		};
	}

	async deleteComplaintAttachment(
		userId: string,
		complaintId: string,
		attachmentId: string,
	): Promise<void> {
		const complaint = this.complaints.find(
			(c) => c.id === complaintId && c.user_id === userId,
		);
		if (!complaint) return;
		this.attachments = this.attachments.filter(
			(a) => !(a.id === attachmentId && a.complaint_id === complaintId),
		);
	}

	async deleteResolutionAttachment(
		_userId: string,
		resolutionId: string,
		attachmentId: string,
	): Promise<void> {
		this.resolutionAttachments = this.resolutionAttachments.filter(
			(a) => !(a.id === attachmentId && a.resolution_id === resolutionId),
		);
	}

	private mapComplaint(complaint: ComplaintEntity): Complaint {
		const resolvedVotes = this.votes.filter(
			(v) => v.complaint_id === complaint.id && v.vote_type === "RESOLVED",
		).length;
		const notResolvedVotes = this.votes.filter(
			(v) => v.complaint_id === complaint.id && v.vote_type === "NOT_RESOLVED",
		).length;
		const resolutionCount = this.resolutions.filter(
			(r) => r.complaint_id === complaint.id,
		).length;

		return {
			id: complaint.id,
			status: complaint.status,
			date: complaint.date,
			observations: complaint.observations,
			geospatial: complaint.geospatial,
			attachments: this.attachments
				.filter((a) => a.complaint_id === complaint.id)
				.map((a) => ({
					id: a.id,
					url: a.url,
					file_name: a.file_name,
					path: a.path,
					base64: a.base64,
					metadata: a.metadata,
					type: a.type,
					created_at: a.created_at,
				})),
			categories: complaint.categories,
			vote_counts: { resolved: resolvedVotes, not_resolved: notResolvedVotes },
			resolution_count: resolutionCount,
			created_at: complaint.created_at,
		};
	}
}
