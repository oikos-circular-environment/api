import { faker } from "@faker-js/faker";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import type {
	ComplaintStatusSeed,
	ResolutionSeed,
} from "../entities/complaint-seed.js";

/** Probabilidade de um usuário dono de empresa resolver "como empresa" em vez de pessoalmente. */
const COMPANY_BACKED_PROBABILITY = 0.7;

/**
 * Gera 0-2 resoluções — só para denúncias `RESOLVED` (`OPEN` ainda não foi
 * resolvida; `CANCELED` é ação direta do dono, sem passar pelo fluxo de
 * resolução). Diferente de `VoteGenerator`, o autor PODE estar entre os
 * sorteados (reflete o fluxo real de o dono encerrar a própria denúncia).
 * `resolution_hint: "PREFER_COMPANY"` só é atribuído a um usuário que já
 * conste em `usersWithCompany` — o vínculo de fato (qual empresa) é
 * resolvido no consumidor Prisma a partir das empresas já criadas no mesmo
 * seed.
 */
export class ResolutionGenerator {
	generate(
		status: ComplaintStatusSeed,
		usersWithCompany: Set<number>,
		users: UserSeed[],
	): ResolutionSeed[] {
		if (status !== "RESOLVED") return [];

		const count = Math.min(faker.number.int({ min: 1, max: 2 }), users.length);
		const allUserIndexes = Array.from({ length: users.length }, (_, i) => i);
		const chosen = faker.helpers.arrayElements(allUserIndexes, count);

		return chosen.map((userIndex) => ({
			resolver_email: users[userIndex].email,
			description: faker.lorem.sentence(),
			resolution_hint:
				usersWithCompany.has(userIndex) &&
				faker.datatype.boolean({ probability: COMPANY_BACKED_PROBABILITY })
					? "PREFER_COMPANY"
					: "CITIZEN_ONLY",
		}));
	}
}
