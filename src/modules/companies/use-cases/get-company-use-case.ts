import type { CompanyProfile } from "@/modules/companies/dtos/companies-dto.js";
import type { AddressesRepository } from "@/modules/companies/repositories/address-repository.js";
import type { BusinessHoursRepository } from "@/modules/companies/repositories/business-hours-repository.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { ServicesRepository } from "@/modules/companies/repositories/services-repository.js";
import type { WastesRepository } from "@/modules/companies/repositories/wastes-repository.js";

type GetCompaniesUseCaseRequest = {
	userId: string;
};

export class GetCompanyUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly addressesRepository: AddressesRepository,
		private readonly businessHoursRepository: BusinessHoursRepository,
		private readonly wastesRepository: WastesRepository,
		private readonly servicesRepository: ServicesRepository,
	) {}

	async execute({
		userId,
	}: GetCompaniesUseCaseRequest): Promise<CompanyProfile[]> {
		const companies = await this.companiesRepository.findByUserId(userId);

		return Promise.all(
			companies.map(async (company) => {
				const [address, business_hours, wastes, services] = await Promise.all([
					this.addressesRepository.findByCompanyId(company.id),
					this.businessHoursRepository.findByCompanyId(company.id),
					this.wastesRepository.findByCompanyId(company.id),
					this.servicesRepository.findByCompanyId(company.id),
				]);

				return { ...company, address, business_hours, wastes, services };
			}),
		);
	}
}
