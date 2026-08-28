import { AppError } from "@/modules/common/errors/app-error.js";

export class InvalidRoleError extends AppError {
	constructor() {
		super("Invalid role", "INVALID_ROLE", 400);
	}
}
