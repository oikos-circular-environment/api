import type {
	CreateSupport,
	SaveSupportAttachment,
	Support,
} from "@/modules/moderation/dtos/moderation-dto.js";

export interface SupportsRepository {
	create(data: CreateSupport): Promise<Support>;

	findById(supportId: string): Promise<Support | null>;

	attach(
		supportId: string,
		data: SaveSupportAttachment,
	): Promise<Support | null>;
}
