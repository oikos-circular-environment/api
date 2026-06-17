import { prisma } from "@/lib/prisma.js";
import type {
	CompanyValidation,
	CompanyValidationField,
} from "@/modules/companies/dtos/companies-dto.js";
import { computeIsCompanyValid } from "@/modules/companies/utils/company-validation-utils.js";
import type { CompanyValidationRepository } from "../company-validation-repository.js";

function mapValidation(record: {
	id: string;
	company_id: string;
	general_registration: boolean;
	address: boolean;
	business_hours: boolean;
	wastes: boolean;
	services: boolean;
}): CompanyValidation {
	return {
		id: record.id,
		company_id: record.company_id,
		general_registration: record.general_registration,
		address: record.address,
		business_hours: record.business_hours,
		wastes: record.wastes,
		services: record.services,
	};
}

export class PrismaCompanyValidationRepository
	implements CompanyValidationRepository
{
	async create(
		companyId: string,
		generalRegistration: boolean,
	): Promise<CompanyValidation> {
		const record = await prisma.companyValidation.create({
			data: {
				company_id: companyId,
				general_registration: generalRegistration,
			},
		});

		return mapValidation(record);
	}

	async updateField(
		companyId: string,
		field: CompanyValidationField,
		value: boolean,
	): Promise<void> {
		await prisma.$transaction(async (tx) => {
			const updated = await tx.companyValidation.update({
				where: { company_id: companyId },
				data: { [field]: value },
			});

			const isValid = computeIsCompanyValid(mapValidation(updated));

			await tx.company.update({
				where: { id: companyId },
				data: { is_company_valid: isValid },
			});
		});
	}

	async findByCompanyId(companyId: string): Promise<CompanyValidation | null> {
		const record = await prisma.companyValidation.findUnique({
			where: { company_id: companyId },
		});

		return record ? mapValidation(record) : null;
	}
}
