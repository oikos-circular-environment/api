import { AppError } from "@/modules/common/errors/app-error.js";
import type { Company } from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

type ToggleCompanyStatusUseCaseRequest = {
	userId: string;
	companyId: string;
	status: boolean;
};

export class ToggleCompanyStatusUseCase {
	constructor(private readonly companiesRepository: CompaniesRepository) {}

	async execute({
		userId,
		companyId,
		status,
	}: ToggleCompanyStatusUseCaseRequest): Promise<Company> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		const updated = await this.companiesRepository.update(company.id, {
			status,
		});

		if (!updated) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		return updated;
	}
}
