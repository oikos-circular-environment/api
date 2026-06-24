import type { AccountDeletionJobDispatcher } from "../account-deletion-job-dispatcher.js";

interface DispatchedJob {
	userId: string;
}

export class InMemoryAccountDeletionJobDispatcher
	implements AccountDeletionJobDispatcher
{
	public jobs = new Map<string, DispatchedJob>();

	async dispatchDeletionJob(userId: string): Promise<string> {
		const jobId = `account-deletion-${userId}`;
		this.jobs.set(jobId, { userId });
		return jobId;
	}

	async cancelDeletionJob(jobId: string): Promise<void> {
		this.jobs.delete(jobId);
	}
}
