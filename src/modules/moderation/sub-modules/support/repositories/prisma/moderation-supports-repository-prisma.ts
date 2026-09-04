import { prisma } from "@/lib/prisma.js";
import type {
	ModerationSeverity,
	ModerationStatus,
	Support,
	SupportEnvironment,
	SupportType,
} from "@/modules/support/dtos/support-dto.js";
import type { ModerationSupportsRepository } from "../moderation-supports-repository.js";

const supportInclude = {
	attachments: true,
} as const;

type PrismaSupportPayload = {
	id: string;
	title: string;
	description: string;
	type: SupportType;
	environment: unknown;
	reporter_email: string | null;
	status: ModerationStatus;
	severity: ModerationSeverity | null;
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
		created_at: Date;
	}>;
};

function mapSupport(payload: PrismaSupportPayload): Support {
	return {
		id: payload.id,
		title: payload.title,
		description: payload.description,
		type: payload.type,
		environment: (payload.environment as SupportEnvironment | null) ?? null,
		reporter_email: payload.reporter_email,
		status: payload.status,
		severity: payload.severity,
		attachments: payload.attachments.map((a) => ({
			id: a.id,
			url: a.url,
			file_name: a.file_name,
			path: a.path,
			created_at: a.created_at,
		})),
		moderated_by: payload.moderated_by,
		moderated_at: payload.moderated_at,
		reason: payload.reason,
		created_at: payload.created_at,
		updated_at: payload.updated_at,
	};
}

export class PrismaModerationSupportsRepository
	implements ModerationSupportsRepository
{
	async findMany(filters: {
		status?: ModerationStatus;
		severity?: ModerationSeverity;
		type?: SupportType;
		cursor?: Date;
		limit: number;
	}): Promise<Support[]> {
		const supports = await prisma.support.findMany({
			where: {
				status: filters.status,
				severity: filters.severity,
				type: filters.type,
				created_at: filters.cursor ? { lt: filters.cursor } : undefined,
			},
			orderBy: { created_at: "desc" },
			take: filters.limit,
			include: supportInclude,
		});

		return supports.map((s) => mapSupport(s as PrismaSupportPayload));
	}

	async findById(supportId: string): Promise<Support | null> {
		const support = await prisma.support.findUnique({
			where: { id: supportId },
			include: supportInclude,
		});

		if (!support) return null;

		return mapSupport(support as unknown as PrismaSupportPayload);
	}

	async updateStatus(
		supportId: string,
		data: {
			status: ModerationStatus;
			severity?: ModerationSeverity;
			reason?: string;
			moderatedBy?: string;
		},
	): Promise<Support | null> {
		const support = await prisma.support.findUnique({
			where: { id: supportId },
			select: { id: true },
		});

		if (!support) return null;

		await prisma.support.update({
			where: { id: supportId },
			data: {
				status: data.status,
				severity: data.severity,
				reason: data.reason,
				moderated_by: data.moderatedBy,
				moderated_at: new Date(),
			},
		});

		return this.findById(supportId);
	}
}
