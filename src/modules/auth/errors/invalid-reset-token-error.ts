import { AppError } from "@/modules/common/errors/app-error.js";

export class InvalidResetTokenError extends AppError {
	constructor() {
		super("Invalid or expired reset token", "INVALID_RESET_TOKEN", 400);
	}
}
