import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

vi.mock("@/modules/complaints/providers/bullmq-job-dispatcher.js", () => ({
	BullMQJobDispatcher: class {
		async dispatchGroupingJob() {}
		async dispatchQuorumJob() {}
	},
}));

vi.mock(
	"@/modules/common/providers/storage/supabase/supabase-bucket.js",
	() => ({
		SupabaseBucket: class {
			async uploadFile(filePath: string) {
				return { id: randomUUID(), fullPath: filePath, path: filePath };
			}
			async getFileUrl(filePath: string) {
				return { url: `https://storage.test/${filePath}` };
			}
			async deleteFile() {}
			async checkFileExists() {
				return false;
			}
			async convertFileToBase64() {
				return "";
			}
		},
	}),
);

const geospatial = {
	heading: { trueHeading: 45.0, magHeading: 45.0, accuracy: 5.0 },
	location: {
		coords: {
			latitude: -23.5505,
			longitude: -46.6333,
			altitude: null,
			accuracy: null,
			altitudeAccuracy: null,
			heading: null,
			speed: null,
		},
		timestamp: 1711111111111,
	},
	addresses: {
		city: "São Paulo",
		district: "Centro",
		streetNumber: "100",
		street: "Rua das Flores",
		postalCode: "01000-000",
		region: "SP",
		subregion: null,
		country: "Brasil",
		name: null,
		isoCountryCode: "BR",
		timezone: "America/Sao_Paulo",
	},
};

const geospatialManual = {
	heading: null,
	location: {
		coords: {
			latitude: -23.5505,
			longitude: -46.6333,
			altitude: null,
			accuracy: null,
			altitudeAccuracy: null,
			heading: null,
			speed: null,
		},
		timestamp: 1711111111111,
	},
	addresses: {
		city: "São Paulo",
		district: "Centro",
		streetNumber: "100",
		street: "Rua das Flores",
		postalCode: "01000-000",
		region: "SP",
		subregion: null,
		country: "Brasil",
		name: null,
		isoCountryCode: "BR",
		timezone: "America/Sao_Paulo",
	},
};

async function createUser(): Promise<{ userId: string; token: string }> {
	const userId = randomUUID();
	const email = `route-test-${userId}@integration.test`;
	await prisma.$executeRawUnsafe(
		`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
		userId,
		email,
	);
	const token = app.jwt.sign({ sub: userId, user: { id: userId, email } });
	return { userId, token };
}

describe("POST /v1/complaints — criação automática", () => {
	beforeAll(async () => {
		await app.ready();
	});

	it("retorna 200 e cria complaint com método AUTOMATIC e status OPEN", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints",
			headers: { Authorization: `Bearer ${token}` },
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				type: "BURNING",
				observations: "Queimada identificada na área",
				geospatial,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaint: Record<string, unknown> }>();
		expect(body.complaint.status).toBe("OPEN");
		expect(body.complaint.complaint_method).toBe("AUTOMATIC");
		expect(body.complaint.captures).toHaveLength(1);
		expect(body.complaint.id).toBeTruthy();
	});

	it("persiste a capture com os dados geoespaciais corretos", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints",
			headers: { Authorization: `Bearer ${token}` },
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				type: "DEFORESTATION",
				observations: null,
				geospatial,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaint: Record<string, unknown> }>();
		const captures = body.complaint.captures as Array<Record<string, unknown>>;
		const geo = captures[0]?.geospatial as Record<string, unknown>;
		const addresses = geo?.addresses as Record<string, unknown>;
		expect(addresses?.city).toBe("São Paulo");
		expect(addresses?.district).toBe("Centro");
	});

	it("retorna 401 sem token de autenticação", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints",
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				type: "BURNING",
				geospatial,
			},
		});

		expect(response.statusCode).toBe(401);
	});

	it("retorna 400 quando o campo type está ausente", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints",
			headers: { Authorization: `Bearer ${token}` },
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				geospatial,
			},
		});

		expect(response.statusCode).toBe(400);
	});

	it("retorna 400 quando geospatial está ausente", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints",
			headers: { Authorization: `Bearer ${token}` },
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				type: "BURNING",
			},
		});

		expect(response.statusCode).toBe(400);
	});
});

describe("POST /v1/complaints/manual — criação manual", () => {
	beforeAll(async () => {
		await app.ready();
	});

	it("retorna 200 e cria complaint com método MANUAL e status OPEN", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints/manual",
			headers: { Authorization: `Bearer ${token}` },
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				type: "IRREGULAR_DISPOSAL",
				observations: "Descarte irregular próximo à escola",
				geospatial: geospatialManual,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaint: Record<string, unknown> }>();
		expect(body.complaint.status).toBe("OPEN");
		expect(body.complaint.complaint_method).toBe("MANUAL");
		expect(body.complaint.captures).toHaveLength(1);
	});

	it("persiste heading como null na capture", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints/manual",
			headers: { Authorization: `Bearer ${token}` },
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				type: "VACANT_LOT",
				observations: null,
				geospatial: geospatialManual,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaint: Record<string, unknown> }>();
		const captures = body.complaint.captures as Array<Record<string, unknown>>;
		const geo = captures[0]?.geospatial as Record<string, unknown>;
		expect(geo?.heading).toBeNull();
	});

	it("retorna 401 sem token de autenticação", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints/manual",
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				type: "IRREGULAR_DISPOSAL",
				geospatial: geospatialManual,
			},
		});

		expect(response.statusCode).toBe(401);
	});

	it("retorna 400 quando heading não é null (inválido para manual)", async () => {
		const { token } = await createUser();

		const geospatialInvalido = {
			...geospatialManual,
			heading: { trueHeading: 45, magHeading: 45, accuracy: 5 },
		};

		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints/manual",
			headers: { Authorization: `Bearer ${token}` },
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				type: "IRREGULAR_DISPOSAL",
				geospatial: geospatialInvalido,
			},
		});

		expect(response.statusCode).toBe(400);
	});

	it("retorna 400 quando campos obrigatórios do endereço estão ausentes", async () => {
		const { token } = await createUser();

		const geospatialSemEndereco = {
			...geospatialManual,
			addresses: { ...geospatialManual.addresses, city: "" },
		};

		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints/manual",
			headers: { Authorization: `Bearer ${token}` },
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				type: "IRREGULAR_DISPOSAL",
				geospatial: geospatialSemEndereco,
			},
		});

		expect(response.statusCode).toBe(400);
	});
});

function buildMultipartBody(
	field: string,
	filename: string,
	content: Buffer,
	mimeType: string,
): { body: Buffer; boundary: string } {
	const boundary = "----TestFormBoundary7MA4YWxkTrZu0gW";
	const body = Buffer.concat([
		Buffer.from(
			`--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
		),
		content,
		Buffer.from(`\r\n--${boundary}--\r\n`),
	]);
	return { body, boundary };
}

describe("POST /v1/complaints/:id/captures/:captureId/attachments — upload de imagem", () => {
	beforeAll(async () => {
		await app.ready();
	});

	async function createComplaint(
		token: string,
	): Promise<{ id: string; captureId: string }> {
		const response = await app.inject({
			method: "POST",
			url: "/v1/complaints",
			headers: { Authorization: `Bearer ${token}` },
			payload: {
				date: "2026-05-20T10:00:00.000Z",
				type: "BURNING",
				observations: null,
				geospatial,
			},
		});
		const body = response.json<{
			complaint: { id: string; captures: Array<{ id: string }> };
		}>();
		return {
			id: body.complaint.id,
			captureId: (body.complaint.captures[0] as { id: string }).id,
		};
	}

	it("retorna 200 e anexa imagem à capture", async () => {
		const { token } = await createUser();
		const { id: complaintId, captureId } = await createComplaint(token);

		const imageContent = readFileSync(
			join(__dirname, "../../assets/dog-win-xp.jpeg"),
		);
		const { body, boundary } = buildMultipartBody(
			"file",
			"dog-win-xp.jpeg",
			imageContent,
			"image/jpeg",
		);

		const response = await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/captures/${captureId}/attachments`,
			headers: {
				Authorization: `Bearer ${token}`,
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			body,
		});

		expect(response.statusCode).toBe(200);
		const result = response.json<{
			complaint: { captures: Array<{ attachments: unknown[] }> };
		}>();
		expect(result.complaint.captures[0]?.attachments).toHaveLength(1);
	});

	it("retorna 401 sem token", async () => {
		const { body, boundary } = buildMultipartBody(
			"file",
			"dog-win-xp.jpeg",
			Buffer.from("fake"),
			"image/jpeg",
		);

		const response = await app.inject({
			method: "POST",
			url: `/v1/complaints/${randomUUID()}/captures/${randomUUID()}/attachments`,
			headers: {
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			body,
		});

		expect(response.statusCode).toBe(401);
	});

	it("retorna 404 quando a capture não existe", async () => {
		const { token } = await createUser();
		const { id: complaintId } = await createComplaint(token);

		const imageContent = readFileSync(
			join(__dirname, "../../assets/dog-win-xp.jpeg"),
		);
		const { body, boundary } = buildMultipartBody(
			"file",
			"dog-win-xp.jpeg",
			imageContent,
			"image/jpeg",
		);

		const response = await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/captures/${randomUUID()}/attachments`,
			headers: {
				Authorization: `Bearer ${token}`,
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			body,
		});

		expect(response.statusCode).toBe(404);
	});

	it("retorna 400 para tipo de arquivo não suportado", async () => {
		const { token } = await createUser();
		const { id: complaintId, captureId } = await createComplaint(token);

		const { body, boundary } = buildMultipartBody(
			"file",
			"arquivo.pdf",
			Buffer.from("%PDF fake content"),
			"application/pdf",
		);

		const response = await app.inject({
			method: "POST",
			url: `/v1/complaints/${complaintId}/captures/${captureId}/attachments`,
			headers: {
				Authorization: `Bearer ${token}`,
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			body,
		});

		expect(response.statusCode).toBe(400);
	});
});
