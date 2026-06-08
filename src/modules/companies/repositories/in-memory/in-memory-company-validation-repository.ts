import { randomUUID } from "node:crypto";
import type {
	CompanyValidation,
	CompanyValidationField,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompanyValidationRepository } from "../company-validation-repository.js";

export class InMemoryCompanyValidationRepository
	implements CompanyValidationRepository
{
	public items: CompanyValidation[] = [];

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

		if (record) {
			record[field] = value;
		}
	}

	async findByCompanyId(companyId: string): Promise<CompanyValidation | null> {
		return this.items.find((item) => item.company_id === companyId) ?? null;
	}
}
