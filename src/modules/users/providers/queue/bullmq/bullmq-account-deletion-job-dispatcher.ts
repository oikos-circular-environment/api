import { env } from "@/env/index.js";
import type { AccountDeletionJobDispatcher } from "../account-deletion-job-dispatcher.js";

const deletionJobId = (userId: string) => `account-deletion-${userId}`;

export class BullMQAccountDeletionJobDispatcher
	implements AccountDeletionJobDispatcher
{
	async dispatchDeletionJob(userId: string): Promise<string> {
		const { accountDeletionQueue } = await import("@/lib/queue/index.js");

		const jobId = deletionJobId(userId);

		await accountDeletionQueue.add(
			"delete-account",
			{ userId },
			{ jobId, delay: env.ACCOUNT_DELETION_DELAY_MS },
		);

		return jobId;
	}

	async cancelDeletionJob(jobId: string): Promise<void> {
		const { accountDeletionQueue } = await import("@/lib/queue/index.js");

		const existing = await accountDeletionQueue.getJob(jobId);
		if (existing) await existing.remove();
	}
}
