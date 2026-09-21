import type { Prisma } from "@/generated/prisma/client.js";
import type { TransactionManager } from "../transaction-manager.js";

export class InMemoryTransactionManager implements TransactionManager {
	async run<T>(
		fn: (tx: Prisma.TransactionClient | undefined) => Promise<T>,
	): Promise<T> {
		return fn(undefined);
	}
}
