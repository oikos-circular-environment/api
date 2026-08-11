import { AppError } from "@/modules/common/errors/app-error.js";

export class WeakPasswordError extends AppError {
	constructor() {
		super("Password must be at least 6 characters long", "WEAK_PASSWORD", 400);
	}
}
