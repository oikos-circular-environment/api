import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

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

const CENTER_LAT = -16.485534;
const CENTER_LON = -54.601863;

// ~111m north of center (inside 500m radius)
const NEAR_LAT = CENTER_LAT + 0.001;
// ~11km north of center (outside 500m radius)
const FAR_LAT = CENTER_LAT + 0.1;

async function createUser(): Promise<{ userId: string; token: string }> {
	const userId = randomUUID();
	const email = `map-route-test-${userId}@integration.test`;
	await prisma.$executeRawUnsafe(
		`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
		userId,
		email,
	);
	const token = app.jwt.sign({ sub: userId, user: { id: userId, email } });
	return { userId, token };
}

const insertedComplaintIds: string[] = [];
const insertedUserIds: string[] = [];

async function insertComplaintAt(
	lat: number,
	lon: number,
	type = "BURNING",
	status = "OPEN",
): Promise<string> {
	const userId = randomUUID();
	const id = randomUUID();
	const email = `loc-test-${userId}@integration.test`;

	await prisma.$executeRawUnsafe(
		`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
		userId,
		email,
	);

	await prisma.$executeRawUnsafe(
		`INSERT INTO complaints (id, user_id, status, type, complaint_method, created_at, location)
     VALUES ($1, $2, $3, $4, 'AUTOMATIC', NOW(),
             ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)`,
		id,
		userId,
		status,
		type,
		lon,
		lat,
	);

	insertedComplaintIds.push(id);
	insertedUserIds.push(userId);
	return id;
}

describe("GET /v1/complaints/map", () => {
	beforeAll(async () => {
		await app.ready();
	});

	afterEach(async () => {
		if (insertedComplaintIds.length > 0) {
			await prisma.complaint.deleteMany({
				where: { id: { in: [...insertedComplaintIds] } },
			});
			insertedComplaintIds.length = 0;
		}
		if (insertedUserIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${insertedUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...insertedUserIds,
			);
			insertedUserIds.length = 0;
		}
	});

	it("retorna 401 sem token de autenticação", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}&lon=${CENTER_LON}`,
		});

		expect(response.statusCode).toBe(401);
	});

	it("retorna 400 quando lat está ausente", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lon=${CENTER_LON}`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(400);
	});

	it("retorna 400 quando lon está ausente", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(400);
	});

	it("retorna 400 para status inválido", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}&lon=${CENTER_LON}&status=INVALID_STATUS`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(400);
	});

	it("retorna 400 para type inválido", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}&lon=${CENTER_LON}&type=UNKNOWN`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(400);
	});

	it("retorna lista vazia quando não há complaints no raio", async () => {
		const { token } = await createUser();

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}&lon=${CENTER_LON}&radius=100`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaints: unknown[] }>();
		expect(body.complaints).toHaveLength(0);
	});

	it("retorna complaints dentro do raio com status OPEN por padrão", async () => {
		const { token } = await createUser();

		await insertComplaintAt(CENTER_LAT, CENTER_LON, "BURNING", "OPEN");
		await insertComplaintAt(NEAR_LAT, CENTER_LON, "BURNING", "OPEN");
		await insertComplaintAt(FAR_LAT, CENTER_LON, "BURNING", "OPEN");

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}&lon=${CENTER_LON}&radius=500`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaints: Array<{ status: string }> }>();
		expect(body.complaints.length).toBe(2);
		expect(body.complaints.every((c) => c.status === "OPEN")).toBe(true);
	});

	it("exclui complaints fora do raio", async () => {
		const { token } = await createUser();

		await insertComplaintAt(FAR_LAT, CENTER_LON, "BURNING", "OPEN");

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}&lon=${CENTER_LON}&radius=500`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaints: unknown[] }>();
		expect(body.complaints).toHaveLength(0);
	});

	it("filtra por status único — retorna apenas RESOLVED", async () => {
		const { token } = await createUser();

		await insertComplaintAt(CENTER_LAT, CENTER_LON, "BURNING", "OPEN");
		await insertComplaintAt(NEAR_LAT, CENTER_LON, "BURNING", "RESOLVED");

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}&lon=${CENTER_LON}&radius=500&status=RESOLVED`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaints: Array<{ status: string }> }>();
		expect(body.complaints).toHaveLength(1);
		expect(body.complaints[0]?.status).toBe("RESOLVED");
	});

	it("filtra por type corretamente", async () => {
		const { token } = await createUser();

		await insertComplaintAt(CENTER_LAT, CENTER_LON, "BURNING", "OPEN");
		await insertComplaintAt(NEAR_LAT, CENTER_LON, "DEFORESTATION", "OPEN");

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}&lon=${CENTER_LON}&radius=500&type=BURNING`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaints: Array<{ type: string }> }>();
		expect(body.complaints).toHaveLength(1);
		expect(body.complaints[0]?.type).toBe("BURNING");
	});

	it("retorna shape correto em cada item da listagem", async () => {
		const { token } = await createUser();

		await insertComplaintAt(CENTER_LAT, CENTER_LON, "IRREGULAR_DISPOSAL", "OPEN");

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}&lon=${CENTER_LON}&radius=500`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaints: Array<Record<string, unknown>> }>();
		expect(body.complaints).toHaveLength(1);
		const item = body.complaints[0];
		expect(item).toMatchObject({
			id: expect.any(String),
			type: "IRREGULAR_DISPOSAL",
			status: "OPEN",
			complaint_method: "AUTOMATIC",
			vote_counts: {
				resolved: expect.any(Number),
				not_resolved: expect.any(Number),
			},
			resolution_count: expect.any(Number),
		});
		expect(Array.isArray(item?.captures)).toBe(true);
	});

	it("usa raio padrão de 1000m quando radius não é informado", async () => {
		const { token } = await createUser();

		// ~111m do centro — dentro do raio padrão de 1000m
		await insertComplaintAt(NEAR_LAT, CENTER_LON, "BURNING", "OPEN");

		const response = await app.inject({
			method: "GET",
			url: `/v1/complaints/map?lat=${CENTER_LAT}&lon=${CENTER_LON}`,
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json<{ complaints: unknown[] }>();
		expect(body.complaints.length).toBeGreaterThanOrEqual(1);
	});
});
