import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CompanyWaste,
	CompanyWasteInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyValidationRepository } from "@/modules/companies/repositories/company-validation-repository.js";
import type { WastesRepository } from "@/modules/companies/repositories/wastes-repository.js";
import {
	validateCategories,
	validateDuplicatedNames,
} from "@/modules/companies/utils/validate-items.js";
import { isWastesValid } from "@/modules/companies/utils/company-validation-utils.js";
import type { WasteCategoriesRepository } from "@/modules/wastes/repositories/waste-categories-repository.js";

type UpsertCompanyWastesUseCaseRequest = {
	userId: string;
	companyId: string;
	data: CompanyWasteInput[];
};

export class UpsertCompanyWastesUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly wastesRepository: WastesRepository,
		private readonly validationRepository: CompanyValidationRepository,
		private readonly wasteCategoriesRepository: WasteCategoriesRepository,
	) {}

	async execute({
		userId,
		companyId,
		data,
	}: UpsertCompanyWastesUseCaseRequest): Promise<CompanyWaste[]> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		validateDuplicatedNames(data);
		await validateCategories(data, this.wasteCategoriesRepository);

		const wastes = await this.wastesRepository.replaceMany(company.id, data);

		await this.validationRepository.updateField(
			company.id,
			"wastes",
			isWastesValid(wastes),
		);

		return wastes;
	}
}
