export const bearerAuthSecurity = [{ bearerAuth: [] }] as const;

export function withBearerAuth<T extends Record<string, unknown>>(
  schema: T,
): T & { security: typeof bearerAuthSecurity } {
  return {
    ...schema,
    security: bearerAuthSecurity,
  };
}
