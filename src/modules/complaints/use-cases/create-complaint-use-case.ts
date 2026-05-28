import type {
	Complaint,
	CreateComplaint,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";
import type { JobDispatcher } from "../providers/job-dispatcher.js";

type CreateComplaintUseCaseRequest = {
	userId: string;
	data: CreateComplaint;
};

export class CreateComplaintUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
		private readonly jobDispatcher?: JobDispatcher,
	) {}

	async execute({
		userId,
		data,
	}: CreateComplaintUseCaseRequest): Promise<Complaint> {
		const complaint = await this.complaintsRepository.createForUser(
			userId,
			data,
			"AUTOMATIC",
		);
		await this.jobDispatcher?.dispatchGroupingJob(complaint.id);
		return complaint;
	}
}
