import { prisma } from "@/lib/prisma.js";
import type { CompanyAddressesRepository } from "../company-addresses-repository.js";

export class PrismaCompanyAddressesRepository
	implements CompanyAddressesRepository
{
	async findByCompanyId(companyId: string) {
		const relation = await prisma.companyAddress.findUnique({
			where: {
				company_id: companyId,
			},
		});

		return relation;
	}

	async create(data: { company_id: string; address_id: string }) {
		const relation = await prisma.companyAddress.create({
			data,
		});

		return relation;
	}
}
