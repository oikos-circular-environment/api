import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/app.js";
import { prisma } from "@/lib/prisma.js";

describe("upsert-company-business-hours", () => {
	const createdUserIds: string[] = [];
	const createdCompanyIds: string[] = [];

	async function createUser(): Promise<{ id: string; email: string }> {
		const id = randomUUID();
		const email = `e2e-${id}@test.local`;
		await prisma.$executeRawUnsafe(
			`INSERT INTO users (id, email, password, created_at) VALUES ($1, $2, 'hashed', NOW())`,
			id,
			email,
		);
		createdUserIds.push(id);
		return { id, email };
	}

	function bearerToken(userId: string, email: string): string {
		return app.jwt.sign({ sub: userId, user: { id: userId, email } });
	}

	async function createCompanyViaHttp(userId: string, email: string, identity: string) {
		const res = await app.inject({
			method: "POST",
			url: "/v1/companies",
			headers: { authorization: `Bearer ${bearerToken(userId, email)}` },
			payload: {
				identity,
				identity_type: "CPF",
				company_type: "COMPANY",
				business_name: "Business Hours Co",
				corporate_name: "Business Hours LTDA",
				phones: ["11999999999"],
				started_activity_in: "2020-01-01T00:00:00.000Z",
				status: true,
			},
		});
		const body = res.json();
		createdCompanyIds.push(body.company.id);
		return body.company;
	}

	beforeAll(async () => {
		await app.ready();
	});

	afterAll(async () => {
		await app.close();
	});

	afterEach(async () => {
		if (createdCompanyIds.length > 0) {
			await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
			createdCompanyIds.length = 0;
		}
		if (createdUserIds.length > 0) {
			await prisma.$executeRawUnsafe(
				`DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(", ")})`,
				...createdUserIds,
			);
			createdUserIds.length = 0;
		}
	});

	it("200 — partial upsert returns 7 normalized days (SUNDAY to SATURDAY)", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(user.id, user.email, "11011011011");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/business-hours`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				business_hours: [
					{
						day_of_week: "MONDAY",
						is_open: true,
						time_slots: [{ start_time: "08:00", end_time: "18:00" }],
					},
				],
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.business_hours).toHaveLength(7);
		const days = body.business_hours.map((h: { day_of_week: string }) => h.day_of_week);
		expect(days[0]).toBe("SUNDAY");
		expect(days[6]).toBe("SATURDAY");
		const monday = body.business_hours.find(
			(h: { day_of_week: string }) => h.day_of_week === "MONDAY",
		);
		expect(monday.is_open).toBe(true);
		expect(monday.time_slots).toHaveLength(1);
	});

	it("200 — second call preserves days not in payload", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(user.id, user.email, "12012012012");

		await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/business-hours`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				business_hours: [
					{
						day_of_week: "MONDAY",
						is_open: true,
						time_slots: [{ start_time: "08:00", end_time: "18:00" }],
					},
				],
			},
		});

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/business-hours`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				business_hours: [
					{
						day_of_week: "FRIDAY",
						is_open: true,
						time_slots: [{ start_time: "09:00", end_time: "17:00" }],
					},
				],
			},
		});

		expect(res.statusCode).toBe(200);
		const body = res.json();
		const monday = body.business_hours.find(
			(h: { day_of_week: string }) => h.day_of_week === "MONDAY",
		);
		const friday = body.business_hours.find(
			(h: { day_of_week: string }) => h.day_of_week === "FRIDAY",
		);
		expect(monday.is_open).toBe(true);
		expect(friday.is_open).toBe(true);
	});

	it("400 — duplicate day_of_week in payload", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(user.id, user.email, "13013013013");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/business-hours`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				business_hours: [
					{
						day_of_week: "MONDAY",
						is_open: true,
						time_slots: [{ start_time: "08:00", end_time: "18:00" }],
					},
					{
						day_of_week: "MONDAY",
						is_open: false,
						time_slots: [],
					},
				],
			},
		});

		expect(res.statusCode).toBe(400);
	});

	it("400 — is_open: true with empty time_slots", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(user.id, user.email, "14014014014");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/business-hours`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				business_hours: [
					{
						day_of_week: "TUESDAY",
						is_open: true,
						time_slots: [],
					},
				],
			},
		});

		expect(res.statusCode).toBe(400);
	});

	it("400 — start_time >= end_time", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(user.id, user.email, "15015015015");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/business-hours`,
			headers: { authorization: `Bearer ${bearerToken(user.id, user.email)}` },
			payload: {
				business_hours: [
					{
						day_of_week: "WEDNESDAY",
						is_open: true,
						time_slots: [{ start_time: "18:00", end_time: "08:00" }],
					},
				],
			},
		});

		expect(res.statusCode).toBe(400);
	});

	it("404 — company belongs to another user", async () => {
		const owner = await createUser();
		const other = await createUser();
		const company = await createCompanyViaHttp(owner.id, owner.email, "16016016016");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/business-hours`,
			headers: { authorization: `Bearer ${bearerToken(other.id, other.email)}` },
			payload: {
				business_hours: [
					{
						day_of_week: "MONDAY",
						is_open: true,
						time_slots: [{ start_time: "08:00", end_time: "18:00" }],
					},
				],
			},
		});

		expect(res.statusCode).toBe(404);
	});

	it("401 — missing authorization token", async () => {
		const user = await createUser();
		const company = await createCompanyViaHttp(user.id, user.email, "17017017017");

		const res = await app.inject({
			method: "PUT",
			url: `/v1/companies/${company.id}/business-hours`,
			payload: {
				business_hours: [
					{
						day_of_week: "MONDAY",
						is_open: true,
						time_slots: [{ start_time: "08:00", end_time: "18:00" }],
					},
				],
			},
		});

		expect(res.statusCode).toBe(401);
	});
});
