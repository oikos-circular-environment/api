import type {
	CreateSupport,
	ModerationSeverity,
	ModerationStatus,
	SaveSupportAttachment,
	Support,
	SupportType,
} from "@/modules/support/dtos/support-dto.js";

export interface SupportsRepository {
	create(data: CreateSupport): Promise<Support>;

	findMany(filters: {
		status?: ModerationStatus;
		severity?: ModerationSeverity;
		type?: SupportType;
		cursor?: Date;
		limit: number;
	}): Promise<Support[]>;

	findById(supportId: string): Promise<Support | null>;

	findByIdAndOwner(id: string, userId: string): Promise<Support | null>;

	findManyByOwner(
		userId: string,
		filters: { cursor?: Date; limit: number },
	): Promise<Support[]>;

	update(
		id: string,
		data: { title?: string; description?: string },
	): Promise<Support | null>;

	updateStatus(
		id: string,
		data: {
			status: ModerationStatus;
			severity?: ModerationSeverity;
			reason?: string;
			moderatedBy?: string;
		},
	): Promise<Support | null>;

	attach(
		supportId: string,
		data: SaveSupportAttachment,
	): Promise<Support | null>;
}
