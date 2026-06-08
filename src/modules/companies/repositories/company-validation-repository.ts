import type {
	CompanyValidation,
	CompanyValidationField,
} from "@/modules/companies/dtos/companies-dto.js";

export interface CompanyValidationRepository {
	create(
		companyId: string,
		generalRegistration: boolean,
	): Promise<CompanyValidation>;
	updateField(
		companyId: string,
		field: CompanyValidationField,
		value: boolean,
	): Promise<void>;
	findByCompanyId(companyId: string): Promise<CompanyValidation | null>;
}
