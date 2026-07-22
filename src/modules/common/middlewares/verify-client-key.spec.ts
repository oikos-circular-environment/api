import type { FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../errors/app-error.js";
import type { ApiClientRecord } from "../providers/api-client/api-client-provider.js";
import { createVerifyClientKey } from "./verify-client-key.js";

function makeRequest(headers: Record<string, string> = {}): FastifyRequest {
	return {
		headers,
		url: "/v1/market",
		log: { warn: vi.fn() },
	} as unknown as FastifyRequest;
}

const validClient: ApiClientRecord = {
	id: "client-1",
	name: "mobile",
	rateLimit: null,
};

describe("verify-client-key", () => {
	it("passes and sets request.apiClient when the key is valid", async () => {
		const lookup = vi.fn().mockResolvedValue(validClient);
		const verifyClientKey = createVerifyClientKey({ enforce: true, lookup });
		const request = makeRequest({ "x-client-key": "valid-raw-key" });

		await verifyClientKey(request);

		expect(lookup).toHaveBeenCalledWith("valid-raw-key");
		expect(request.apiClient).toEqual(validClient);
	});

	it("throws 401 when enforcing and the key is missing", async () => {
		const lookup = vi.fn().mockResolvedValue(null);
		const verifyClientKey = createVerifyClientKey({ enforce: true, lookup });
		const request = makeRequest();

		await expect(verifyClientKey(request)).rejects.toThrow(AppError);
		await expect(verifyClientKey(request)).rejects.toMatchObject({
			code: "INVALID_CLIENT_KEY",
			statusCode: 401,
		});
	});

	it("throws 401 when enforcing and the key is invalid", async () => {
		const lookup = vi.fn().mockResolvedValue(null);
		const verifyClientKey = createVerifyClientKey({ enforce: true, lookup });
		const request = makeRequest({ "x-client-key": "garbage" });

		await expect(verifyClientKey(request)).rejects.toThrow(AppError);
	});

	it("does not throw when enforce is disabled, but logs the violation", async () => {
		const lookup = vi.fn().mockResolvedValue(null);
		const verifyClientKey = createVerifyClientKey({ enforce: false, lookup });
		const request = makeRequest();

		await expect(verifyClientKey(request)).resolves.toBeUndefined();
		expect(request.log.warn).toHaveBeenCalledOnce();
	});

	it("does not call the log warning when enforce is disabled but the key is valid", async () => {
		const lookup = vi.fn().mockResolvedValue(validClient);
		const verifyClientKey = createVerifyClientKey({ enforce: false, lookup });
		const request = makeRequest({ "x-client-key": "valid-raw-key" });

		await verifyClientKey(request);

		expect(request.apiClient).toEqual(validClient);
		expect(request.log.warn).not.toHaveBeenCalled();
	});
});
