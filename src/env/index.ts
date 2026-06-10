import { z } from "zod";

const envSchema = z
	.object({
		NODE_ENV: z.enum(["dev", "test", "production"]).default("dev"),
		PORT: z.coerce.number().default(3333),
		JWT_SECRET: z.string(),
		DATABASE_URL: z.string(),

		STORAGE_PROVIDER: z.enum(["minio", "supabase"]).default("minio"),
		APP_PUBLIC_URL: z.string().default("http://localhost:3333"),

		MINIO_ENDPOINT: z.string().optional(),
		MINIO_PORT: z.coerce.number().default(9000),
		MINIO_ACCESS_KEY: z.string().optional(),
		MINIO_SECRET_KEY: z.string().optional(),
		MINIO_BUCKET: z.string().default("oikos"),

		SUPABASE_URL: z.string().optional(),
		SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
		SUPABASE_SECRET_KEY: z.string().optional(),
		SUPABASE_OIKOS_PROFILES_BUCKET: z.string().optional(),

		REDIS_URL: z.string(),
	})
	.superRefine((data, ctx) => {
		if (data.STORAGE_PROVIDER === "minio") {
			if (!data.MINIO_ENDPOINT) {
				ctx.addIssue({
					code: "custom",
					message: "MINIO_ENDPOINT is required when STORAGE_PROVIDER=minio",
					path: ["MINIO_ENDPOINT"],
				});
			}
			if (!data.MINIO_ACCESS_KEY) {
				ctx.addIssue({
					code: "custom",
					message: "MINIO_ACCESS_KEY is required when STORAGE_PROVIDER=minio",
					path: ["MINIO_ACCESS_KEY"],
				});
			}
			if (!data.MINIO_SECRET_KEY) {
				ctx.addIssue({
					code: "custom",
					message: "MINIO_SECRET_KEY is required when STORAGE_PROVIDER=minio",
					path: ["MINIO_SECRET_KEY"],
				});
			}
		}

		if (data.STORAGE_PROVIDER === "supabase") {
			if (!data.SUPABASE_URL) {
				ctx.addIssue({
					code: "custom",
					message: "SUPABASE_URL is required when STORAGE_PROVIDER=supabase",
					path: ["SUPABASE_URL"],
				});
			}
			if (!data.SUPABASE_SECRET_KEY) {
				ctx.addIssue({
					code: "custom",
					message:
						"SUPABASE_SECRET_KEY is required when STORAGE_PROVIDER=supabase",
					path: ["SUPABASE_SECRET_KEY"],
				});
			}
			if (!data.SUPABASE_OIKOS_PROFILES_BUCKET) {
				ctx.addIssue({
					code: "custom",
					message:
						"SUPABASE_OIKOS_PROFILES_BUCKET is required when STORAGE_PROVIDER=supabase",
					path: ["SUPABASE_OIKOS_PROFILES_BUCKET"],
				});
			}
		}
	});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
	console.error("❌ Invalid environment variables", _env.error.format());

	throw new Error("Invalid environment variables.");
}

export const env = _env.data;

export function getMinioConfig(): {
	endpoint: string;
	port: number;
	accessKey: string;
	secretKey: string;
	bucket: string;
} {
	const { MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY } = env;
	if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
		throw new Error("Minio config unavailable. Ensure STORAGE_PROVIDER=minio");
	}
	return {
		endpoint: MINIO_ENDPOINT,
		port: env.MINIO_PORT,
		accessKey: MINIO_ACCESS_KEY,
		secretKey: MINIO_SECRET_KEY,
		bucket: env.MINIO_BUCKET,
	};
}

export function getSupabaseConfig(): {
	url: string;
	secretKey: string;
	publishableKey: string | undefined;
	bucket: string;
} {
	const { SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_OIKOS_PROFILES_BUCKET } =
		env;
	if (
		!SUPABASE_URL ||
		!SUPABASE_SECRET_KEY ||
		!SUPABASE_OIKOS_PROFILES_BUCKET
	) {
		throw new Error(
			"Supabase config unavailable. Ensure STORAGE_PROVIDER=supabase",
		);
	}
	return {
		url: SUPABASE_URL,
		secretKey: SUPABASE_SECRET_KEY,
		publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
		bucket: SUPABASE_OIKOS_PROFILES_BUCKET,
	};
}
