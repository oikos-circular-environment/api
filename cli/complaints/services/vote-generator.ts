import { faker } from "@faker-js/faker";
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
export function calculateWeights(
	votes: VoteSeed[],
): { positive: number; negative: number } {
	let positive = 0;
	let negative = 0;
	for (const vote of votes) {
		if (vote.vote_type === "RESOLVED") positive++;
		else negative++;
	}
	return { positive, negative };
}

function candidatePool(residentPoolSize: number, authorIndex: number): number[] {
	return Array.from({ length: residentPoolSize }, (_, i) => i).filter(
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
		residentPoolSize: number,
		authorIndex: number,
	): VoteSeed[] {
		const candidates = candidatePool(residentPoolSize, authorIndex);

		switch (status) {
			case "RESOLVED":
				return this.generateResolved(candidates);
			case "OPEN":
				return this.generateOpen(candidates);
			case "CANCELED":
				return this.generateCanceled(candidates);
		}
	}

	private generateResolved(candidates: number[]): VoteSeed[] {
		const maxVotes = candidates.length;

		let negativeCount = faker.number.int({
			min: 0,
			max: Math.min(2, Math.floor(maxVotes / 3)),
		});
		let positiveCount = QUORUM_THRESHOLD + negativeCount;

		const extraRoom = maxVotes - (positiveCount + negativeCount);
		if (extraRoom > 0) {
			positiveCount += faker.number.int({ min: 0, max: Math.min(2, extraRoom) });
		}

		// Rede de segurança para pools muito pequenos — nunca deveria disparar
		// dado o piso de MIN_RESIDENTS_PER_CITY, mas evita gerar mais votos do
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
			...positiveVoters.map((resident_index) => this.vote(resident_index, "RESOLVED")),
			...negativeVoters.map((resident_index) =>
				this.vote(resident_index, "NOT_RESOLVED"),
			),
		];
	}

	private generateOpen(candidates: number[]): VoteSeed[] {
		// No máximo 4 votos distintos, com pesos todos 1 (autor nunca vota) —
		// mesmo com todos positivos (4) e nenhum negativo, 4 < 5 + 0, nunca
		// atinge o quórum real.
		const count = Math.min(
			faker.number.int({ min: 0, max: 4 }),
			candidates.length,
		);
		const voters = faker.helpers.arrayElements(candidates, count);

		return voters.map((resident_index) =>
			this.vote(resident_index, faker.datatype.boolean() ? "RESOLVED" : "NOT_RESOLVED"),
		);
	}

	private generateCanceled(candidates: number[]): VoteSeed[] {
		const count = Math.min(
			faker.number.int({ min: 0, max: 3 }),
			candidates.length,
		);
		const voters = faker.helpers.arrayElements(candidates, count);

		return voters.map((resident_index) =>
			this.vote(resident_index, faker.datatype.boolean() ? "RESOLVED" : "NOT_RESOLVED"),
		);
	}

	private vote(resident_index: number, vote_type: ComplaintVoteTypeSeed): VoteSeed {
		return { resident_index, vote_type };
	}
}
