import type { User } from "@/modules/accounts/dtos/accounts-dto.js";
import { AccountNotScheduledForDeletionError } from "@/modules/accounts/errors/account-not-scheduled-for-deletion-error.js";
import { UserNotFoundError } from "@/modules/accounts/errors/user-not-found-error.js";
import type { AccountDeletionJobDispatcher } from "@/modules/accounts/providers/queue/account-deletion-job-dispatcher.js";
import type { UsersRepository } from "@/modules/accounts/repositories/users-repository.js";

type CancelAccountDeletionUseCaseRequest = {
	userId: string;
};

export class CancelAccountDeletionUseCase {
	constructor(
		private readonly usersRepository: UsersRepository,
		private readonly jobDispatcher: AccountDeletionJobDispatcher,
	) {}

	async execute({
		userId,
	}: CancelAccountDeletionUseCaseRequest): Promise<User> {
		const user = await this.usersRepository.findById(userId);

		if (!user) {
			throw new UserNotFoundError();
		}

		if (!user.deleted_at) {
			throw new AccountNotScheduledForDeletionError();
		}

		if (user.deletion_job_id) {
			await this.jobDispatcher.cancelDeletionJob(user.deletion_job_id);
		}

		return this.usersRepository.cancelDeletion(userId);
	}
}
