import { describe, expect, it } from "vitest";
import { AccountAlreadyScheduledForDeletionError } from "@/modules/accounts/errors/account-already-scheduled-for-deletion-error.js";
import { UserNotFoundError } from "@/modules/accounts/errors/user-not-found-error.js";
import { makeUser } from "@/modules/accounts/factories/make-user.js";
import { InMemoryAccountDeletionJobDispatcher } from "@/modules/accounts/providers/queue/in-memory/in-memory-account-deletion-job-dispatcher.js";
import { InMemoryUsersRepository } from "@/modules/accounts/repositories/in-memory/in-memory-users-repositories.js";
import { RequestAccountDeletionUseCase } from "./request-account-deletion-use-case.js";

describe("request-account-deletion-use-case", () => {
	it("schedules deletion for existing user", async () => {
		const usersRepository = new InMemoryUsersRepository();
		const jobDispatcher = new InMemoryAccountDeletionJobDispatcher();
		const sut = new RequestAccountDeletionUseCase(
			usersRepository,
			jobDispatcher,
		);

		const user = makeUser();
		usersRepository.items.push(user);

		const result = await sut.execute({ userId: user.id });

		expect(result.deleted_at).toBeInstanceOf(Date);
		expect(result.deletion_job_id).toBe(`account-deletion-${user.id}`);
		expect(jobDispatcher.jobs.has(`account-deletion-${user.id}`)).toBe(true);
	});

	it("throws USER_NOT_FOUND when user does not exist", async () => {
		const usersRepository = new InMemoryUsersRepository();
		const jobDispatcher = new InMemoryAccountDeletionJobDispatcher();
		const sut = new RequestAccountDeletionUseCase(
			usersRepository,
			jobDispatcher,
		);

		await expect(
			sut.execute({ userId: "non-existent-id" }),
		).rejects.toBeInstanceOf(UserNotFoundError);
	});

	it("throws ACCOUNT_ALREADY_SCHEDULED_FOR_DELETION when already scheduled", async () => {
		const usersRepository = new InMemoryUsersRepository();
		const jobDispatcher = new InMemoryAccountDeletionJobDispatcher();
		const sut = new RequestAccountDeletionUseCase(
			usersRepository,
			jobDispatcher,
		);

		const user = makeUser({ deleted_at: new Date(), deletion_job_id: "job-1" });
		usersRepository.items.push(user);

		await expect(sut.execute({ userId: user.id })).rejects.toBeInstanceOf(
			AccountAlreadyScheduledForDeletionError,
		);
	});
});
