import type {
	Company,
	CreateCompany,
} from "@/modules/companies/dtos/companies-dto.js";
import type { OrganizationProvider } from "@/modules/companies/providers/organization-provider.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyValidationRepository } from "@/modules/companies/repositories/company-validation-repository.js";
import { isGeneralRegistrationValid } from "@/modules/companies/utils/company-validation-utils.js";

type CreateCompanyUseCaseRequest = {
	userId: string;
	data: Omit<CreateCompany, "user_id" | "organization_id">;
};

export class CreateCompanyUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly validationRepository: CompanyValidationRepository,
		private readonly organizationProvider: OrganizationProvider,
	) {}

	async execute({
		userId,
		data,
	}: CreateCompanyUseCaseRequest): Promise<Company> {
		const { organizationId } =
			await this.organizationProvider.createOrganization({
				name: data.business_name,
				userId,
			});

		const company = await this.companiesRepository.create({
			...data,
			user_id: userId,
			organization_id: organizationId,
		});

		await this.validationRepository.create(
			company.id,
			isGeneralRegistrationValid(company),
		);

		return company;
	}
}
