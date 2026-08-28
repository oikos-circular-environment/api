import { AppError } from "@/modules/common/errors/app-error.js";

export class AccountAlreadyScheduledForDeletionError extends AppError {
	constructor() {
		super(
			"Account is already scheduled for deletion.",
			"ACCOUNT_ALREADY_SCHEDULED_FOR_DELETION",
			409,
		);
	}
}
