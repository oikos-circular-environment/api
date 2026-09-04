import type {
	ModerationSeverity,
	ModerationStatus,
	Support,
	SupportType,
} from "@/modules/support/dtos/support-dto.js";

export interface ModerationSupportsRepository {
	findMany(filters: {
		status?: ModerationStatus;
		severity?: ModerationSeverity;
		type?: SupportType;
		cursor?: Date;
		limit: number;
	}): Promise<Support[]>;

	findById(supportId: string): Promise<Support | null>;

	updateStatus(
		id: string,
		data: {
			status: ModerationStatus;
			severity?: ModerationSeverity;
			reason?: string;
			moderatedBy?: string;
		},
	): Promise<Support | null>;
}
