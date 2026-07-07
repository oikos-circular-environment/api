import { describe, expect, it } from "vitest";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import { calculateWeights, VoteGenerator } from "./vote-generator.js";

const USER_POOL_SIZE = 20;
const AUTHOR_INDEX = 3;

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
const AUTHOR_EMAIL = USERS[AUTHOR_INDEX].email;

describe("vote-generator", () => {
	it("RESOLVED always reaches the real quorum threshold (positive >= 5 + negative)", () => {
		const generator = new VoteGenerator();

		for (let i = 0; i < 50; i++) {
			const votes = generator.generate("RESOLVED", USERS, AUTHOR_INDEX);
			const { positive, negative } = calculateWeights(votes);
			expect(positive).toBeGreaterThanOrEqual(5 + negative);
		}
	});

	it("OPEN never reaches the real quorum threshold", () => {
		const generator = new VoteGenerator();

		for (let i = 0; i < 50; i++) {
			const votes = generator.generate("OPEN", USERS, AUTHOR_INDEX);
			const { positive, negative } = calculateWeights(votes);
			expect(positive).toBeLessThan(5 + negative);
		}
	});

	it("never includes the author among the voters", () => {
		const generator = new VoteGenerator();

		for (const status of ["OPEN", "RESOLVED", "CANCELED"] as const) {
			for (let i = 0; i < 50; i++) {
				const votes = generator.generate(status, USERS, AUTHOR_INDEX);
				expect(votes.some((v) => v.voter_email === AUTHOR_EMAIL)).toBe(false);
			}
		}
	});

	it("never repeats a voter within the same complaint", () => {
		const generator = new VoteGenerator();

		for (const status of ["OPEN", "RESOLVED", "CANCELED"] as const) {
			for (let i = 0; i < 50; i++) {
				const votes = generator.generate(status, USERS, AUTHOR_INDEX);
				const voterEmails = votes.map((v) => v.voter_email);
				expect(new Set(voterEmails).size).toBe(voterEmails.length);
			}
		}
	});

	it("only produces voter_email values present in the user pool", () => {
		const generator = new VoteGenerator();
		const validEmails = new Set(USERS.map((u) => u.email));

		for (const status of ["OPEN", "RESOLVED", "CANCELED"] as const) {
			for (let i = 0; i < 50; i++) {
				const votes = generator.generate(status, USERS, AUTHOR_INDEX);
				for (const vote of votes) {
					expect(validEmails.has(vote.voter_email)).toBe(true);
				}
			}
		}
	});

	it("CANCELED generates between 0 and 3 votes without quorum constraints", () => {
		const generator = new VoteGenerator();

		for (let i = 0; i < 50; i++) {
			const votes = generator.generate("CANCELED", USERS, AUTHOR_INDEX);
			expect(votes.length).toBeGreaterThanOrEqual(0);
			expect(votes.length).toBeLessThanOrEqual(3);
		}
	});
});
