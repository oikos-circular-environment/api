import { AppError } from "@/modules/common/errors/app-error.js";
import type { CompanyService } from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { ServicesRepository } from "@/modules/companies/repositories/services-repository.js";

type GetCompanyServicesUseCaseRequest = {
	userId: string;
	companyId: string;
};

export class GetCompanyServicesUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly servicesRepository: ServicesRepository,
	) {}

	async execute({
		userId,
		companyId,
	}: GetCompanyServicesUseCaseRequest): Promise<CompanyService[]> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		return this.servicesRepository.findByCompanyId(company.id);
	}
}
