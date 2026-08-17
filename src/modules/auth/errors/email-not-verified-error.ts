import { AppError } from "@/modules/common/errors/app-error.js";

export class EmailNotVerifiedError extends AppError {
	constructor() {
		super("Email not verified", "EMAIL_NOT_VERIFIED", 403);
	}
}
