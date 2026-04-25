import type { Complaint } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type GetComplaintsUseCaseRequest = {
	userId: string;
};

export class GetComplaintsUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({ userId }: GetComplaintsUseCaseRequest): Promise<Complaint[]> {
		return this.complaintsRepository.findManyByUserId(userId);
	}
}
