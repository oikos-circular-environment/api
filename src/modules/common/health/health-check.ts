import z from "zod";
import { prisma } from "@/lib/prisma.js";
import { getRedisClient } from "@/lib/queue/redis.js";
import { makeStorageProvider } from "@/modules/common/providers/storage/make-storage-provider.js";

const CHECK_TIMEOUT_MS = 2000;

const checkResultSchema = z.object({
	status: z.enum(["up", "down", "disabled"]),
	latencyMs: z.number().optional(),
	error: z.string().optional(),
});

export const healthCheckResponseSchema = z.object({
	status: z.enum(["ok", "degraded"]),
	checks: z.object({
		database: checkResultSchema,
		redis: checkResultSchema,
		storage: checkResultSchema,
	}),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
type CheckResult = z.infer<typeof checkResultSchema>;

async function withTimeout(check: () => Promise<void>): Promise<CheckResult> {
	const start = Date.now();

	try {
		await Promise.race([
			check(),
			new Promise<never>((_, reject) => {
				setTimeout(
					() => reject(new Error("check timed out")),
					CHECK_TIMEOUT_MS,
				);
			}),
		]);

		return { status: "up", latencyMs: Date.now() - start };
	} catch (error) {
		return {
			status: "down",
			latencyMs: Date.now() - start,
			error: error instanceof Error ? error.message : "unknown error",
		};
	}
}

function checkDatabase(): Promise<CheckResult> {
	return withTimeout(async () => {
		await prisma.$queryRaw`SELECT 1`;
	});
}

async function checkRedis(): Promise<CheckResult> {
	if (!process.env.REDIS_URL) {
		return { status: "disabled" };
	}

	return withTimeout(async () => {
		await getRedisClient().ping();
	});
}

function checkStorage(): Promise<CheckResult> {
	return withTimeout(async () => {
		await makeStorageProvider().ping();
	});
}

export async function runHealthChecks(): Promise<HealthCheckResponse> {
	const [database, redis, storage] = await Promise.all([
		checkDatabase(),
		checkRedis(),
		checkStorage(),
	]);

	const status =
		database.status === "down" || storage.status === "down" ? "degraded" : "ok";

	return { status, checks: { database, redis, storage } };
}
