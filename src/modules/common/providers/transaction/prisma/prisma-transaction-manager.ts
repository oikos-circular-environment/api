import type { Prisma } from "@/generated/prisma/client.js";
import { prisma } from "@/lib/prisma.js";
import type { TransactionManager } from "../transaction-manager.js";

export class PrismaTransactionManager implements TransactionManager {
	async run<T>(
		fn: (tx: Prisma.TransactionClient | undefined) => Promise<T>,
	): Promise<T> {
		return prisma.$transaction((tx) => fn(tx));
	}
}
