import { AppError } from "@/modules/common/errors/app-error.js";

export class UserNotFoundError extends AppError {
	constructor() {
		super("User not found.", "USER_NOT_FOUND", 404);
	}
}
