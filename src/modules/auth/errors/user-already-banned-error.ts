import { AppError } from "@/modules/common/errors/app-error.js";

export class UserAlreadyBannedError extends AppError {
	constructor() {
		super("User is already banned", "USER_ALREADY_BANNED", 409);
	}
}
