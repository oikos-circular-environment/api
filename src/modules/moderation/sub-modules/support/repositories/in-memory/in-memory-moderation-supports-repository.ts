import { randomUUID } from "node:crypto";
import type {
	CreateSupport,
	ModerationSeverity,
	ModerationStatus,
	Support,
	SupportEnvironment,
	SupportType,
} from "@/modules/support/dtos/support-dto.js";
import type { ModerationSupportsRepository } from "../moderation-supports-repository.js";

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

export class InMemoryModerationSupportsRepository
	implements ModerationSupportsRepository
{
	public supports: SupportEntityRecord[] = [];

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
			attachments: [],
			moderated_by: support.moderated_by,
			moderated_at: support.moderated_at,
			reason: support.reason,
			created_at: support.created_at,
			updated_at: support.updated_at,
		};
	}
}
