import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	Company,
	UpdateCompany,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

type UpdateCompanyUseCaseRequest = {
	userId: string;
	data: UpdateCompany;
};

export class UpdateCompanyUseCase {
	constructor(private readonly companiesRepository: CompaniesRepository) {}

	async execute({
		userId,
		data,
	}: UpdateCompanyUseCaseRequest): Promise<Company | null> {
		const company = await this.companiesRepository.findByUserId(userId);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		return this.companiesRepository.update(company.id, data);
	}
}
