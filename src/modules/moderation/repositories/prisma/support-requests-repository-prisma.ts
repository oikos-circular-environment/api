import { prisma } from "@/lib/prisma.js";
import type {
	CreateSupportRequest,
	ModerationStatus,
	SaveSupportRequestAttachment,
	SupportRequest,
} from "@/modules/moderation/dtos/moderation-dto.js";
import type { SupportRequestsRepository } from "@/modules/moderation/repositories/support-requests-repository.js";

const supportRequestInclude = {
	attachments: true,
} as const;

type PrismaSupportRequestPayload = {
	id: string;
	title: string;
	description: string;
	status: ModerationStatus;
	created_at: Date;
	attachments: Array<{
		id: string;
		url: string;
		file_name: string;
		path: string;
		created_at: Date;
	}>;
};

function mapSupportRequest(
	payload: PrismaSupportRequestPayload,
): SupportRequest {
	return {
		id: payload.id,
		title: payload.title,
		description: payload.description,
		status: payload.status,
		attachments: payload.attachments.map((a) => ({
			id: a.id,
			url: a.url,
			file_name: a.file_name,
			path: a.path,
			created_at: a.created_at,
		})),
		created_at: payload.created_at,
	};
}

export class PrismaSupportRequestsRepository
	implements SupportRequestsRepository
{
	async create(data: CreateSupportRequest): Promise<SupportRequest> {
		const supportRequest = await prisma.supportRequest.create({
			data: {
				title: data.title,
				description: data.description,
				user_id: data.user_id ?? null,
			},
			include: supportRequestInclude,
		});

		return mapSupportRequest(supportRequest as PrismaSupportRequestPayload);
	}

	async findById(supportRequestId: string): Promise<SupportRequest | null> {
		const supportRequest = await prisma.supportRequest.findUnique({
			where: { id: supportRequestId },
			include: supportRequestInclude,
		});

		if (!supportRequest) return null;

		return mapSupportRequest(supportRequest as PrismaSupportRequestPayload);
	}

	async attach(
		supportRequestId: string,
		data: SaveSupportRequestAttachment,
	): Promise<SupportRequest | null> {
		const supportRequest = await prisma.supportRequest.findUnique({
			where: { id: supportRequestId },
			select: { id: true },
		});

		if (!supportRequest) return null;

		await prisma.supportRequestAttachment.create({
			data: {
				support_request_id: supportRequestId,
				url: data.url,
				file_name: data.file_name,
				path: data.path,
			},
		});

		return this.findById(supportRequestId);
	}
}
