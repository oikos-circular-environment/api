import { AppError } from "@/modules/common/errors/app-error.js";
import type { CompanyWaste } from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { WastesRepository } from "@/modules/companies/repositories/wastes-repository.js";

type GetCompanyWastesUseCaseRequest = {
	userId: string;
	companyId: string;
};

export class GetCompanyWastesUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly wastesRepository: WastesRepository,
	) {}

	async execute({
		userId,
		companyId,
	}: GetCompanyWastesUseCaseRequest): Promise<CompanyWaste[]> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		return this.wastesRepository.findByCompanyId(company.id);
	}
}
