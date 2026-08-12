import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { env } from "@/env/index.js";
import { accountDeletionQueue } from "@/lib/queue/index.js";
import { BullMQAccountDeletionJobDispatcher } from "./bullmq-account-deletion-job-dispatcher.js";

describe("bullmq-account-deletion-job-dispatcher", () => {
	afterEach(async () => {
		await accountDeletionQueue.drain(true);
	});

	it("enqueues delayed job with correct delay", async () => {
		const userId = randomUUID();
		const sut = new BullMQAccountDeletionJobDispatcher();

		const jobId = await sut.dispatchDeletionJob(userId);

		expect(jobId).toBe(`account-deletion-${userId}`);

		const job = await accountDeletionQueue.getJob(jobId);
		expect(job).not.toBeNull();
		expect(job?.opts.delay).toBe(env.ACCOUNT_DELETION_DELAY_MS);
		expect(job?.data.userId).toBe(userId);
	});

	it("removes job on cancel", async () => {
		const userId = randomUUID();
		const sut = new BullMQAccountDeletionJobDispatcher();

		const jobId = await sut.dispatchDeletionJob(userId);

		const before = await accountDeletionQueue.getJob(jobId);
		expect(before).not.toBeNull();

		await sut.cancelDeletionJob(jobId);

		const after = await accountDeletionQueue.getJob(jobId);
		expect(after).toBeUndefined();
	});

	it("does not throw when cancelling non-existent job", async () => {
		const sut = new BullMQAccountDeletionJobDispatcher();
		await expect(
			sut.cancelDeletionJob("non-existent-job"),
		).resolves.not.toThrow();
	});
});
