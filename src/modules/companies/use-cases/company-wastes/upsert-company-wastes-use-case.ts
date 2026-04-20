import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CompanyWaste,
	CompanyWasteInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { WastesRepository } from "@/modules/companies/repositories/wastes-repository.js";

type UpsertCompanyWastesUseCaseRequest = {
	userId: string;
	data: CompanyWasteInput[];
};

export class UpsertCompanyWastesUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly wastesRepository: WastesRepository,
	) {}

	async execute({
		userId,
		data,
	}: UpsertCompanyWastesUseCaseRequest): Promise<CompanyWaste[]> {
		const company = await this.companiesRepository.findByUserId(userId);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		this.validateDuplicatedNames(data);

		return this.wastesRepository.replaceMany(company.id, data);
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
