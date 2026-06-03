import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CompanyWaste,
	CompanyWasteInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyValidationRepository } from "@/modules/companies/repositories/company-validation-repository.js";
import type { WastesRepository } from "@/modules/companies/repositories/wastes-repository.js";
import { isWastesValid } from "@/modules/companies/utils/company-validation-utils.js";

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

		this.validateDuplicatedNames(data);

		const wastes = await this.wastesRepository.replaceMany(company.id, data);

		await this.validationRepository.updateField(
			company.id,
			"wastes",
			isWastesValid(wastes),
		);

		return wastes;
	}

	private validateDuplicatedNames(data: CompanyWasteInput[]): void {
		const uniqueNames = new Set(data.map((item) => item.name));

		if (uniqueNames.size !== data.length) {
			throw new AppError(
				"Duplicated name in payload",
				"DUPLICATED_ITEM_NAME",
				400,
			);
		}
	}
}
