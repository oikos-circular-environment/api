import { AppError } from "@/modules/common/errors/app-error.js";

export class AuthProviderError extends AppError {
	constructor(
		message: string,
		code: string = "AUTH_PROVIDER_ERROR",
		statusCode: number = 400,
	) {
		super(message, code, statusCode);
	}
}
