import type { CompanySeed } from "../../companies/entities/company-seed.js";
import type { CityContext } from "../../shared/entities/city-context.js";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import type { ComplaintSeed } from "../entities/complaint-seed.js";
import type { ComplaintGenerator } from "../services/complaint-generator.js";

/**
 * Orquestrador de denúncias para uma cidade: reaproveita o MESMO `CityContext`
 * e o MESMO pool de usuários do pipeline de empresas (já resolvidos antes,
 * em `cli/cli.ts`) — nunca resolve/gera de novo. A escrita do arquivo
 * combinado da cidade acontece fora desta classe, depois que empresas E
 * denúncias estiverem prontas.
 */
export class GenerateCityComplaintsUseCase {
	constructor(private readonly complaintGenerator: ComplaintGenerator) {}

	/**
	 * Usuários donos de alguma empresa nesta MESMA execução — as empresas já
	 * estão em memória (saíram de `GenerateCitySeedUseCase.assignOwners` no
	 * mesmo pipeline), então não há mais round-trip de disco aqui.
	 */
	computeUsersWithCompany(
		ownedCompaniesByUser: Map<number, CompanySeed[]>,
	): Set<number> {
		return new Set(ownedCompaniesByUser.keys());
	}

	/** Retorna um mapa índice-do-usuário-autor → denúncias dele; quem aninha
	 * isso em `UserSeed.complaints` é `cli/cli.ts`. */
	generateComplaints(
		ctx: CityContext,
		users: UserSeed[],
		usersWithCompany: Set<number>,
		target: number,
	): Map<number, ComplaintSeed[]> {
		const complaintsByUser = new Map<number, ComplaintSeed[]>();

		for (let i = 0; i < target; i++) {
			const { authorIndex, complaint } = this.complaintGenerator.generate(
				ctx,
				users,
				usersWithCompany,
			);

			const existing = complaintsByUser.get(authorIndex);
			if (existing) {
				existing.push(complaint);
			} else {
				complaintsByUser.set(authorIndex, [complaint]);
			}
		}

		return complaintsByUser;
	}
}
