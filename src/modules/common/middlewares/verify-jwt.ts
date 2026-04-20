import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";
import type { AuthTokenPayload } from "../types/auth-token-payload.js";

function isValidAuthPayload(payload: unknown): payload is AuthTokenPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const parsed = payload as {
    sub?: unknown;
    user?: {
      id?: unknown;
    };
  };

  return (
    typeof parsed.sub === "string" &&
    parsed.sub.length > 0 &&
    typeof parsed.user?.id === "string" &&
    parsed.user.id.length > 0
  );
}

export async function verifyJwt(request: FastifyRequest) {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError("Unauthorized.", "UNAUTHORIZED", 401);
  }

  if (!isValidAuthPayload(request.user)) {
    throw new AppError("Invalid token payload", "INVALID_TOKEN_PAYLOAD", 401);
  }
}
