import type { Prisma } from "@/generated/prisma/client.js";

export interface TransactionManager {
	run<T>(
		fn: (tx: Prisma.TransactionClient | undefined) => Promise<T>,
	): Promise<T>;
}
