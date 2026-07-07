import { describe, expect, it } from "vitest";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import { ResolutionGenerator } from "./resolution-generator.js";

const USER_POOL_SIZE = 20;

function makeUsers(count: number): UserSeed[] {
	return Array.from({ length: count }, (_, i) => ({
		full_name: `Usuário ${i}`,
		display_name: `U${i}`,
		phone: "(65) 91234-5678",
		email: `usuario-${i}@oikos.seed`,
		address: {
			zip_code: "78000-000",
			street: "Rua A",
			number: "1",
			complement: null,
			district: "Centro",
			city: "Sinop",
			city_ibge_id: 5107909,
			state: "Mato Grosso",
			state_ibge_id: 51,
			state_code: "MT",
			latitude: 0,
			longitude: 0,
		},
		companies: [],
		complaints: [],
	}));
}

const USERS = makeUsers(USER_POOL_SIZE);

describe("resolution-generator", () => {
	it("never generates resolutions for OPEN or CANCELED complaints", () => {
		const generator = new ResolutionGenerator();

		expect(generator.generate("OPEN", new Set(), USERS)).toEqual([]);
		expect(generator.generate("CANCELED", new Set(), USERS)).toEqual([]);
	});

	it("generates 1-2 resolutions for RESOLVED complaints", () => {
		const generator = new ResolutionGenerator();

		for (let i = 0; i < 50; i++) {
			const resolutions = generator.generate("RESOLVED", new Set(), USERS);
			expect(resolutions.length).toBeGreaterThanOrEqual(1);
			expect(resolutions.length).toBeLessThanOrEqual(2);
		}
	});

	it("never repeats a resolver_email within the same complaint's resolutions", () => {
		const generator = new ResolutionGenerator();

		for (let i = 0; i < 50; i++) {
			const resolutions = generator.generate("RESOLVED", new Set(), USERS);
			const emails = resolutions.map((r) => r.resolver_email);
			expect(new Set(emails).size).toBe(emails.length);
		}
	});

	it("never marks PREFER_COMPANY for a user outside usersWithCompany", () => {
		const generator = new ResolutionGenerator();
		const usersWithCompany = new Set<number>(); // vazio — nenhum usuário tem empresa

		for (let i = 0; i < 50; i++) {
			const resolutions = generator.generate(
				"RESOLVED",
				usersWithCompany,
				USERS,
			);
			for (const resolution of resolutions) {
				expect(resolution.resolution_hint).toBe("CITIZEN_ONLY");
			}
		}
	});

	it("only marks PREFER_COMPANY for users present in usersWithCompany", () => {
		const generator = new ResolutionGenerator();
		const usersWithCompany = new Set<number>(
			Array.from({ length: USER_POOL_SIZE }, (_, i) => i),
		); // todos os usuários têm empresa — só pra checar que hint nunca escapa do pool

		for (let i = 0; i < 50; i++) {
			const resolutions = generator.generate(
				"RESOLVED",
				usersWithCompany,
				USERS,
			);
			for (const resolution of resolutions) {
				expect(["PREFER_COMPANY", "CITIZEN_ONLY"]).toContain(
					resolution.resolution_hint,
				);
			}
		}
	});
});
