import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CompanyService,
	CompanyServiceInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyValidationRepository } from "@/modules/companies/repositories/company-validation-repository.js";
import type { ServicesRepository } from "@/modules/companies/repositories/services-repository.js";
import { isServicesValid } from "@/modules/companies/utils/company-validation-utils.js";
import {
	validateCategories,
	validateDuplicatedNames,
} from "@/modules/companies/utils/validate-items.js";
import type { WasteCategoriesRepository } from "@/modules/wastes/repositories/waste-categories-repository.js";

type UpsertCompanyServicesUseCaseRequest = {
	userId: string;
	companyId: string;
	data: CompanyServiceInput[];
};

export class UpsertCompanyServicesUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly servicesRepository: ServicesRepository,
		private readonly validationRepository: CompanyValidationRepository,
		private readonly wasteCategoriesRepository: WasteCategoriesRepository,
	) {}

	async execute({
		userId,
		companyId,
		data,
	}: UpsertCompanyServicesUseCaseRequest): Promise<CompanyService[]> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		validateDuplicatedNames(data);
		await validateCategories(data, this.wasteCategoriesRepository);

		const services = await this.servicesRepository.replaceMany(
			company.id,
			data,
		);

		await this.validationRepository.updateField(
			company.id,
			"services",
			isServicesValid(services),
		);

		return services;
	}
}
