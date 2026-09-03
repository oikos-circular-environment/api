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
	moderated_by: string | null;
	moderated_at: Date | null;
	reason: string | null;
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
			moderated_by: null,
			moderated_at: null,
			reason: null,
			created_at: now,
			updated_at: now,
		};

		this.supports.push(support);

		return this.mapSupport(support);
	}

	async findMany(filters: {
		status?: ModerationStatus;
		severity?: ModerationSeverity;
		type?: SupportType;
		cursor?: Date;
		limit: number;
	}): Promise<Support[]> {
		let items = [...this.supports];

		if (filters.status) {
			items = items.filter((item) => item.status === filters.status);
		}

		if (filters.severity) {
			items = items.filter((item) => item.severity === filters.severity);
		}

		if (filters.type) {
			items = items.filter((item) => item.type === filters.type);
		}

		const { cursor } = filters;
		if (cursor) {
			items = items.filter((item) => item.created_at < cursor);
		}

		items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

		return items.slice(0, filters.limit).map((item) => this.mapSupport(item));
	}

	async findById(supportId: string): Promise<Support | null> {
		const support = this.supports.find((item) => item.id === supportId);

		if (!support) return null;

		return this.mapSupport(support);
	}

	async findByIdAndOwner(id: string, userId: string): Promise<Support | null> {
		const support = this.supports.find(
			(item) => item.id === id && item.user_id === userId,
		);

		if (!support) return null;

		return this.mapSupport(support);
	}

	async findManyByOwner(
		userId: string,
		filters: { cursor?: Date; limit: number },
	): Promise<Support[]> {
		let items = this.supports.filter((item) => item.user_id === userId);

		const { cursor } = filters;
		if (cursor) {
			items = items.filter((item) => item.created_at < cursor);
		}

		items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

		return items.slice(0, filters.limit).map((item) => this.mapSupport(item));
	}

	async update(
		id: string,
		data: { title?: string; description?: string },
	): Promise<Support | null> {
		const support = this.supports.find((item) => item.id === id);

		if (!support) return null;

		if (data.title !== undefined) support.title = data.title;
		if (data.description !== undefined) support.description = data.description;
		support.updated_at = new Date();

		return this.mapSupport(support);
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
		const support = this.supports.find((item) => item.id === supportId);

		if (!support) return null;

		support.status = data.status;
		support.severity = data.severity ?? support.severity;
		support.reason = data.reason ?? support.reason;
		support.moderated_by = data.moderatedBy ?? support.moderated_by;
		support.moderated_at = new Date();
		support.updated_at = new Date();

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
			moderated_by: support.moderated_by,
			moderated_at: support.moderated_at,
			reason: support.reason,
			created_at: support.created_at,
			updated_at: support.updated_at,
		};
	}
}
