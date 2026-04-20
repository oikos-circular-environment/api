import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	Company,
	CreateCompany,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

type CreateCompanyUseCaseRequest = {
	userId: string;
	data: Omit<CreateCompany, "user_id">;
};

export class CreateCompanyUseCase {
	constructor(private readonly companiesRepository: CompaniesRepository) {}

	async execute({
		userId,
		data,
	}: CreateCompanyUseCaseRequest): Promise<Company> {
		const existingCompany = await this.companiesRepository.findByUserId(userId);

		if (existingCompany) {
			throw new AppError(
				"Company already exists",
				"COMPANY_ALREADY_EXISTS",
				409,
			);
		}

		return this.companiesRepository.create({
			...data,
			user_id: userId,
		});
	}
}
