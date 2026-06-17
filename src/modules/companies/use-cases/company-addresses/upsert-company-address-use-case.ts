import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	CompanyAddress,
	UpsertCompanyAddress,
} from "@/modules/companies/dtos/companies-dto.js";
import type { AddressesRepository } from "@/modules/companies/repositories/address-repository.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyValidationRepository } from "@/modules/companies/repositories/company-validation-repository.js";
import { isAddressValid } from "@/modules/companies/utils/company-validation-utils.js";

type UpsertCompanyAddressUseCaseRequest = {
	userId: string;
	companyId: string;
	data: UpsertCompanyAddress;
};

export class UpsertCompanyAddressUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly addressesRepository: AddressesRepository,
		private readonly validationRepository: CompanyValidationRepository,
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

		let address: CompanyAddress;

		if (existingAddress) {
			const updated = await this.addressesRepository.update(
				existingAddress.id,
				data,
			);

			if (!updated) {
				throw new AppError("Address not found", "ADDRESS_NOT_FOUND", 404);
			}

			address = updated;
		} else {
			address = await this.addressesRepository.create({
				...data,
				company_id: company.id,
			});
		}

		await this.validationRepository.updateField(
			company.id,
			"address",
			isAddressValid(address),
		);

		return address;
	}
}
