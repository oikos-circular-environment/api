import type { Company } from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

type GetCompaniesUseCaseRequest = {
	userId: string;
};

export class GetCompanyUseCase {
	constructor(private readonly companiesRepository: CompaniesRepository) {}

	async execute({ userId }: GetCompaniesUseCaseRequest): Promise<Company[]> {
		return this.companiesRepository.findByUserId(userId);
	}
}
