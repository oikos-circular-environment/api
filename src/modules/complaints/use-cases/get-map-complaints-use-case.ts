import type {
	GetMapComplaintsQuery,
	MapComplaintItem,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type Request = GetMapComplaintsQuery;

export class GetMapComplaintsUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute(query: Request): Promise<MapComplaintItem[]> {
		return this.complaintsRepository.findMapComplaints(query);
	}
}
