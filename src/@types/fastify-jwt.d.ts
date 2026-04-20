import "@fastify/jwt";
import type { AuthTokenPayload } from "@/modules/common/types/auth-token-payload.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: AuthTokenPayload;
  }
}
