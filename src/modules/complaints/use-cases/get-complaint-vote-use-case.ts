import type { ComplaintVote } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type Request = {
	userId: string;
	complaintId: string;
};

export class GetComplaintVoteUseCase {
	constructor(private readonly complaintsRepository: ComplaintsRepository) {}

	async execute({
		userId,
		complaintId,
	}: Request): Promise<ComplaintVote | null> {
		return this.complaintsRepository.findVoteByUserAndComplaint(
			userId,
			complaintId,
		);
	}
}
