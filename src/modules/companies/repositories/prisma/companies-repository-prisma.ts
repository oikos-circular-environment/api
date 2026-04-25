import { prisma } from "@/lib/prisma.js";
import type {
	CreateCompany,
	UpdateCompany,
} from "@/modules/companies/dtos/companies-dto.js";
import type { CompaniesRepository } from "../companies-repository.js";
import { companyMapper } from "./mappers/company-mapper.js";

export class PrismaCompaniesRepository implements CompaniesRepository {
	async findById(id: string) {
		const company = await prisma.company.findUnique({
			where: {
				id,
			},
		});

		return companyMapper(company);
	}

	async findByUserId(userId: string) {
		const company = await prisma.company.findUnique({
			where: {
				user_id: userId,
			},
		});

		return companyMapper(company);
	}

	async create(data: CreateCompany) {
		const company = await prisma.company.create({
			data: {
				user_id: data.user_id,
				identity: data.identity,
				identity_type: data.identity_type,
				company_type: data.company_type,
				status: data.status,
				is_headquarters: data.is_headquarters,
				business_name: data.business_name,
				corporate_name: data.corporate_name,
				accept_appointments: data.accept_appointments,
				email: data.email,
				phones: data.phones,
				started_activity_in: data.started_activity_in,
			},
		});

		const mappedCompany = companyMapper(company);

		if (!mappedCompany) {
			throw new Error("Failed to create company");
		}

		return mappedCompany;
	}

	async update(id: string, data: UpdateCompany) {
		const currentCompany = await prisma.company.findUnique({
			where: {
				id,
			},
		});

		if (!currentCompany) {
			return null;
		}

		const company = await prisma.company.update({
			where: {
				id,
			},
			data,
		});

		return companyMapper(company);
	}
}
