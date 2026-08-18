import { prisma } from "@/lib/prisma.js";
import type { AccountsRepository } from "../accounts-repository.js";

export class PrismaAccountsRepository implements AccountsRepository {
	async listByUserId(userId: string) {
		return prisma.account.findMany({
			where: { user_id: userId },
			select: {
				id: true,
				provider_id: true,
				account_id: true,
				scope: true,
				created_at: true,
				updated_at: true,
			},
		});
	}
}
