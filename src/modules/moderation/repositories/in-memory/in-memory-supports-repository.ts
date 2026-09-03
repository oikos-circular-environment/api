import { randomUUID } from "node:crypto";
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

type SupportEntityRecord = {
	id: string;
	user_id: string | null;
	title: string;
	description: string;
	type: SupportType;
	environment: SupportEnvironment | null;
	reporter_email: string;
	status: ModerationStatus;
	severity: ModerationSeverity | null;
	created_at: Date;
	updated_at: Date;
};

type AttachmentEntity = {
	id: string;
	support_id: string;
	url: string;
	file_name: string;
	path: string;
	created_at: Date;
};

export class InMemorySupportsRepository implements SupportsRepository {
	public supports: SupportEntityRecord[] = [];
	public attachments: AttachmentEntity[] = [];

	async create(data: CreateSupport): Promise<Support> {
		const now = new Date();
		const support: SupportEntityRecord = {
			id: randomUUID(),
			user_id: data.user_id ?? null,
			title: data.title,
			description: data.description,
			type: data.type,
			environment: data.environment ?? null,
			reporter_email: data.reporter_email,
			status: "OPEN",
			severity: null,
			created_at: now,
			updated_at: now,
		};

		this.supports.push(support);

		return this.mapSupport(support);
	}

	async findById(supportId: string): Promise<Support | null> {
		const support = this.supports.find((item) => item.id === supportId);

		if (!support) return null;

		return this.mapSupport(support);
	}

	async attach(
		supportId: string,
		data: SaveSupportAttachment,
	): Promise<Support | null> {
		const support = this.supports.find((item) => item.id === supportId);
		if (!support) return null;

		const attachment: AttachmentEntity = {
			id: randomUUID(),
			support_id: supportId,
			url: data.url,
			file_name: data.file_name,
			path: data.path,
			created_at: new Date(),
		};

		this.attachments.push(attachment);

		return this.mapSupport(support);
	}

	private mapSupport(support: SupportEntityRecord): Support {
		return {
			id: support.id,
			title: support.title,
			description: support.description,
			type: support.type,
			environment: support.environment,
			reporter_email: support.reporter_email,
			status: support.status,
			severity: support.severity,
			attachments: this.attachments
				.filter((a) => a.support_id === support.id)
				.map((a) => ({
					id: a.id,
					url: a.url,
					file_name: a.file_name,
					path: a.path,
					created_at: a.created_at,
				})),
			created_at: support.created_at,
			updated_at: support.updated_at,
		};
	}
}
