import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	Company,
	UpdateCompany,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

type UpdateCompanyUseCaseRequest = {
	userId: string;
	companyId: string;
	data: UpdateCompany;
};

export class UpdateCompanyUseCase {
	constructor(private readonly companiesRepository: CompaniesRepository) {}

	async execute({
		userId,
		companyId,
		data,
	}: UpdateCompanyUseCaseRequest): Promise<Company | null> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		return this.companiesRepository.update(company.id, data);
	}
}
