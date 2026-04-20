import { AppError } from "@/modules/common/errors/app-error.js";
import type { CompanyAddress } from "@/modules/companies/dtos/companies-dto.js";
import type { AddressesRepository } from "@/modules/companies/repositories/address-repository.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyAddressesRepository } from "@/modules/companies/repositories/company-addresses-repository.js";

type GetCompanyAddressUseCaseRequest = {
	userId: string;
};

export class GetCompanyAddressUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly companyAddressesRepository: CompanyAddressesRepository,
		private readonly addressesRepository: AddressesRepository,
	) {}

	async execute({
		userId,
	}: GetCompanyAddressUseCaseRequest): Promise<CompanyAddress | null> {
		const company = await this.companiesRepository.findByUserId(userId);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		const companyAddress =
			await this.companyAddressesRepository.findByCompanyId(company.id);

		if (!companyAddress) {
			return null;
		}

		const address = await this.addressesRepository.findById(
			companyAddress.address_id,
		);

		if (!address) {
			throw new AppError("Address not found", "ADDRESS_NOT_FOUND", 404);
		}

		return address;
	}
}
