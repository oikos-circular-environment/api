import { AppError } from "@/modules/common/errors/app-error.js";
import type { SubmitResolution } from "@/modules/complaints/dtos/complaints-dto.js";
import type { ComplaintsRepository } from "@/modules/complaints/repositories/complaints-repository.js";
import type { CompanyOwnershipChecker } from "../providers/company-checker.js";

type Request = {
	userId: string;
	complaintId: string;
	data: SubmitResolution;
};

export class SubmitResolutionUseCase {
	constructor(
		private readonly complaintsRepository: ComplaintsRepository,
		private readonly companyChecker?: CompanyOwnershipChecker,
	) {}

	async execute({ userId, complaintId, data }: Request): Promise<void> {
		const complaint =
			await this.complaintsRepository.findPublicComplaintById(complaintId);

		if (!complaint) {
			throw new AppError("Complaint not found", "COMPLAINT_NOT_FOUND", 404);
		}

		if (["RESOLVED", "CANCELED"].includes(complaint.status)) {
			throw new AppError("Complaint is closed", "COMPLAINT_CLOSED", 422);
		}

		if (data.company_id && this.companyChecker) {
			const owns = await this.companyChecker.userOwnsCompany(
				userId,
				data.company_id,
			);
			if (!owns) {
				throw new AppError(
					"Company does not belong to the user",
					"COMPANY_NOT_OWNED",
					403,
				);
			}
		}

		const existing =
			await this.complaintsRepository.findResolutionByUserAndComplaint(
				userId,
				complaintId,
			);

		if (existing) {
			await this.complaintsRepository.updateResolution(
				userId,
				complaintId,
				data,
			);
		} else {
			await this.complaintsRepository.submitResolution(
				userId,
				complaintId,
				data,
			);
		}
	}
}
