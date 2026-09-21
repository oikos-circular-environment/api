import type {
	Denunciation,
	ModerationSeverity,
	ModerationStatus,
} from "@/modules/denunciation/dtos/denunciations-dto.js";

export interface ModerationDenunciationsRepository {
	findMany(filters: {
		status?: ModerationStatus;
		severity?: ModerationSeverity;
		cursor?: Date;
		limit: number;
	}): Promise<Denunciation[]>;

	findById(denunciationId: string): Promise<Denunciation | null>;

	updateStatus(
		denunciationId: string,
		data: {
			status: ModerationStatus;
			severity?: ModerationSeverity;
			reason?: string;
			moderatedBy?: string;
		},
	): Promise<Denunciation | null>;
}
