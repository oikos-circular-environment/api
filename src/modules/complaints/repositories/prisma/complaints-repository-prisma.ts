import { prisma } from "@/lib/prisma.js";
import {
	type Complaint,
	type ComplaintStatus,
	type ComplaintVote,
	type ComplaintVoteType,
	type CreateComplaint,
	type GetComplaintsFilters,
	type GetMapComplaintsQuery,
	type MapComplaintItem,
	type PublicComplaint,
	type Resolution,
	type ResolutionAttachment,
	type Resolver,
	type SaveComplaintAttachment,
	type SaveResolutionAttachment,
	type SubmitResolution,
	type UpdateComplaint,
	geospatialSchema,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

const complaintInclude = {
	attachments: true,
	votes: true,
	resolutions: true,
} as const;

type PrismaComplaintPayload = {
	id: string;
	status: ComplaintStatus;
	type: Complaint["type"];
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
		date: payload.date,
		observations: payload.observations,
		geospatial: geospatialSchema.parse(payload.geospatial),
		attachments: payload.attachments.map((a) => ({
			id: a.id,
			url: a.url,
			file_name: a.file_name,
			path: a.path,
			base64: a.base64,
			metadata: (a.metadata as Record<string, unknown> | null) ?? null,
			type: a.type,
			created_at: a.created_at,
		})),
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
			orderBy: { created_at: "desc" },
			take: limit + 1,
		});

		return complaints.map((item) => mapComplaint(item as PrismaComplaintPayload));
	}

	async findByUserAndComplaintId(userId: string, complaintId: string) {
		const complaint = await prisma.complaint.findFirst({
			where: { id: complaintId, user_id: userId },
			include: complaintInclude,
		});

		if (!complaint) return null;

		return mapComplaint(complaint as PrismaComplaintPayload);
	}

	async createForUser(userId: string, data: CreateComplaint) {
		const complaint = await prisma.complaint.create({
			data: {
				user_id: userId,
				type: data.type,
				date: data.date,
				status: "OPEN",
				observations: data.observations ?? null,
				geospatial: data.geospatial,
			},
			include: complaintInclude,
		});

		const { latitude, longitude } = data.geospatial.location.coords;
		await prisma.$executeRawUnsafe(
			`UPDATE complaints SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
			longitude,
			latitude,
			complaint.id,
		);

		return mapComplaint(complaint as PrismaComplaintPayload);
	}

	async updateByUserAndComplaintId(
		userId: string,
		complaintId: string,
		data: UpdateComplaint,
	) {
		const exists = await prisma.complaint.findFirst({
			where: { id: complaintId, user_id: userId },
			select: { id: true },
		});

		if (!exists) return null;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const updateData: Record<string, any> = {};
		if (data.date !== undefined) updateData.date = data.date;
		if (data.type !== undefined) updateData.type = data.type;
		if (data.observations !== undefined) updateData.observations = data.observations;
		if (data.geospatial !== undefined) updateData.geospatial = data.geospatial;

		await prisma.complaint.update({
			where: { id: complaintId },
			data: updateData,
		});

		if (data.geospatial) {
			const { latitude, longitude } = data.geospatial.location.coords;
			await prisma.$executeRawUnsafe(
				`UPDATE complaints SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
				longitude,
				latitude,
				complaintId,
			);
		}

		return this.findByUserAndComplaintId(userId, complaintId);
	}

	async updateStatusByUserAndComplaintId(
		userId: string,
		complaintId: string,
		status: ComplaintStatus,
	) {
		const updatedRows = await prisma.complaint.updateMany({
			where: { id: complaintId, user_id: userId },
			data: { status },
		});

		if (updatedRows.count === 0) return null;

		return this.findByUserAndComplaintId(userId, complaintId);
	}

	async attachByComplaintId(
		userId: string,
		complaintId: string,
		data: SaveComplaintAttachment,
	) {
		const complaint = await prisma.complaint.findFirst({
			where: { id: complaintId, user_id: userId },
			select: { id: true },
		});

		if (!complaint) return null;

		await prisma.complaintAttachment.create({
			data: {
				complaint_id: complaintId,
				url: data.url,
				file_name: data.file_name,
				path: data.path,
				base64: data.base64,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				metadata: (data.metadata ?? undefined) as any,
				type: data.type,
			},
		});

		return this.findByUserAndComplaintId(userId, complaintId);
	}

	async findMapComplaints(query: GetMapComplaintsQuery): Promise<MapComplaintItem[]> {
		const { lat, lon, radius, type, status } = query;
		const statusValue = status ?? "OPEN";

		const paramValues: unknown[] = [lon, lat, radius, statusValue];
		let paramIndex = 5;

		const typeClause = type ? `AND type::text = $${paramIndex++}` : "";
		if (type) paramValues.push(type);

		const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
			`SELECT id FROM complaints
       WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
       AND status::text = $4
       ${typeClause}
       LIMIT 500`,
			...paramValues,
		);

		if (rows.length === 0) return [];

		const ids = rows.map((r) => r.id);
		const complaints = await prisma.complaint.findMany({
			where: { id: { in: ids } },
			include: {
				attachments: true,
				votes: { select: { vote_type: true } },
				_count: { select: { resolutions: true } },
			},
		});

		return complaints.map((c) => {
			const geo = geospatialSchema.parse(c.geospatial);
			const coords = geo.location.coords;

			return {
				id: c.id,
				type: c.type as MapComplaintItem["type"],
				status: c.status as MapComplaintItem["status"],
				date: c.date,
				observations: c.observations,
				geospatial: geo,
				location:
					coords.latitude != null && coords.longitude != null
						? { lat: coords.latitude, lon: coords.longitude }
						: null,
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
				vote_counts: {
					resolved: c.votes.filter((v) => v.vote_type === "RESOLVED").length,
					not_resolved: c.votes.filter((v) => v.vote_type === "NOT_RESOLVED").length,
				},
				resolution_count: c._count.resolutions,
				created_at: c.created_at,
			};
		}) satisfies MapComplaintItem[];
	}

	async findPublicComplaintById(complaintId: string): Promise<PublicComplaint | null> {
		const complaint = await prisma.complaint.findUnique({
			where: { id: complaintId },
			include: {
				attachments: true,
				votes: { select: { vote_type: true } },
				resolutions: {
					include: {
						attachments: true,
						company: { include: { avatar: true } },
						resolver_user: {
							include: {
								profile: { include: { profile_image: true } },
							},
						},
					},
					orderBy: { created_at: "desc" },
				},
			},
		});

		if (!complaint) return null;

		const geo = geospatialSchema.parse(complaint.geospatial);
		const coords = geo.location.coords;

		return {
			id: complaint.id,
			type: complaint.type as PublicComplaint["type"],
			status: complaint.status as PublicComplaint["status"],
			date: complaint.date,
			observations: complaint.observations,
			geospatial: geo,
			location:
				coords.latitude != null && coords.longitude != null
					? { lat: coords.latitude, lon: coords.longitude }
					: null,
			attachments: complaint.attachments.map((a) => ({
				id: a.id,
				url: a.url,
				file_name: a.file_name,
				path: a.path,
				base64: a.base64,
				metadata: (a.metadata as Record<string, unknown> | null) ?? null,
				type: a.type as "PHOTO" | "VIDEO",
				created_at: a.created_at,
			})),
			vote_counts: {
				resolved: complaint.votes.filter((v) => v.vote_type === "RESOLVED").length,
				not_resolved: complaint.votes.filter((v) => v.vote_type === "NOT_RESOLVED").length,
			},
			resolutions: complaint.resolutions.map((r) => {
				const resolver: Resolver = r.company
					? {
							type: "company",
							corporate_name: r.company.corporate_name,
							business_name: r.company.business_name,
							avatar_url: (r.company.avatar as { url?: string } | null)?.url ?? null,
						}
					: {
							type: "profile",
							full_name: (r.resolver_user.profile as { full_name?: string } | null)?.full_name ?? "Unknown",
							display_name: (r.resolver_user.profile as { display_name?: string } | null)?.display_name ?? "Unknown",
							avatar_url:
								(
									(r.resolver_user.profile as { profile_image?: { url?: string } | null } | null)
										?.profile_image as { url?: string } | null
								)?.url ?? null,
						};
				return {
					id: r.id,
					description: r.description,
					resolver,
					attachments: r.attachments.map((a) => ({
						id: a.id,
						url: a.url,
						file_name: a.file_name,
						created_at: a.created_at,
					})),
					created_at: r.created_at,
				};
			}),
			created_at: complaint.created_at,
		} satisfies PublicComplaint;
	}

	async findVoteByUserAndComplaint(
		userId: string,
		complaintId: string,
	): Promise<ComplaintVote | null> {
		const vote = await prisma.complaintVote.findUnique({
			where: { complaint_id_user_id: { complaint_id: complaintId, user_id: userId } },
		});
		if (!vote) return null;
		return {
			id: vote.id,
			complaint_id: vote.complaint_id,
			user_id: vote.user_id,
			vote_type: vote.vote_type as ComplaintVoteType,
			created_at: vote.created_at,
			updated_at: vote.updated_at,
		};
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

	async findResolutionsByComplaintId(complaintId: string): Promise<Resolution[]> {
		const resolutions = await prisma.complaintResolution.findMany({
			where: { complaint_id: complaintId },
			include: {
				attachments: true,
				company: { include: { avatar: true } },
				resolver_user: { include: { profile: { include: { profile_image: true } } } },
			},
			orderBy: { created_at: "desc" },
		});

		return resolutions.map((r) => ({
			id: r.id,
			description: r.description,
			company_id: r.company_id,
			resolver_user_profile: {
				type: "profile" as const,
				full_name: (r.resolver_user.profile as { full_name?: string } | null)?.full_name ?? "Unknown",
				display_name: (r.resolver_user.profile as { display_name?: string } | null)?.display_name ?? "Unknown",
				avatar_url:
					(
						(r.resolver_user.profile as { profile_image?: { url?: string } | null } | null)
							?.profile_image as { url?: string } | null
					)?.url ?? null,
			},
			resolver_company: r.company
				? {
						type: "company" as const,
						corporate_name: r.company.corporate_name,
						business_name: r.company.business_name,
						avatar_url: (r.company.avatar as { url?: string } | null)?.url ?? null,
					}
				: null,
			attachments: r.attachments.map((a) => ({
				id: a.id,
				url: a.url,
				file_name: a.file_name,
				created_at: a.created_at,
			})),
			created_at: r.created_at,
			updated_at: r.updated_at,
		}));
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
				company_id: data.company_id ?? null,
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
			data: { description: data.description, company_id: data.company_id ?? null },
		});
	}

	async deleteResolutionByUser(userId: string, complaintId: string): Promise<void> {
		await prisma.complaintResolution.deleteMany({
			where: { complaint_id: complaintId, resolver_user_id: userId },
		});
	}

	async addResolutionAttachment(
		userId: string,
		resolutionId: string,
		data: SaveResolutionAttachment,
	): Promise<ResolutionAttachment> {
		const attachment = await prisma.complaintResolutionAttachment.create({
			data: {
				resolution_id: resolutionId,
				url: data.url,
				file_name: data.file_name,
				path: data.path,
				base64: data.base64,
			},
		});
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
		await prisma.complaintAttachment.deleteMany({
			where: {
				id: attachmentId,
				complaint_id: complaintId,
				complaint: { user_id: userId },
			},
		});
	}

	async deleteResolutionAttachment(
		userId: string,
		resolutionId: string,
		attachmentId: string,
	): Promise<void> {
		await prisma.complaintResolutionAttachment.deleteMany({
			where: {
				id: attachmentId,
				resolution_id: resolutionId,
				resolution: { resolver_user_id: userId },
			},
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
			where: { user_id: userId },
			_count: { status: true },
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
