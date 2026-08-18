export const bearerAuthSecurity = [{ bearerAuth: [] }] as const;
export const bearerAndClientKeyAuthSecurity = [
	{ bearerAuth: [], clientKeyAuth: [] },
] as const;

export function withBearerAuth<T extends Record<string, unknown>>(
	schema: T,
): T & { security: typeof bearerAndClientKeyAuthSecurity } {
	return {
		...schema,
		security: bearerAndClientKeyAuthSecurity,
	};
}
