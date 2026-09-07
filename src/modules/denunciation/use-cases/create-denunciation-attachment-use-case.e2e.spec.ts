import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { env } from "@/env/index.js";
import { prisma } from "@/lib/prisma.js";
import {
	JPEG_MAGIC_BYTES,
	PNG_MAGIC_BYTES,
} from "@/modules/common/test/image-fixtures.js";
import { createAuthenticatedTestUser } from "@/test/auth-test-helpers.js";

const clientKeyHeader = { "X-Client-Key": env.CLIENT_KEY_MOBILE ?? "" };

function makeEmail(prefix = "denunciation-attachment") {
	return `${prefix}-${randomUUID()}@test.local`;
}

async function signUpAndSignIn(email: string) {
	const { user, token } = await createAuthenticatedTestUser({ email });
	return { token, user: { id: user.id } };
}

type MultipartFileInput = {
	field?: string;
	fileName: string;
	mimeType: string;
	content: Buffer;
};

async function buildMultipartPayload(
	fields: Record<string, string>,
	files: MultipartFileInput[] = [],
): Promise<{ payload: Buffer; contentType: string }> {
	const form = new FormData();

	for (const [key, value] of Object.entries(fields)) {
		form.append(key, value);
	}

	for (const file of files) {
		form.append(
			file.field ?? "file",
			new Blob([new Uint8Array(file.content)], { type: file.mimeType }),
			file.fileName,
		);
	}

	const request = new Request("http://localhost", {
		method: "POST",
		body: form,
	});
	const arrayBuffer = await request.arrayBuffer();
	const contentType = request.headers.get("content-type");

	if (!contentType) {
		throw new Error(
			"Missing content-type header while building multipart payload",
		);
	}

	return { payload: Buffer.from(arrayBuffer), contentType };
}

describe("create-denunciation-attachment", () => {
	const createdUserIds: string[] = [];

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		await prisma.denunciation.deleteMany({});
		if (createdUserIds.length > 0) {
			await prisma.account.deleteMany({
				where: { user_id: { in: createdUserIds } },
			});
			await prisma.session.deleteMany({
				where: { user_id: { in: createdUserIds } },
			});
			await prisma.user.deleteMany({
				where: { id: { in: createdUserIds } },
			});
			createdUserIds.length = 0;
		}
		await prisma.verification.deleteMany({});
	});

	async function createDenunciation(token: string) {
		const res = await app.inject({
			method: "POST",
			url: "/v1/denunciations",
			headers: { ...clientKeyHeader, authorization: `Bearer ${token}` },
			payload: {
				title: "Fake profile",
				description: "This looks like a scam.",
				reporter_email: "reporter@example.com",
			},
		});
		expect(res.statusCode).toBe(200);
		return res.json<{ denunciation: { id: string } }>().denunciation;
	}

	it("200 — uploads an attachment to an open denunciation", async () => {
		const { token, user } = await signUpAndSignIn(makeEmail());
		createdUserIds.push(user.id);
		const denunciation = await createDenunciation(token);

		const { payload, contentType } = await buildMultipartPayload({}, [
			{ fileName: "1.jpg", mimeType: "image/jpeg", content: JPEG_MAGIC_BYTES },
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/denunciations/${denunciation.id}/attachments`,
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
				"content-type": contentType,
			},
			payload,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json<{ denunciation: { attachments: unknown[] } }>();
		expect(body.denunciation.attachments).toHaveLength(1);
	});

	it("400 — rejects more than one file in the same request", async () => {
		const { token, user } = await signUpAndSignIn(makeEmail());
		createdUserIds.push(user.id);
		const denunciation = await createDenunciation(token);

		const { payload, contentType } = await buildMultipartPayload({}, [
			{ fileName: "1.jpg", mimeType: "image/jpeg", content: JPEG_MAGIC_BYTES },
			{ fileName: "2.png", mimeType: "image/png", content: PNG_MAGIC_BYTES },
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/denunciations/${denunciation.id}/attachments`,
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
				"content-type": contentType,
			},
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("DENUNCIATION_TOO_MANY_FILES");
	});

	it("400 — rejects an invalid file type", async () => {
		const { token, user } = await signUpAndSignIn(makeEmail());
		createdUserIds.push(user.id);
		const denunciation = await createDenunciation(token);

		const { payload, contentType } = await buildMultipartPayload({}, [
			{
				fileName: "animation.gif",
				mimeType: "image/gif",
				content: Buffer.from("gif-content"),
			},
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/denunciations/${denunciation.id}/attachments`,
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
				"content-type": contentType,
			},
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("DENUNCIATION_ATTACHMENT_TYPE_INVALID");
	});

	it("400 — rejects a file exceeding the size limit", async () => {
		const { token, user } = await signUpAndSignIn(makeEmail());
		createdUserIds.push(user.id);
		const denunciation = await createDenunciation(token);

		const { payload, contentType } = await buildMultipartPayload({}, [
			{
				fileName: "huge.png",
				mimeType: "image/png",
				content: Buffer.alloc(10 * 1024 * 1024 + 1),
			},
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/denunciations/${denunciation.id}/attachments`,
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
				"content-type": contentType,
			},
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("DENUNCIATION_ATTACHMENT_TOO_LARGE");
	});

	it("400 — rejects metadata with an invalid shape", async () => {
		const { token, user } = await signUpAndSignIn(makeEmail());
		createdUserIds.push(user.id);
		const denunciation = await createDenunciation(token);

		const { payload, contentType } = await buildMultipartPayload(
			{ metadata: JSON.stringify(["not", "an", "object"]) },
			[
				{
					fileName: "1.jpg",
					mimeType: "image/jpeg",
					content: JPEG_MAGIC_BYTES,
				},
			],
		);

		const res = await app.inject({
			method: "POST",
			url: `/v1/denunciations/${denunciation.id}/attachments`,
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
				"content-type": contentType,
			},
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("DENUNCIATION_ATTACHMENT_METADATA_INVALID");
	});

	it("200 — persists a valid metadata object", async () => {
		const { token, user } = await signUpAndSignIn(makeEmail());
		createdUserIds.push(user.id);
		const denunciation = await createDenunciation(token);

		const { payload, contentType } = await buildMultipartPayload(
			{ metadata: JSON.stringify({ source: "mobile" }) },
			[
				{
					fileName: "1.jpg",
					mimeType: "image/jpeg",
					content: JPEG_MAGIC_BYTES,
				},
			],
		);

		const res = await app.inject({
			method: "POST",
			url: `/v1/denunciations/${denunciation.id}/attachments`,
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
				"content-type": contentType,
			},
			payload,
		});

		expect(res.statusCode).toBe(200);
		const body = res.json<{
			denunciation: { attachments: { metadata: unknown }[] };
		}>();
		expect(body.denunciation.attachments[0]?.metadata).toStrictEqual({
			source: "mobile",
		});
	});

	it("404 — rejects a denunciation owned by another user", async () => {
		const owner = await signUpAndSignIn(makeEmail("owner"));
		createdUserIds.push(owner.user.id);
		const denunciation = await createDenunciation(owner.token);

		const intruder = await signUpAndSignIn(makeEmail("intruder"));
		createdUserIds.push(intruder.user.id);

		const { payload, contentType } = await buildMultipartPayload({}, [
			{ fileName: "1.jpg", mimeType: "image/jpeg", content: JPEG_MAGIC_BYTES },
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/denunciations/${denunciation.id}/attachments`,
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${intruder.token}`,
				"content-type": contentType,
			},
			payload,
		});

		expect(res.statusCode).toBe(404);
		expect(res.json().code).toBe("DENUNCIATION_NOT_FOUND");
	});

	it("422 — rejects a denunciation that is not OPEN", async () => {
		const { token, user } = await signUpAndSignIn(makeEmail());
		createdUserIds.push(user.id);
		const denunciation = await createDenunciation(token);
		await prisma.denunciation.update({
			where: { id: denunciation.id },
			data: { status: "RESOLVED" },
		});

		const { payload, contentType } = await buildMultipartPayload({}, [
			{ fileName: "1.jpg", mimeType: "image/jpeg", content: JPEG_MAGIC_BYTES },
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/denunciations/${denunciation.id}/attachments`,
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
				"content-type": contentType,
			},
			payload,
		});

		expect(res.statusCode).toBe(422);
		expect(res.json().code).toBe("DENUNCIATION_ALREADY_MODERATED");
	});

	it("204 — deletes an attachment", async () => {
		const { token, user } = await signUpAndSignIn(makeEmail());
		createdUserIds.push(user.id);
		const denunciation = await createDenunciation(token);

		const { payload, contentType } = await buildMultipartPayload({}, [
			{ fileName: "1.jpg", mimeType: "image/jpeg", content: JPEG_MAGIC_BYTES },
		]);

		const uploadRes = await app.inject({
			method: "POST",
			url: `/v1/denunciations/${denunciation.id}/attachments`,
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
				"content-type": contentType,
			},
			payload,
		});
		const attachmentId = uploadRes.json<{
			denunciation: { attachments: { id: string }[] };
		}>().denunciation.attachments[0]?.id;

		const deleteRes = await app.inject({
			method: "DELETE",
			url: `/v1/denunciations/${denunciation.id}/attachments/${attachmentId}`,
			headers: { ...clientKeyHeader, authorization: `Bearer ${token}` },
		});

		expect(deleteRes.statusCode).toBe(204);
	});

	it("400 — rejects the sixth attachment on the same denunciation", async () => {
		const { token, user } = await signUpAndSignIn(makeEmail());
		createdUserIds.push(user.id);
		const denunciation = await createDenunciation(token);

		for (let i = 0; i < 5; i++) {
			const { payload, contentType } = await buildMultipartPayload({}, [
				{
					fileName: `${i}.jpg`,
					mimeType: "image/jpeg",
					content: JPEG_MAGIC_BYTES,
				},
			]);

			const res = await app.inject({
				method: "POST",
				url: `/v1/denunciations/${denunciation.id}/attachments`,
				headers: {
					...clientKeyHeader,
					authorization: `Bearer ${token}`,
					"content-type": contentType,
				},
				payload,
			});
			expect(res.statusCode).toBe(200);
		}

		const { payload, contentType } = await buildMultipartPayload({}, [
			{
				fileName: "one-too-many.jpg",
				mimeType: "image/jpeg",
				content: JPEG_MAGIC_BYTES,
			},
		]);

		const res = await app.inject({
			method: "POST",
			url: `/v1/denunciations/${denunciation.id}/attachments`,
			headers: {
				...clientKeyHeader,
				authorization: `Bearer ${token}`,
				"content-type": contentType,
			},
			payload,
		});

		expect(res.statusCode).toBe(400);
		expect(res.json().code).toBe("DENUNCIATION_TOO_MANY_ATTACHMENTS");
	});
});
