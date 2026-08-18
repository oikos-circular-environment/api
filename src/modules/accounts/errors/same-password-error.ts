import { AppError } from "@/modules/common/errors/app-error.js";

export class SamePasswordError extends AppError {
	constructor() {
		super(
			"New password must be different from the current one.",
			"SAME_PASSWORD",
			422,
		);
	}
}
