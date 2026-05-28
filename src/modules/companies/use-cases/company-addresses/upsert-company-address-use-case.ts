import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CompanyAddress,
	UpsertCompanyAddress,
} from "@/modules/companies/dtos/companies-dto.js";
import type { AddressesRepository } from "@/modules/companies/repositories/address-repository.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

type UpsertCompanyAddressUseCaseRequest = {
	userId: string;
	companyId: string;
	data: UpsertCompanyAddress;
};

export class UpsertCompanyAddressUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly addressesRepository: AddressesRepository,
	) {}

	async execute({
		userId,
		companyId,
		data,
	}: UpsertCompanyAddressUseCaseRequest): Promise<CompanyAddress> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		const existingAddress = await this.addressesRepository.findByCompanyId(
			company.id,
		);

		if (existingAddress) {
			return (await this.addressesRepository.update(
				existingAddress.id,
				data,
			)) as CompanyAddress;
		}

		return this.addressesRepository.create({ ...data, company_id: company.id });
	}
}
