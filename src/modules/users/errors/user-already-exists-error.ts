import { AppError } from "@/modules/common/errors/app-error.js";

export class UserAlreadyExistsError extends AppError {
  constructor() {
    super("Email is already in use.", "USER_ALREADY_EXISTS", 409);
  }
}
