import { faker } from "@faker-js/faker";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import type {
	ComplaintStatusSeed,
	ComplaintVoteTypeSeed,
	VoteSeed,
} from "../entities/complaint-seed.js";

const QUORUM_THRESHOLD = 5;

/**
 * Mesma fórmula de `src/modules/complaints/workers/quorum-logic.ts`
 * (`calculateWeights`), duplicada deliberadamente — um script de seed não
 * deveria depender de um worker de produção. Se a fórmula real mudar (peso
 * do dono ou o limiar `5`), atualizar aqui também. Aqui o autor nunca vota
 * (ver `generate()`), então todo peso é 1.
 */
export function calculateWeights(votes: VoteSeed[]): {
	positive: number;
	negative: number;
} {
	let positive = 0;
	let negative = 0;
	for (const vote of votes) {
		if (vote.vote_type === "RESOLVED") positive++;
		else negative++;
	}
	return { positive, negative };
}

function candidatePool(userPoolSize: number, authorIndex: number): number[] {
	return Array.from({ length: userPoolSize }, (_, i) => i).filter(
		(i) => i !== authorIndex,
	);
}

/**
 * Gera votos coerentes com o `status` alvo — não só estruturalmente válidos,
 * mas plausíveis: `RESOLVED` sempre atinge o quórum real (`positivos >= 5 +
 * negativos`), `OPEN` sempre fica abaixo dele, `CANCELED` não tem restrição
 * (é ação direta do dono, não depende de quórum). O autor nunca vota na
 * própria denúncia (decisão de design — o schema real não proíbe, mas seria
 * estranho gerar isso por padrão).
 */
export class VoteGenerator {
	generate(
		status: ComplaintStatusSeed,
		users: UserSeed[],
		authorIndex: number,
	): VoteSeed[] {
		const candidates = candidatePool(users.length, authorIndex);

		switch (status) {
			case "RESOLVED":
				return this.generateResolved(users, candidates);
			case "OPEN":
				return this.generateOpen(users, candidates);
			case "CANCELED":
				return this.generateCanceled(users, candidates);
		}
	}

	private generateResolved(
		users: UserSeed[],
		candidates: number[],
	): VoteSeed[] {
		const maxVotes = candidates.length;

		let negativeCount = faker.number.int({
			min: 0,
			max: Math.min(2, Math.floor(maxVotes / 3)),
		});
		let positiveCount = QUORUM_THRESHOLD + negativeCount;

		const extraRoom = maxVotes - (positiveCount + negativeCount);
		if (extraRoom > 0) {
			positiveCount += faker.number.int({
				min: 0,
				max: Math.min(2, extraRoom),
			});
		}

		// Rede de segurança para pools muito pequenos — nunca deveria disparar
		// dado o piso de MIN_USERS_PER_CITY, mas evita gerar mais votos do
		// que candidatos disponíveis.
		if (positiveCount + negativeCount > maxVotes) {
			negativeCount = 0;
			positiveCount = Math.min(QUORUM_THRESHOLD, maxVotes);
		}

		const shuffled = faker.helpers.shuffle(candidates);
		const negativeVoters = shuffled.slice(0, negativeCount);
		const positiveVoters = shuffled.slice(
			negativeCount,
			negativeCount + positiveCount,
		);

		return [
			...positiveVoters.map((userIndex) =>
				this.vote(users, userIndex, "RESOLVED"),
			),
			...negativeVoters.map((userIndex) =>
				this.vote(users, userIndex, "NOT_RESOLVED"),
			),
		];
	}

	private generateOpen(users: UserSeed[], candidates: number[]): VoteSeed[] {
		// No máximo 4 votos distintos, com pesos todos 1 (autor nunca vota) —
		// mesmo com todos positivos (4) e nenhum negativo, 4 < 5 + 0, nunca
		// atinge o quórum real.
		const count = Math.min(
			faker.number.int({ min: 0, max: 4 }),
			candidates.length,
		);
		const voters = faker.helpers.arrayElements(candidates, count);

		return voters.map((userIndex) =>
			this.vote(
				users,
				userIndex,
				faker.datatype.boolean() ? "RESOLVED" : "NOT_RESOLVED",
			),
		);
	}

	private generateCanceled(
		users: UserSeed[],
		candidates: number[],
	): VoteSeed[] {
		const count = Math.min(
			faker.number.int({ min: 0, max: 3 }),
			candidates.length,
		);
		const voters = faker.helpers.arrayElements(candidates, count);

		return voters.map((userIndex) =>
			this.vote(
				users,
				userIndex,
				faker.datatype.boolean() ? "RESOLVED" : "NOT_RESOLVED",
			),
		);
	}

	private vote(
		users: UserSeed[],
		userIndex: number,
		vote_type: ComplaintVoteTypeSeed,
	): VoteSeed {
		return { voter_email: users[userIndex].email, vote_type };
	}
}
