import { prisma } from "@/lib/prisma.js";
import {
	type Complaint,
	type ComplaintCapture,
	type ComplaintMethod,
	type ComplaintStatus,
	type ComplaintVote,
	type ComplaintVoteType,
	type CreateComplaint,
	type GetComplaintsFilters,
	type GetMapComplaintsQuery,
	type MapComplaintItem,
	type PublicComplaint,
	type Resolver,
	type SaveComplaintAttachment,
	type SubmitResolution,
	type UpdateComplaint,
	geospatialReadSchema,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

const captureInclude = {
	attachments: true,
} as const;

const complaintInclude = {
	captures: {
		include: captureInclude,
	},
	votes: true,
	resolutions: true,
} as const;

type PrismaComplaintPayload = {
	id: string;
	status: ComplaintStatus;
	type: Complaint["type"];
	complaint_method: ComplaintMethod;
	event_group_id: string | null;
	created_at: Date;
	captures: Array<{
		id: string;
		date: Date;
		observations: string | null;
		geospatial: unknown;
		created_at: Date;
		attachments: Array<{
			id: string;
			url: string;
			file_name: string;
			path: string;
			base64: string;
			metadata: unknown;
			type: "PHOTO" | "VIDEO";
			created_at: Date;
		}>;
	}>;
	votes: Array<{
		vote_type: "RESOLVED" | "NOT_RESOLVED";
	}>;
	resolutions: Array<unknown>;
};

function mapComplaint(payload: PrismaComplaintPayload): Complaint {
	return {
		id: payload.id,
		type: payload.type,
		status: payload.status,
		complaint_method: payload.complaint_method,
		event_group_id: payload.event_group_id,
		captures: payload.captures.map(
			(capture): ComplaintCapture => ({
				id: capture.id,
				date: capture.date,
				observations: capture.observations,
				geospatial: geospatialReadSchema.parse(capture.geospatial),
				attachments: capture.attachments.map((attachment) => ({
					id: attachment.id,
					url: attachment.url,
					file_name: attachment.file_name,
					path: attachment.path,
					base64: attachment.base64,
					metadata: (attachment.metadata as Record<string, unknown> | null) ?? null,
					type: attachment.type,
					created_at: attachment.created_at,
				})),
				created_at: capture.created_at,
			}),
		),
		vote_counts: {
			resolved: payload.votes.filter((v) => v.vote_type === "RESOLVED").length,
			not_resolved: payload.votes.filter((v) => v.vote_type === "NOT_RESOLVED")
				.length,
		},
		resolution_count: payload.resolutions.length,
		created_at: payload.created_at,
	};
}

export class PrismaComplaintsRepository implements ComplaintsRepository {
	async findManyByUserId(
		userId: string,
		params: { filters?: GetComplaintsFilters; cursor?: Date; limit: number },
	) {
		const { filters, cursor, limit } = params;

		const complaints = await prisma.complaint.findMany({
			where: {
				user_id: userId,
				...(filters?.status && { status: filters.status }),
				...(cursor && { created_at: { lt: cursor } }),
				...(filters?.type && { type: filters.type }),
			},
			include: complaintInclude,
			orderBy: {
				created_at: "desc",
			},
			take: limit + 1,
		});

		return complaints.map((item) => mapComplaint(item as PrismaComplaintPayload));
	}

	async findByUserAndComplaintId(userId: string, complaintId: string) {
		const complaint = await prisma.complaint.findFirst({
			where: {
				id: complaintId,
				user_id: userId,
			},
			include: complaintInclude,
		});

		if (!complaint) {
			return null;
		}

		return mapComplaint(complaint as PrismaComplaintPayload);
	}

	async findCaptureByUserAndCaptureId(userId: string, captureId: string) {
		const capture = await prisma.complaintCapture.findFirst({
			where: {
				id: captureId,
				complaint: {
					user_id: userId,
				},
			},
			include: captureInclude,
		});

		if (!capture) {
			return null;
		}

		return {
			id: capture.id,
			date: capture.date,
			observations: capture.observations,
			geospatial: geospatialReadSchema.parse(capture.geospatial),
			attachments: capture.attachments.map((attachment) => ({
				id: attachment.id,
				url: attachment.url,
				file_name: attachment.file_name,
				path: attachment.path,
				base64: attachment.base64,
				metadata: (attachment.metadata as Record<string, unknown> | null) ?? null,
				type: attachment.type as "PHOTO" | "VIDEO",
				created_at: attachment.created_at,
			})),
			created_at: capture.created_at,
		} satisfies ComplaintCapture;
	}

	async createForUser(
		userId: string,
		data: CreateComplaint,
		method: ComplaintMethod,
	) {
		const complaint = await prisma.complaint.create({
			data: {
				user_id: userId,
				type: data.type,
				complaint_method: method,
				status: "OPEN",
				captures: {
					create: {
						date: data.date,
						observations: data.observations ?? null,
						geospatial: data.geospatial,
					},
				},
			},
			include: complaintInclude,
		});

		return mapComplaint(complaint as PrismaComplaintPayload);
	}

	async updateByUserAndComplaintId(
		userId: string,
		complaintId: string,
		data: UpdateComplaint,
	) {
		const complaint = await prisma.complaint.findFirst({
			where: {
				id: complaintId,
				user_id: userId,
			},
			include: {
				captures: {
					orderBy: { created_at: "desc" },
					take: 1,
				},
			},
		});

		if (!complaint) {
			return null;
		}

		const latestCapture = complaint.captures[0];

		if (latestCapture && data.observations !== undefined) {
			await prisma.complaintCapture.update({
				where: { id: latestCapture.id },
				data: { observations: data.observations },
			});
		}

		return this.findByUserAndComplaintId(userId, complaintId);
	}

	async updateStatusByUserAndComplaintId(
		userId: string,
		complaintId: string,
		status: ComplaintStatus,
	) {
		const updatedRows = await prisma.complaint.updateMany({
			where: {
				id: complaintId,
				user_id: userId,
			},
			data: { status },
		});

		if (updatedRows.count === 0) {
			return null;
		}

		return this.findByUserAndComplaintId(userId, complaintId);
	}

	async attachByCaptureId(
		userId: string,
		captureId: string,
		data: SaveComplaintAttachment,
	) {
		const capture = await prisma.complaintCapture.findFirst({
			where: {
				id: captureId,
				complaint: {
					user_id: userId,
				},
			},
			select: {
				id: true,
				complaint_id: true,
			},
		});

		if (!capture) {
			return null;
		}

		await prisma.complaintAttachment.create({
			data: {
				capture_id: captureId,
				url: data.url,
				file_name: data.file_name,
				path: data.path,
				base64: data.base64,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				metadata: (data.metadata ?? undefined) as any,
				type: data.type,
			},
		});

		return this.findByUserAndComplaintId(userId, capture.complaint_id);
	}

	async setEventGroupId(complaintId: string, eventGroupId: string) {
		await prisma.complaint.update({
			where: { id: complaintId },
			data: { event_group_id: eventGroupId },
		});
	}

	async findMapComplaints(query: GetMapComplaintsQuery): Promise<MapComplaintItem[]> {
		const { lat, lon, radius, type, status, from, to } = query;
		const statuses = status?.length ? status : ["OPEN"];

		const paramValues: unknown[] = [lon, lat, radius, statuses];
		let paramIndex = 5;

		const typeClause = type ? `AND type::text = $${paramIndex++}` : "";
		if (type) paramValues.push(type);

		const fromClause = from ? `AND created_at >= $${paramIndex++}` : "";
		if (from) paramValues.push(new Date(from));

		const toClause = to ? `AND created_at <= $${paramIndex++}` : "";
		if (to) paramValues.push(new Date(to));

		const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
			`SELECT id FROM complaints
       WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
       AND status::text = ANY($4::text[])
       ${typeClause}
       ${fromClause}
       ${toClause}
       LIMIT 500`,
			...paramValues,
		);

		if (rows.length === 0) return [];

		const ids = rows.map((r) => r.id);
		const complaints = await prisma.complaint.findMany({
			where: { id: { in: ids } },
			include: {
				votes: { select: { vote_type: true } },
				_count: { select: { captures: true, resolutions: true } },
			},
		});

		return complaints.map((c) => ({
			id: c.id,
			type: c.type as MapComplaintItem["type"],
			status: c.status as MapComplaintItem["status"],
			event_group_id: c.event_group_id,
			location: null,
			vote_counts: {
				resolved: c.votes.filter((v) => v.vote_type === "RESOLVED").length,
				not_resolved: c.votes.filter((v) => v.vote_type === "NOT_RESOLVED").length,
			},
			resolution_count: c._count.resolutions,
			capture_count: c._count.captures,
			created_at: c.created_at,
		})) satisfies MapComplaintItem[];
	}

	async findPublicComplaintById(complaintId: string): Promise<PublicComplaint | null> {
		const complaint = await prisma.complaint.findUnique({
			where: { id: complaintId },
			include: {
				captures: { include: { attachments: true } },
				votes: { select: { vote_type: true } },
				resolutions: {
					include: {
						attachments: true,
						resolver_user: {
							include: {
								companies: {
									include: { avatar: true },
									take: 1,
									orderBy: { created_at: "asc" },
								},
								profile: { include: { profile_image: true } },
							},
						},
					},
					orderBy: { created_at: "desc" },
				},
			},
		});

		if (!complaint) return null;

		return {
			id: complaint.id,
			type: complaint.type as PublicComplaint["type"],
			status: complaint.status as PublicComplaint["status"],
			complaint_method: complaint.complaint_method as PublicComplaint["complaint_method"],
			event_group_id: complaint.event_group_id,
			location: null,
			captures: complaint.captures.map(
				(c): ComplaintCapture => ({
					id: c.id,
					date: c.date,
					observations: c.observations,
					geospatial: geospatialReadSchema.parse(c.geospatial),
					attachments: c.attachments.map((a) => ({
						id: a.id,
						url: a.url,
						file_name: a.file_name,
						path: a.path,
						base64: a.base64,
						metadata: (a.metadata as Record<string, unknown> | null) ?? null,
						type: a.type as "PHOTO" | "VIDEO",
						created_at: a.created_at,
					})),
					created_at: c.created_at,
				}),
			),
			vote_counts: {
				resolved: complaint.votes.filter((v) => v.vote_type === "RESOLVED").length,
				not_resolved: complaint.votes.filter((v) => v.vote_type === "NOT_RESOLVED").length,
			},
			resolutions: complaint.resolutions.map((r) => {
				const user = r.resolver_user;
				const company = user.companies[0];
				const resolver: Resolver = company
					? {
							type: "company",
							corporate_name: company.corporate_name,
							business_name: company.business_name ?? null,
							description: company.description ?? null,
							avatar_url: (company.avatar as { url?: string } | null)?.url ?? null,
						}
					: {
							type: "profile",
							full_name: (user.profile as { full_name?: string } | null)?.full_name ?? "Unknown",
							display_name: (user.profile as { display_name?: string } | null)?.display_name ?? "Unknown",
							avatar_url:
								(
									(user.profile as { profile_image?: { url?: string } | null } | null)
										?.profile_image as { url?: string } | null
								)?.url ?? null,
						};
				return {
					id: r.id,
					description: r.description,
					resolver_name: r.resolver,
					rating: r.rating,
					resolver,
					attachment_count: r.attachments.length,
					created_at: r.created_at,
				};
			}),
			created_at: complaint.created_at,
		} satisfies PublicComplaint;
	}

	async voteOnComplaint(
		userId: string,
		complaintId: string,
		voteType: ComplaintVoteType,
	): Promise<ComplaintVote> {
		const vote = await prisma.complaintVote.upsert({
			where: { complaint_id_user_id: { complaint_id: complaintId, user_id: userId } },
			create: { complaint_id: complaintId, user_id: userId, vote_type: voteType },
			update: { vote_type: voteType },
		});
		return {
			id: vote.id,
			complaint_id: vote.complaint_id,
			user_id: vote.user_id,
			vote_type: vote.vote_type as ComplaintVoteType,
			created_at: vote.created_at,
			updated_at: vote.updated_at,
		};
	}

	async removeVoteFromComplaint(userId: string, complaintId: string): Promise<void> {
		await prisma.complaintVote.deleteMany({
			where: { complaint_id: complaintId, user_id: userId },
		});
	}

	async submitResolution(
		userId: string,
		complaintId: string,
		data: SubmitResolution,
	): Promise<void> {
		await prisma.complaintResolution.create({
			data: {
				complaint_id: complaintId,
				resolver_user_id: userId,
				description: data.description,
				resolver: data.resolver,
				rating: data.rating,
			},
		});
	}

	async updateResolution(
		userId: string,
		complaintId: string,
		data: SubmitResolution,
	): Promise<void> {
		await prisma.complaintResolution.updateMany({
			where: { complaint_id: complaintId, resolver_user_id: userId },
			data: { description: data.description, resolver: data.resolver, rating: data.rating },
		});
	}

	async findResolutionByUserAndComplaint(
		userId: string,
		complaintId: string,
	): Promise<{ id: string } | null> {
		const res = await prisma.complaintResolution.findFirst({
			where: { complaint_id: complaintId, resolver_user_id: userId },
			select: { id: true },
		});
		return res ?? null;
	}

	async getDashboardByUserId(userId: string) {
		const groupedStatuses = await prisma.complaint.groupBy({
			by: ["status"],
			where: {
				user_id: userId,
			},
			_count: {
				status: true,
			},
		});

		const byStatus = new Map<ComplaintStatus, number>();

		for (const item of groupedStatuses) {
			byStatus.set(item.status as ComplaintStatus, item._count.status);
		}

		const open = byStatus.get("OPEN") ?? 0;
		const pending = byStatus.get("IN_PROGRESS") ?? 0;
		const resolved = byStatus.get("RESOLVED") ?? 0;
		const canceled = byStatus.get("CANCELED") ?? 0;
		const rejected = byStatus.get("REJECTED") ?? 0;

		return {
			total: open + pending + resolved + canceled + rejected,
			open,
			pending,
			resolved,
			canceled,
			rejected,
		};
	}
}
