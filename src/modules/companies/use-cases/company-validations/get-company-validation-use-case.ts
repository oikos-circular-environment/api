import { AppError } from "@/modules/common/errors/app-error.js";
import type { CompanyValidation } from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyValidationRepository } from "@/modules/companies/repositories/company-validation-repository.js";

type GetCompanyValidationUseCaseRequest = {
	userId: string;
	companyId: string;
};

export class GetCompanyValidationUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly validationRepository: CompanyValidationRepository,
	) {}

	async execute({
		userId,
		companyId,
	}: GetCompanyValidationUseCaseRequest): Promise<CompanyValidation | null> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		return this.validationRepository.findByCompanyId(company.id);
	}
}
