import { faker } from "@faker-js/faker";
import type {
	ComplaintStatusSeed,
	ResolutionSeed,
} from "../entities/complaint-seed.js";

/** Probabilidade de um morador dono de empresa resolver "como empresa" em vez de pessoalmente. */
const COMPANY_BACKED_PROBABILITY = 0.7;

/**
 * Gera 0-2 resoluções — só para denúncias `RESOLVED` (`OPEN` ainda não foi
 * resolvida; `CANCELED` é ação direta do dono, sem passar pelo fluxo de
 * resolução). Diferente de `VoteGenerator`, o autor PODE estar entre os
 * sorteados (reflete o fluxo real de o dono encerrar a própria denúncia).
 * `resolution_hint: "PREFER_COMPANY"` só é atribuído a um morador que já
 * conste em `residentsWithCompany` — o vínculo de fato (qual empresa, se
 * ainda existir no banco) é resolvido só no consumidor Prisma.
 */
export class ResolutionGenerator {
	generate(
		status: ComplaintStatusSeed,
		residentsWithCompany: Set<number>,
		residentPoolSize: number,
	): ResolutionSeed[] {
		if (status !== "RESOLVED") return [];

		const count = Math.min(
			faker.number.int({ min: 1, max: 2 }),
			residentPoolSize,
		);
		const allResidents = Array.from({ length: residentPoolSize }, (_, i) => i);
		const chosen = faker.helpers.arrayElements(allResidents, count);

		return chosen.map((resident_index) => ({
			resident_index,
			description: faker.lorem.sentence(),
			resolution_hint:
				residentsWithCompany.has(resident_index) &&
				faker.datatype.boolean({ probability: COMPANY_BACKED_PROBABILITY })
					? "PREFER_COMPANY"
					: "CITIZEN_ONLY",
		}));
	}
}
