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
			where: { id },
			include: { avatar: true },
		});

		return companyMapper(company);
	}

	async findByUserId(userId: string) {
		const companies = await prisma.company.findMany({
			where: { user_id: userId },
			include: { avatar: true },
		});

		return companies.map((c) => companyMapper(c)).filter((c) => c !== null);
	}

	async findByUserAndCompanyId(userId: string, companyId: string) {
		const company = await prisma.company.findFirst({
			where: { id: companyId, user_id: userId },
			include: { avatar: true },
		});

		return companyMapper(company ?? null);
	}

	async create(data: CreateCompany) {
		const company = await prisma.company.create({
			data: {
				user_id: data.user_id,
				identity: data.identity,
				identity_type: data.identity_type,
				company_type: data.company_type,
				status: data.status,
				business_name: data.business_name,
				corporate_name: data.corporate_name,
				email: data.email,
				phones: data.phones,
				started_activity_in: data.started_activity_in,
			},
			include: { avatar: true },
		});

		const mappedCompany = companyMapper(company);

		if (!mappedCompany) {
			throw new Error("Failed to create company");
		}

		return mappedCompany;
	}

	async update(id: string, data: UpdateCompany) {
		const currentCompany = await prisma.company.findUnique({
			where: { id },
		});

		if (!currentCompany) {
			return null;
		}

		const company = await prisma.company.update({
			where: { id },
			data,
			include: { avatar: true },
		});

		return companyMapper(company);
	}

	async uploadAvatar(
		companyId: string,
		data: { url: string; file_name: string; path: string },
	) {
		const currentCompany = await prisma.company.findUnique({
			where: { id: companyId },
		});

		if (!currentCompany) {
			return null;
		}

		const avatar = await prisma.companyAvatar.create({
			data: {
				url: data.url,
				file_name: data.file_name,
				path: data.path,
			},
		});

		const company = await prisma.company.update({
			where: { id: companyId },
			data: { avatar_id: avatar.id },
			include: { avatar: true },
		});

		return companyMapper(company);
	}
}
