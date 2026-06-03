import type {
	BusinessHour,
	Company,
	CompanyAddress,
	CompanyService,
	CompanyValidation,
	CompanyWaste,
} from "@/modules/companies/dtos/companies-dto.js";
import {
	companyAddressValidationSchema,
	companyBusinessHoursValidationSchema,
	companyGeneralRegistrationValidationSchema,
	companyServicesValidationSchema,
	companyWastesValidationSchema,
} from "@/modules/companies/dtos/companies-dto.js";

export function isGeneralRegistrationValid(data: Company): boolean {
	return companyGeneralRegistrationValidationSchema.safeParse(data).success;
}

export function isAddressValid(data: CompanyAddress | null): boolean {
	if (!data) return false;
	return companyAddressValidationSchema.safeParse(data).success;
}

export function isBusinessHoursValid(data: BusinessHour[]): boolean {
	return companyBusinessHoursValidationSchema.safeParse(data).success;
}

export function isWastesValid(data: CompanyWaste[]): boolean {
	return companyWastesValidationSchema.safeParse(data).success;
}

export function isServicesValid(data: CompanyService[]): boolean {
	return companyServicesValidationSchema.safeParse(data).success;
}

export function computeIsCompanyValid(v: CompanyValidation): boolean {
	return (
		v.general_registration &&
		v.address &&
		v.business_hours &&
		(v.wastes || v.services)
	);
}
