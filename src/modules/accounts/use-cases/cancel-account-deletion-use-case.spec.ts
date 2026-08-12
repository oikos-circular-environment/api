import { describe, expect, it } from "vitest";
import { AccountNotScheduledForDeletionError } from "@/modules/accounts/errors/account-not-scheduled-for-deletion-error.js";
import { UserNotFoundError } from "@/modules/accounts/errors/user-not-found-error.js";
import { makeUser } from "@/modules/accounts/factories/make-user.js";
import { InMemoryAccountDeletionJobDispatcher } from "@/modules/accounts/providers/queue/in-memory/in-memory-account-deletion-job-dispatcher.js";
import { InMemoryUsersRepository } from "@/modules/accounts/repositories/in-memory/in-memory-users-repositories.js";
import { CancelAccountDeletionUseCase } from "./cancel-account-deletion-use-case.js";

describe("cancel-account-deletion-use-case", () => {
	it("cancels scheduled deletion", async () => {
		const usersRepository = new InMemoryUsersRepository();
		const jobDispatcher = new InMemoryAccountDeletionJobDispatcher();
		const sut = new CancelAccountDeletionUseCase(
			usersRepository,
			jobDispatcher,
		);

		const jobId = "account-deletion-user-1";
		const user = makeUser({
			deleted_at: new Date(),
			deletion_job_id: jobId,
		});
		usersRepository.items.push(user);
		jobDispatcher.jobs.set(jobId, { userId: user.id });

		const result = await sut.execute({ userId: user.id });

		expect(result.deleted_at).toBeNull();
		expect(result.deletion_job_id).toBeNull();
		expect(jobDispatcher.jobs.has(jobId)).toBe(false);
	});

	it("throws USER_NOT_FOUND when user does not exist", async () => {
		const usersRepository = new InMemoryUsersRepository();
		const jobDispatcher = new InMemoryAccountDeletionJobDispatcher();
		const sut = new CancelAccountDeletionUseCase(
			usersRepository,
			jobDispatcher,
		);

		await expect(
			sut.execute({ userId: "non-existent-id" }),
		).rejects.toBeInstanceOf(UserNotFoundError);
	});

	it("throws ACCOUNT_NOT_SCHEDULED_FOR_DELETION when not scheduled", async () => {
		const usersRepository = new InMemoryUsersRepository();
		const jobDispatcher = new InMemoryAccountDeletionJobDispatcher();
		const sut = new CancelAccountDeletionUseCase(
			usersRepository,
			jobDispatcher,
		);

		const user = makeUser();
		usersRepository.items.push(user);

		await expect(sut.execute({ userId: user.id })).rejects.toBeInstanceOf(
			AccountNotScheduledForDeletionError,
		);
	});
});
