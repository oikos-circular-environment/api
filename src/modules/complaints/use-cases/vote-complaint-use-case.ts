import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	ComplaintVote,
	ComplaintVoteType,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { JobDispatcher } from "@/modules/complaints/providers/queue/job-dispatcher.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type Request = {
	userId: string;
	complaintId: string;
	voteType: ComplaintVoteType;
};

export class VoteComplaintUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
		private readonly jobDispatcher?: JobDispatcher,
	) {}

	async execute({
		userId,
		complaintId,
		voteType,
	}: Request): Promise<ComplaintVote> {
		const complaint =
			await this.complaintsRepository.findPublicComplaintById(complaintId);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		if (["RESOLVED", "CANCELED"].includes(complaint.status)) {
			throw new AppError("Complaint is closed", "COMPLAINT_CLOSED", 422);
		}

		const vote = await this.complaintsRepository.voteOnComplaint(
			userId,
			complaintId,
			voteType,
		);

		await this.jobDispatcher?.dispatchQuorumJob(complaintId);

		return vote;
	}
}
