import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	Company,
	UpdateCompany,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyValidationRepository } from "@/modules/companies/repositories/company-validation-repository.js";
import { isGeneralRegistrationValid } from "@/modules/companies/utils/company-validation-utils.js";

type UpdateCompanyUseCaseRequest = {
	userId: string;
	companyId: string;
	data: UpdateCompany;
};

export class UpdateCompanyUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly validationRepository: CompanyValidationRepository,
	) {}

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

		// Compute validation from merged in-memory data before hitting the DB
		const merged = { ...company, ...data };
		const generalRegistration = isGeneralRegistrationValid(merged);

		const [updated] = await Promise.all([
			this.companiesRepository.update(company.id, data),
			this.validationRepository.updateField(
				company.id,
				"general_registration",
				generalRegistration,
			),
		]);

		return updated;
	}
}
