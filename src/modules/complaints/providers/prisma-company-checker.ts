import { prisma } from "@/lib/prisma.js";
import type { CompanyOwnershipChecker } from "./company-checker.js";

export class PrismaCompanyOwnershipChecker implements CompanyOwnershipChecker {
	async userOwnsCompany(userId: string, companyId: string): Promise<boolean> {
		const company = await prisma.company.findFirst({
			where: { id: companyId, user_id: userId },
			select: { id: true },
		});
		return company !== null;
	}
}
