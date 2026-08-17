import { prisma } from "@/lib/prisma.js";
import type {
	UserOrganizationSummary,
	UserOrganizationsRepository,
} from "../user-organizations-repository.js";

export class PrismaUserOrganizationsRepository
	implements UserOrganizationsRepository
{
	async findByUserId(userId: string): Promise<UserOrganizationSummary[]> {
		const memberships = await prisma.member.findMany({
			where: { user_id: userId },
			include: { organization: { include: { company: true } } },
		});

		return memberships.map((membership) => ({
			id: membership.organization.id,
			companyId: membership.organization.company?.id ?? null,
			name: membership.organization.name,
			role: membership.role,
		}));
	}
}
