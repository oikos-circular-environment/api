import type {
	CreateDenunciation,
	Denunciation,
	ModerationSeverity,
	ModerationStatus,
	SaveDenunciationAttachment,
} from "@/modules/moderation/dtos/denunciations-dto.js";

export interface DenunciationsRepository {
	findMany(filters: {
		status?: ModerationStatus;
		cursor?: Date;
		limit: number;
	}): Promise<Denunciation[]>;

	findManyByReporter(
		reporterUserId: string,
		filters: { cursor?: Date; limit: number },
	): Promise<Denunciation[]>;

	findById(denunciationId: string): Promise<Denunciation | null>;

	create(data: CreateDenunciation): Promise<Denunciation>;

	updateStatus(
		denunciationId: string,
		data: {
			status: ModerationStatus;
			severity?: ModerationSeverity;
			reason?: string;
			moderatedBy?: string;
		},
	): Promise<Denunciation | null>;

	attach(
		denunciationId: string,
		data: SaveDenunciationAttachment,
	): Promise<Denunciation | null>;

	deleteAttachment(denunciationId: string, attachmentId: string): Promise<void>;
}
