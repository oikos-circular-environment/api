import { createHash, timingSafeEqual } from "node:crypto";

export function hashClientKey(rawKey: string): string {
	return createHash("sha256").update(rawKey).digest("hex");
}

export function hashesMatch(a: string, b: string): boolean {
	const bufferA = Buffer.from(a, "hex");
	const bufferB = Buffer.from(b, "hex");

	if (bufferA.length !== bufferB.length) {
		return false;
	}

	return timingSafeEqual(bufferA, bufferB);
}
