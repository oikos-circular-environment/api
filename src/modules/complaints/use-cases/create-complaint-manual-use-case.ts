import type {
	Complaint,
	CreateComplaint,
	CreateComplaintManual,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type CreateComplaintManualUseCaseRequest = {
	userId: string;
	data: CreateComplaintManual;
};

export class CreateComplaintManualUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
	) {}

	async execute({
		userId,
		data,
	}: CreateComplaintManualUseCaseRequest): Promise<Complaint> {
		return this.complaintsRepository.createForUser(
			userId,
			data as unknown as CreateComplaint,
			"MANUAL",
		);
	}
}
