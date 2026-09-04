import { prisma } from "@/lib/prisma.js";
import type {
	CreateDenunciation,
	Denunciation,
	DenunciationAttachment,
	ModerationSeverity,
	ModerationStatus,
	SaveDenunciationAttachment,
} from "@/modules/denunciation/dtos/denunciations-dto.js";
import type { DenunciationsRepository } from "@/modules/denunciation/repositories/denunciations-repository.js";

const denunciationInclude = {
	attachments: true,
} as const;

type PrismaDenunciationPayload = {
	id: string;
	title: string;
	description: string;
	status: ModerationStatus;
	severity: ModerationSeverity | null;
	reporter_email: string | null;
	reporter_user_id: string | null;
	reported_user_id: string | null;
	latitude: number | null;
	longitude: number | null;
	moderated_by: string | null;
	moderated_at: Date | null;
	reason: string | null;
	created_at: Date;
	updated_at: Date;
	attachments: Array<{
		id: string;
		url: string;
		file_name: string;
		path: string;
		base64: string;
		metadata: unknown;
		type: DenunciationAttachment["type"];
		created_at: Date;
	}>;
};

function mapDenunciation(payload: PrismaDenunciationPayload): Denunciation {
	return {
		id: payload.id,
		title: payload.title,
		description: payload.description,
		status: payload.status,
		severity: payload.severity,
		reporter_email: payload.reporter_email,
		reporter_user_id: payload.reporter_user_id,
		reported_user_id: payload.reported_user_id,
		latitude: payload.latitude,
		longitude: payload.longitude,
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
		moderated_by: payload.moderated_by,
		moderated_at: payload.moderated_at,
		reason: payload.reason,
		created_at: payload.created_at,
		updated_at: payload.updated_at,
	};
}

export class PrismaDenunciationsRepository implements DenunciationsRepository {
	async findMany(filters: {
		status?: ModerationStatus;
		severity?: ModerationSeverity;
		cursor?: Date;
		limit: number;
	}): Promise<Denunciation[]> {
		const denunciations = await prisma.denunciation.findMany({
			where: {
				status: filters.status,
				severity: filters.severity,
				created_at: filters.cursor ? { lt: filters.cursor } : undefined,
			},
			orderBy: { created_at: "desc" },
			take: filters.limit,
			include: denunciationInclude,
		});

		return denunciations.map((d) =>
			mapDenunciation(d as unknown as PrismaDenunciationPayload),
		);
	}

	async findManyByReporter(
		reporterUserId: string,
		filters: { cursor?: Date; limit: number },
	): Promise<Denunciation[]> {
		const denunciations = await prisma.denunciation.findMany({
			where: {
				reporter_user_id: reporterUserId,
				created_at: filters.cursor ? { lt: filters.cursor } : undefined,
			},
			orderBy: { created_at: "desc" },
			take: filters.limit,
			include: denunciationInclude,
		});

		return denunciations.map((d) =>
			mapDenunciation(d as unknown as PrismaDenunciationPayload),
		);
	}

	async findById(denunciationId: string): Promise<Denunciation | null> {
		const denunciation = await prisma.denunciation.findUnique({
			where: { id: denunciationId },
			include: denunciationInclude,
		});

		if (!denunciation) return null;

		return mapDenunciation(
			denunciation as unknown as PrismaDenunciationPayload,
		);
	}

	async findByIdAndOwner(
		id: string,
		userId: string,
	): Promise<Denunciation | null> {
		const denunciation = await prisma.denunciation.findFirst({
			where: { id, reporter_user_id: userId },
			include: denunciationInclude,
		});

		if (!denunciation) return null;

		return mapDenunciation(
			denunciation as unknown as PrismaDenunciationPayload,
		);
	}

	async findManyByOwner(
		userId: string,
		filters: { cursor?: Date; limit: number },
	): Promise<Denunciation[]> {
		const denunciations = await prisma.denunciation.findMany({
			where: {
				reporter_user_id: userId,
				created_at: filters.cursor ? { lt: filters.cursor } : undefined,
			},
			orderBy: { created_at: "desc" },
			take: filters.limit,
			include: denunciationInclude,
		});

		return denunciations.map((d) =>
			mapDenunciation(d as unknown as PrismaDenunciationPayload),
		);
	}

	async update(
		id: string,
		data: { title?: string; description?: string },
	): Promise<Denunciation | null> {
		const denunciation = await prisma.denunciation.findUnique({
			where: { id },
			select: { id: true },
		});

		if (!denunciation) return null;

		await prisma.denunciation.update({
			where: { id },
			data: {
				title: data.title,
				description: data.description,
			},
		});

		return this.findById(id);
	}

	async create(data: CreateDenunciation): Promise<Denunciation> {
		const denunciation = await prisma.denunciation.create({
			data: {
				title: data.title,
				description: data.description,
				reporter_email: data.reporter_email,
				reporter_user_id: data.reporter_user_id ?? null,
				reported_user_id: data.reported_user_id ?? null,
				latitude: data.latitude ?? null,
				longitude: data.longitude ?? null,
			},
			include: denunciationInclude,
		});

		return mapDenunciation(
			denunciation as unknown as PrismaDenunciationPayload,
		);
	}

	async updateStatus(
		denunciationId: string,
		data: {
			status: ModerationStatus;
			severity?: ModerationSeverity;
			reason?: string;
			moderatedBy?: string;
		},
	): Promise<Denunciation | null> {
		const denunciation = await prisma.denunciation.findUnique({
			where: { id: denunciationId },
			select: { id: true },
		});

		if (!denunciation) return null;

		await prisma.denunciation.update({
			where: { id: denunciationId },
			data: {
				status: data.status,
				severity: data.severity,
				reason: data.reason,
				moderated_by: data.moderatedBy,
				moderated_at: new Date(),
			},
		});

		return this.findById(denunciationId);
	}

	async attach(
		denunciationId: string,
		data: SaveDenunciationAttachment,
	): Promise<Denunciation | null> {
		const denunciation = await prisma.denunciation.findUnique({
			where: { id: denunciationId },
			select: { id: true },
		});

		if (!denunciation) return null;

		await prisma.denunciationAttachment.create({
			data: {
				denunciation_id: denunciationId,
				url: data.url,
				file_name: data.file_name,
				path: data.path,
				base64: data.base64,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				metadata: (data.metadata ?? undefined) as any,
				type: data.type,
			},
		});

		return this.findById(denunciationId);
	}

	async deleteAttachment(
		denunciationId: string,
		attachmentId: string,
	): Promise<void> {
		await prisma.denunciationAttachment.deleteMany({
			where: {
				id: attachmentId,
				denunciation_id: denunciationId,
			},
		});
	}
}
