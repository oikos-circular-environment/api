import type { User } from "@/modules/users/dtos/users-dto.js";
import { AccountAlreadyScheduledForDeletionError } from "@/modules/users/errors/account-already-scheduled-for-deletion-error.js";
import { UserNotFoundError } from "@/modules/users/errors/user-not-found-error.js";
import type { AccountDeletionJobDispatcher } from "@/modules/users/providers/queue/account-deletion-job-dispatcher.js";
import type { UsersRepository } from "@/modules/users/repositories/users-repository.js";

type RequestAccountDeletionUseCaseRequest = {
	userId: string;
};

export class RequestAccountDeletionUseCase {
	constructor(
		private readonly usersRepository: UsersRepository,
		private readonly jobDispatcher: AccountDeletionJobDispatcher,
	) {}

	async execute({ userId }: RequestAccountDeletionUseCaseRequest): Promise<User> {
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			throw new UserNotFoundError();
		}

		if (user.deleted_at) {
			throw new AccountAlreadyScheduledForDeletionError();
		}

		const jobId = await this.jobDispatcher.dispatchDeletionJob(userId);

		return this.usersRepository.markAsDeleted(userId, jobId);
	}
}
