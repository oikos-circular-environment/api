import type {
	Company,
	CreateCompany,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyValidationRepository } from "@/modules/companies/repositories/company-validation-repository.js";
import { isGeneralRegistrationValid } from "@/modules/companies/utils/company-validation-utils.js";

type CreateCompanyUseCaseRequest = {
	userId: string;
	data: Omit<CreateCompany, "user_id">;
};

export class CreateCompanyUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly validationRepository: CompanyValidationRepository,
	) {}

	async execute({
		userId,
		data,
	}: CreateCompanyUseCaseRequest): Promise<Company> {
		const company = await this.companiesRepository.create({
			...data,
			user_id: userId,
		});

		await this.validationRepository.create(
			company.id,
			isGeneralRegistrationValid(company),
		);

		return company;
	}
}
