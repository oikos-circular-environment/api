import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CompanyService,
	CompanyServiceInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { ServicesRepository } from "@/modules/companies/repositories/services-repository.js";

type UpsertCompanyServicesUseCaseRequest = {
	userId: string;
	companyId: string;
	data: CompanyServiceInput[];
};

export class UpsertCompanyServicesUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly servicesRepository: ServicesRepository,
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

		this.validateDuplicatedNames(data);

		return this.servicesRepository.replaceMany(company.id, data);
	}

	private validateDuplicatedNames(data: CompanyServiceInput[]): void {
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
