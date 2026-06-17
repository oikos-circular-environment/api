import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	Complaint,
	SubmitResolution,
} from "@/modules/complaints/dtos/complaints-dto.js";
import type { JobDispatcher } from "@/modules/complaints/providers/queue/job-dispatcher.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";

type ResolveComplaintUseCaseRequest = {
	userId: string;
	complaintId: string;
	resolution: SubmitResolution;
};

export class ResolveComplaintUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
		private readonly jobDispatcher?: JobDispatcher,
	) {}

	async execute({
		userId,
		complaintId,
		resolution,
	}: ResolveComplaintUseCaseRequest): Promise<Complaint> {
		const complaint = await this.complaintsRepository.findByUserAndComplaintId(
			userId,
			complaintId,
		);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		if (["RESOLVED", "CANCELED"].includes(complaint.status)) {
			throw new AppError("Complaint is closed", "COMPLAINT_CLOSED", 422);
		}

		// Register resolution (create or update)
		const existingRes =
			await this.complaintsRepository.findResolutionByUserAndComplaint(
				userId,
				complaintId,
			);

		if (existingRes) {
			await this.complaintsRepository.updateResolution(
				userId,
				complaintId,
				resolution,
			);
		} else {
			await this.complaintsRepository.submitResolution(
				userId,
				complaintId,
				resolution,
			);
		}

		// Register owner vote RESOLVED (weight calculated by worker based on user_id)
		await this.complaintsRepository.voteOnComplaint(
			userId,
			complaintId,
			"RESOLVED",
		);

		// Dispatch quorum job
		await this.jobDispatcher?.dispatchQuorumJob(complaintId);

		return this.complaintsRepository.findByUserAndComplaintId(
			userId,
			complaintId,
		) as Promise<Complaint>;
	}
}
