import { AppError } from "@/modules/common/errors/app-error.js";

export class UserAlreadyExistsError extends AppError {
	constructor() {
		super("User already exists", "USER_ALREADY_EXISTS", 409);
	}
}
