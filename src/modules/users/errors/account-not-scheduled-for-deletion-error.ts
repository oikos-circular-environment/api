import { AppError } from "@/modules/common/errors/app-error.js";

export class AccountNotScheduledForDeletionError extends AppError {
	constructor() {
		super(
			"Account is not scheduled for deletion.",
			"ACCOUNT_NOT_SCHEDULED_FOR_DELETION",
			422,
		);
	}
}
