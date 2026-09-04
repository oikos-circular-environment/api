import { AppError } from "@/modules/common/errors/app-error.js";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

type SanitizeJsonInputOptions = {
	errorCode: string;
	maxDepth?: number;
	maxBytes?: number;
};

export function sanitizeJsonInput(
	value: unknown,
	{ errorCode, maxDepth = 5, maxBytes = 32 * 1024 }: SanitizeJsonInputOptions,
): unknown {
	if (value === undefined) return value;

	const serialized = JSON.stringify(value) ?? "";
	if (Buffer.byteLength(serialized, "utf8") > maxBytes) {
		throw new AppError(
			`Payload exceeds the maximum size of ${maxBytes} bytes`,
			errorCode,
			400,
		);
	}

	assertSafe(value, 0, maxDepth, errorCode);

	return value;
}

function assertSafe(
	value: unknown,
	depth: number,
	maxDepth: number,
	errorCode: string,
): void {
	if (depth > maxDepth) {
		throw new AppError(
			"Payload exceeds the maximum nesting depth",
			errorCode,
			400,
		);
	}

	if (Array.isArray(value)) {
		for (const item of value) assertSafe(item, depth + 1, maxDepth, errorCode);
		return;
	}

	if (value !== null && typeof value === "object") {
		for (const key of Object.keys(value as Record<string, unknown>)) {
			if (FORBIDDEN_KEYS.has(key)) {
				throw new AppError(
					`Payload key "${key}" is not allowed`,
					errorCode,
					400,
				);
			}
			assertSafe(
				(value as Record<string, unknown>)[key],
				depth + 1,
				maxDepth,
				errorCode,
			);
		}
	}
}
