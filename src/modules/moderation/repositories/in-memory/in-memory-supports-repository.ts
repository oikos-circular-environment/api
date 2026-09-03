import { randomUUID } from "node:crypto";
import type {
	CreateSupportRequest,
	ModerationStatus,
	SaveSupportRequestAttachment,
	SupportRequest,
} from "@/modules/moderation/dtos/moderation-dto.js";
import type { SupportRequestsRepository } from "@/modules/moderation/repositories/support-requests-repository.js";

type SupportRequestEntity = {
	id: string;
	user_id: string | null;
	title: string;
	description: string;
	status: ModerationStatus;
	created_at: Date;
};

type AttachmentEntity = {
	id: string;
	support_request_id: string;
	url: string;
	file_name: string;
	path: string;
	created_at: Date;
};

export class InMemorySupportRequestsRepository
	implements SupportRequestsRepository
{
	public supportRequests: SupportRequestEntity[] = [];
	public attachments: AttachmentEntity[] = [];

	async create(data: CreateSupportRequest): Promise<SupportRequest> {
		const supportRequest: SupportRequestEntity = {
			id: randomUUID(),
			user_id: data.user_id ?? null,
			title: data.title,
			description: data.description,
			status: "PENDING",
			created_at: new Date(),
		};

		this.supportRequests.push(supportRequest);

		return this.mapSupportRequest(supportRequest);
	}

	async findById(supportRequestId: string): Promise<SupportRequest | null> {
		const supportRequest = this.supportRequests.find(
			(item) => item.id === supportRequestId,
		);

		if (!supportRequest) return null;

		return this.mapSupportRequest(supportRequest);
	}

	async attach(
		supportRequestId: string,
		data: SaveSupportRequestAttachment,
	): Promise<SupportRequest | null> {
		const supportRequest = this.supportRequests.find(
			(item) => item.id === supportRequestId,
		);
		if (!supportRequest) return null;

		const attachment: AttachmentEntity = {
			id: randomUUID(),
			support_request_id: supportRequestId,
			url: data.url,
			file_name: data.file_name,
			path: data.path,
			created_at: new Date(),
		};

		this.attachments.push(attachment);

		return this.mapSupportRequest(supportRequest);
	}

	private mapSupportRequest(
		supportRequest: SupportRequestEntity,
	): SupportRequest {
		return {
			id: supportRequest.id,
			title: supportRequest.title,
			description: supportRequest.description,
			status: supportRequest.status,
			attachments: this.attachments
				.filter((a) => a.support_request_id === supportRequest.id)
				.map((a) => ({
					id: a.id,
					url: a.url,
					file_name: a.file_name,
					path: a.path,
					created_at: a.created_at,
				})),
			created_at: supportRequest.created_at,
		};
	}
}
