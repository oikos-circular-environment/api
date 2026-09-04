import { randomUUID } from "node:crypto";
import type {
	CreateDenunciation,
	Denunciation,
	ModerationSeverity,
	ModerationStatus,
} from "@/modules/denunciation/dtos/denunciations-dto.js";
import type { ModerationDenunciationsRepository } from "../moderation-denunciations-repository.js";

type DenunciationRecord = {
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
};

export class InMemoryModerationDenunciationsRepository
	implements ModerationDenunciationsRepository
{
	public denunciations: DenunciationRecord[] = [];

	async create(data: CreateDenunciation): Promise<Denunciation> {
		const now = new Date();
		const denunciation: DenunciationRecord = {
			id: randomUUID(),
			title: data.title,
			description: data.description,
			status: "OPEN",
			severity: null,
			reporter_email: data.reporter_email,
			reporter_user_id: data.reporter_user_id ?? null,
			reported_user_id: data.reported_user_id ?? null,
			latitude: data.latitude ?? null,
			longitude: data.longitude ?? null,
			moderated_by: null,
			moderated_at: null,
			reason: null,
			created_at: now,
			updated_at: now,
		};

		this.denunciations.push(denunciation);

		return this.mapDenunciation(denunciation);
	}

	async findMany(filters: {
		status?: ModerationStatus;
		severity?: ModerationSeverity;
		cursor?: Date;
		limit: number;
	}): Promise<Denunciation[]> {
		let items = [...this.denunciations];

		if (filters.status) {
			items = items.filter((item) => item.status === filters.status);
		}

		if (filters.severity) {
			items = items.filter((item) => item.severity === filters.severity);
		}

		const { cursor } = filters;
		if (cursor) {
			items = items.filter((item) => item.created_at < cursor);
		}

		items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

		return items
			.slice(0, filters.limit)
			.map((item) => this.mapDenunciation(item));
	}

	async findById(denunciationId: string): Promise<Denunciation | null> {
		const denunciation = this.denunciations.find(
			(item) => item.id === denunciationId,
		);

		if (!denunciation) return null;

		return this.mapDenunciation(denunciation);
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
		const denunciation = this.denunciations.find(
			(item) => item.id === denunciationId,
		);

		if (!denunciation) return null;

		denunciation.status = data.status;
		denunciation.severity = data.severity ?? denunciation.severity;
		denunciation.reason = data.reason ?? denunciation.reason;
		denunciation.moderated_by = data.moderatedBy ?? denunciation.moderated_by;
		denunciation.moderated_at = new Date();
		denunciation.updated_at = new Date();

		return this.mapDenunciation(denunciation);
	}

	private mapDenunciation(denunciation: DenunciationRecord): Denunciation {
		return {
			id: denunciation.id,
			title: denunciation.title,
			description: denunciation.description,
			status: denunciation.status,
			severity: denunciation.severity,
			reporter_email: denunciation.reporter_email,
			reporter_user_id: denunciation.reporter_user_id,
			reported_user_id: denunciation.reported_user_id,
			latitude: denunciation.latitude,
			longitude: denunciation.longitude,
			attachments: [],
			moderated_by: denunciation.moderated_by,
			moderated_at: denunciation.moderated_at,
			reason: denunciation.reason,
			created_at: denunciation.created_at,
			updated_at: denunciation.updated_at,
		};
	}
}
