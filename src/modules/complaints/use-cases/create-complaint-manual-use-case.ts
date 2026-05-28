import type {
	Complaint,
	CreateComplaint,
	CreateComplaintManual,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";
import type { JobDispatcher } from "../providers/job-dispatcher.js";

type CreateComplaintManualUseCaseRequest = {
	userId: string;
	data: CreateComplaintManual;
};

export class CreateComplaintManualUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
		private readonly jobDispatcher?: JobDispatcher,
	) {}

	async execute({
		userId,
		data,
	}: CreateComplaintManualUseCaseRequest): Promise<Complaint> {
		const complaint = await this.complaintsRepository.createForUser(
			userId,
			data as unknown as CreateComplaint,
			"MANUAL",
		);
		await this.jobDispatcher?.dispatchGroupingJob(complaint.id);
		return complaint;
	}
}
