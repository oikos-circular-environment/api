export interface AccountDeletionJobDispatcher {
	dispatchDeletionJob(userId: string): Promise<string>;
	cancelDeletionJob(jobId: string): Promise<void>;
}
