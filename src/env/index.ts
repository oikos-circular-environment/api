import { z } from "zod";

const envSchema = z
	.object({
		NODE_ENV: z.enum(["dev", "test", "production"]).default("dev"),
		PORT: z.coerce.number().default(3333),
		LOG_LEVEL: z
			.enum(["trace", "debug", "info", "warn", "error", "fatal"])
			.default("info"),
		PRISMA_QUERY_LOG: z.coerce.boolean().default(false),
		JWT_SECRET: z.string(),
		DATABASE_URL: z.string(),

		STORAGE_PROVIDER: z.enum(["minio", "supabase"]).default("minio"),
		APP_PUBLIC_URL: z.string().default("http://localhost:3333"),
		WEB_APP_URL: z.string().default("http://localhost:3000"),

		BETTER_AUTH_SECRET: z.string(),
		BETTER_AUTH_URL: z.string().optional(),
		BETTER_AUTH_TRUSTED_ORIGINS: z
			.string()
			.optional()
			.transform((value) =>
				value
					? value
							.split(",")
							.map((origin) => origin.trim())
							.filter(Boolean)
					: undefined,
			),
		EMAIL_PROVIDER: z
			.enum(["console", "in-memory", "resend"])
			.default("console"),
		RESEND_API_KEY: z.string().optional(),
		RESEND_FROM_EMAIL: z.string().optional(),
		REQUIRE_EMAIL_VERIFICATION: z
			.string()
			.optional()
			.transform((value) => value?.toLowerCase() === "true"),

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

		QUORUM_JOB_DELAY_MS: z.coerce.number().default(24 * 60 * 60 * 1000),
		ACCOUNT_DELETION_DELAY_MS: z.coerce
			.number()
			.default(90 * 24 * 60 * 60 * 1000),
		WORKER_CONCURRENCY: z.coerce.number().default(5),

		GOOGLE_ACCOUNT_EMAIL: z.email().optional(),
		GOOGLE_ACCOUNT_PASSWORD: z.string().optional(),

		APPLE_ACCOUNT_EMAIL: z.email().optional(),
		APPLE_ACCOUNT_PASSWORD: z.string().optional(),

		ADMIN_USERNAME: z.string(),
		ADMIN_PASSWORD: z.string(),

		CLIENT_KEY_MOBILE: z.string().optional(),
		CLIENT_KEY_WEB: z.string().optional(),

		CLIENT_KEY_ENFORCE: z
			.string()
			.optional()
			.transform((value) => value?.toLowerCase() !== "false"),

		CORS_ALLOWED_ORIGINS: z.string().optional(),

		OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(
			(v) => (v === "" ? undefined : v),
			z.string().url().optional(),
		),
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

		if (data.EMAIL_PROVIDER === "resend") {
			if (!data.RESEND_API_KEY) {
				ctx.addIssue({
					code: "custom",
					message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend",
					path: ["RESEND_API_KEY"],
				});
			}
			if (!data.RESEND_FROM_EMAIL) {
				ctx.addIssue({
					code: "custom",
					message: "RESEND_FROM_EMAIL is required when EMAIL_PROVIDER=resend",
					path: ["RESEND_FROM_EMAIL"],
				});
			}
		}

		if (data.NODE_ENV === "production") {
			if (data.WEB_APP_URL.includes("localhost")) {
				ctx.addIssue({
					code: "custom",
					message: "WEB_APP_URL must not be localhost when NODE_ENV=production",
					path: ["WEB_APP_URL"],
				});
			}
			if (data.APP_PUBLIC_URL.includes("localhost")) {
				ctx.addIssue({
					code: "custom",
					message:
						"APP_PUBLIC_URL must not be localhost when NODE_ENV=production",
					path: ["APP_PUBLIC_URL"],
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

const LOCAL_ORIGIN_PATTERN =
	/^https?:\/\/(localhost|local-oikos|local-api)(:\d+)?$/;

export function getCorsAllowedOrigins(): (string | RegExp)[] {
	const configured =
		env.CORS_ALLOWED_ORIGINS?.split(",")
			.map((origin) => origin.trim())
			.filter(Boolean) ?? [];

	if (env.NODE_ENV === "production") {
		return configured;
	}

	return [...configured, LOCAL_ORIGIN_PATTERN];
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

export function getResendConfig(): {
	apiKey: string;
	fromEmail: string;
} {
	const { RESEND_API_KEY, RESEND_FROM_EMAIL } = env;
	if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
		throw new Error("Resend config unavailable. Ensure EMAIL_PROVIDER=resend");
	}
	return { apiKey: RESEND_API_KEY, fromEmail: RESEND_FROM_EMAIL };
}
