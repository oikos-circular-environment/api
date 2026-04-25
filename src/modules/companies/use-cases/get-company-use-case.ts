import type { Company } from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

type GetCompanyUseCaseRequest = {
	userId: string;
};

export class GetCompanyUseCase {
	constructor(private readonly companiesRepository: CompaniesRepository) {}

	async execute({ userId }: GetCompanyUseCaseRequest): Promise<Company | null> {
		return this.companiesRepository.findByUserId(userId);
	}
}
