import { prisma } from "@/lib/prisma.js";
import type {
	CreateSupport,
	ModerationSeverity,
	ModerationStatus,
	SaveSupportAttachment,
	Support,
	SupportEnvironment,
	SupportType,
} from "@/modules/moderation/dtos/moderation-dto.js";
import type { SupportsRepository } from "@/modules/moderation/repositories/supports-repository.js";

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
		created_at: payload.created_at,
		updated_at: payload.updated_at,
	};
}

export class PrismaSupportsRepository implements SupportsRepository {
	async create(data: CreateSupport): Promise<Support> {
		const support = await prisma.support.create({
			data: {
				title: data.title,
				description: data.description,
				type: data.type,
				environment: data.environment ?? undefined,
				reporter_email: data.reporter_email,
				user_id: data.user_id ?? null,
			},
			include: supportInclude,
		});

		return mapSupport(support as PrismaSupportPayload);
	}

	async findById(supportId: string): Promise<Support | null> {
		const support = await prisma.support.findUnique({
			where: { id: supportId },
			include: supportInclude,
		});

		if (!support) return null;

		return mapSupport(support as PrismaSupportPayload);
	}

	async attach(
		supportId: string,
		data: SaveSupportAttachment,
	): Promise<Support | null> {
		const support = await prisma.support.findUnique({
			where: { id: supportId },
			select: { id: true },
		});

		if (!support) return null;

		await prisma.supportAttachment.create({
			data: {
				support_id: supportId,
				url: data.url,
				file_name: data.file_name,
				path: data.path,
			},
		});

		return this.findById(supportId);
	}
}
