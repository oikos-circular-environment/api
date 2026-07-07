import { z } from "zod";

/**
 * Schema mínimo, escopado só ao que este pacote precisa — não reaproveita
 * `src/env/index.ts` (exige DATABASE_URL/JWT_SECRET/REDIS_URL/etc. que este
 * script isolado não usa; ver 01-technical-plan.md, decisão-chave #1).
 */
const envSchema = z.object({
	GOOGLE_PLACES_API_KEY: z
		.string()
		.min(1, "GOOGLE_PLACES_API_KEY é obrigatório"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error(
		"❌ Variáveis de ambiente inválidas para o gerador de seed:",
		z.treeifyError(parsed.error),
	);
	throw new Error("Invalid environment variables.");
}

export const env = parsed.data;
