import type {
	CreateSupportRequest,
	SaveSupportRequestAttachment,
	SupportRequest,
} from "@/modules/moderation/dtos/moderation-dto.js";

export interface SupportRequestsRepository {
	create(data: CreateSupportRequest): Promise<SupportRequest>;

	findById(supportRequestId: string): Promise<SupportRequest | null>;

	attach(
		supportRequestId: string,
		data: SaveSupportRequestAttachment,
	): Promise<SupportRequest | null>;
}
