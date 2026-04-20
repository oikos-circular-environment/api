import { AppError } from "@/modules/common/errors/app-error.js";

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid credentials", "INVALID_CREDENTIALS", 401);
  }
}
