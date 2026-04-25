import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CompanyAddress,
	CreateCompanyAddress,
} from "@/modules/companies/dtos/companies-dto.js";
import type { AddressesRepository } from "@/modules/companies/repositories/address-repository.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

type CreateCompanyAddressUseCaseRequest = {
	userId: string;
	data: Omit<CreateCompanyAddress, "company_id">;
};

export class CreateCompanyAddressUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly addressesRepository: AddressesRepository,
	) {}

	async execute({
		userId,
		data,
	}: CreateCompanyAddressUseCaseRequest): Promise<CompanyAddress> {
		const company = await this.companiesRepository.findByUserId(userId);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		const existingAddress = await this.addressesRepository.findByCompanyId(
			company.id,
		);

		if (existingAddress) {
			throw new AppError(
				"Address already exists",
				"COMPANY_ADDRESS_ALREADY_EXISTS",
				409,
			);
		}

		const address = await this.addressesRepository.create({
			...data,
			company_id: company.id,
		});

		return address;
	}
}
