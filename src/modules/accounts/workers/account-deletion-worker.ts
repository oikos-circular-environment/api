import { Worker } from "bullmq";
import { env } from "@/env/index.js";
import type { AccountDeletionJobData } from "@/lib/queue/jobs.js";
import { getRedisUrl } from "@/lib/queue/redis.js";
import { executeAccountDeletion } from "./account-deletion-logic.js";

export function createAccountDeletionWorker() {
	return new Worker<AccountDeletionJobData>(
		"account-deletion",
		async (job) => {
			const { userId } = job.data;

			await job.log(`Starting account deletion for user ${userId}`);
			await job.updateProgress(10);

			const deleted = await executeAccountDeletion(userId);
			await job.updateProgress(100);

			await job.log(
				deleted
					? `User ${userId} deleted successfully`
					: `Deletion skipped for user ${userId}`,
			);

			return { userId, deleted };
		},
		{
			connection: { url: getRedisUrl(), maxRetriesPerRequest: null },
			concurrency: env.WORKER_CONCURRENCY,
		},
	);
}
