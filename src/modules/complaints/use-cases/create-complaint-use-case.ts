import type {
	Complaint,
	CreateComplaint,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type CreateComplaintUseCaseRequest = {
	userId: string;
	data: CreateComplaint;
};

export class CreateComplaintUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
	) {}

	async execute({
		userId,
		data,
	}: CreateComplaintUseCaseRequest): Promise<Complaint> {
		return this.complaintsRepository.createForUser(userId, data, "AUTOMATIC");
	}
}
