import { randomUUID } from "node:crypto";
import type {
	CompanyValidation,
	CompanyValidationField,
} from "@/modules/companies/dtos/companies-dto.js";
import { computeIsCompanyValid } from "@/modules/companies/utils/company-validation-utils.js";
import type { CompanyValidationRepository } from "../company-validation-repository.js";
import type { InMemoryCompaniesRepository } from "./in-memory-companies-repositories.js";

export class InMemoryCompanyValidationRepository
	implements CompanyValidationRepository
{
	public items: CompanyValidation[] = [];

	constructor(
		private readonly companiesRepository?: InMemoryCompaniesRepository,
	) {}

	async create(
		companyId: string,
		generalRegistration: boolean,
	): Promise<CompanyValidation> {
		const record: CompanyValidation = {
			id: randomUUID(),
			company_id: companyId,
			general_registration: generalRegistration,
			address: false,
			business_hours: false,
			wastes: false,
			services: false,
		};

		this.items.push(record);

		return record;
	}

	async updateField(
		companyId: string,
		field: CompanyValidationField,
		value: boolean,
	): Promise<void> {
		const record = this.items.find((item) => item.company_id === companyId);

		if (!record) return;

		record[field] = value;

		if (this.companiesRepository) {
			const company = this.companiesRepository.items.find(
				(c) => c.id === companyId,
			);

			if (company) {
				company.is_company_valid = computeIsCompanyValid(record);
			}
		}
	}

	async findByCompanyId(companyId: string): Promise<CompanyValidation | null> {
		return this.items.find((item) => item.company_id === companyId) ?? null;
	}
}
