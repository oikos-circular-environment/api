import { Redis } from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
	if (!redisClient) {
		const url = process.env.REDIS_URL;
		if (!url) throw new Error("REDIS_URL env variable is not set");
		redisClient = new Redis(url, { maxRetriesPerRequest: null });
	}
	return redisClient;
}

export function getRedisUrl(): string {
	const url = process.env.REDIS_URL;
	if (!url) throw new Error("REDIS_URL env variable is not set");
	return url;
}
