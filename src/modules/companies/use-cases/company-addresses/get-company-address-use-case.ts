import { AppError } from "@/modules/common/errors/app-error.js";
import type { CompanyAddress } from "@/modules/companies/dtos/companies-dto.js";
import type { AddressesRepository } from "@/modules/companies/repositories/address-repository.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

type GetCompanyAddressUseCaseRequest = {
	userId: string;
	companyId: string;
};

export class GetCompanyAddressUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly addressesRepository: AddressesRepository,
	) {}

	async execute({
		userId,
		companyId,
	}: GetCompanyAddressUseCaseRequest): Promise<CompanyAddress | null> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		return this.addressesRepository.findByCompanyId(company.id);
	}
}
