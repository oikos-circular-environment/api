import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CompanyAddress,
	UpdateCompanyAddress,
} from "@/modules/companies/dtos/companies-dto.js";
import type { AddressesRepository } from "@/modules/companies/repositories/address-repository.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyAddressesRepository } from "@/modules/companies/repositories/company-addresses-repository.js";

type UpdateCompanyAddressUseCaseRequest = {
	userId: string;
	data: UpdateCompanyAddress;
};

export class UpdateCompanyAddressUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly companyAddressesRepository: CompanyAddressesRepository,
		private readonly addressesRepository: AddressesRepository,
	) {}

	async execute({
		userId,
		data,
	}: UpdateCompanyAddressUseCaseRequest): Promise<CompanyAddress | null> {
		const company = await this.companiesRepository.findByUserId(userId);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		const companyAddress =
			await this.companyAddressesRepository.findByCompanyId(company.id);

		if (!companyAddress) {
			throw new AppError("Address not found", "ADDRESS_NOT_FOUND", 404);
		}

		return this.addressesRepository.update(companyAddress.address_id, data);
	}
}
