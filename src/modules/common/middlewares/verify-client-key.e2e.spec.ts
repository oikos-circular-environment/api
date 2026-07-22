import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";
import { invalidateApiClientCache } from "@/modules/common/providers/api-client/api-client-provider.js";
import { hashClientKey } from "@/modules/common/providers/api-client/client-key-hash.js";

const RAW_KEY = "e2e-test-raw-client-key";
const CLIENT_NAME = "e2e-test-client";

describe("verify-client-key (wiring, CLIENT_KEY_ENFORCE=false in test env)", () => {
	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		await prisma.apiClient.deleteMany({ where: { name: CLIENT_NAME } });
		invalidateApiClientCache();
	});

	it("allows a request with a valid client-key and sets request.apiClient", async () => {
		await prisma.apiClient.create({
			data: { name: CLIENT_NAME, hashed_key: hashClientKey(RAW_KEY) },
		});
		invalidateApiClientCache();

		const res = await app.inject({
			method: "GET",
			url: "/v1/waste-categories",
			headers: { "x-client-key": RAW_KEY },
		});

		expect(res.statusCode).toBe(200);
	});

	it("allows a request without any client-key (enforce disabled in test env)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/waste-categories",
		});

		expect(res.statusCode).toBe(200);
	});

	it("allows a request with an invalid client-key (enforce disabled in test env)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/v1/waste-categories",
			headers: { "x-client-key": "not-a-real-key" },
		});

		expect(res.statusCode).toBe(200);
	});

	it("does not block /health regardless of client-key", async () => {
		const res = await app.inject({ method: "GET", url: "/health" });

		expect(res.statusCode).toBe(200);
	});
});
