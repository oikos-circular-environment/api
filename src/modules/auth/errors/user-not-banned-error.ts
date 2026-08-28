import { AppError } from "@/modules/common/errors/app-error.js";

export class UserNotBannedError extends AppError {
	constructor() {
		super("User is not banned", "USER_NOT_BANNED", 409);
	}
}
