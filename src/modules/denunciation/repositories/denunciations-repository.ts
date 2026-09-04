import type {
	CreateDenunciation,
	Denunciation,
	ModerationSeverity,
	ModerationStatus,
	SaveDenunciationAttachment,
} from "@/modules/denunciation/dtos/denunciations-dto.js";

export interface DenunciationsRepository {
	findMany(filters: {
		status?: ModerationStatus;
		severity?: ModerationSeverity;
		cursor?: Date;
		limit: number;
	}): Promise<Denunciation[]>;

	findManyByReporter(
		reporterUserId: string,
		filters: { cursor?: Date; limit: number },
	): Promise<Denunciation[]>;

	findById(denunciationId: string): Promise<Denunciation | null>;

	findByIdAndOwner(id: string, userId: string): Promise<Denunciation | null>;

	findManyByOwner(
		userId: string,
		filters: { cursor?: Date; limit: number },
	): Promise<Denunciation[]>;

	update(
		id: string,
		data: { title?: string; description?: string },
	): Promise<Denunciation | null>;

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
