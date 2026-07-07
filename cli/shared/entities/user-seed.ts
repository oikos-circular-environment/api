import type { CompanySeed } from "../../companies/entities/company-seed.js";
import type { ComplaintSeed } from "../../complaints/entities/complaint-seed.js";
import type { AddressSeed } from "./address-seed.js";

/**
 * Raiz de tudo que é gerado por cidade — espelha o `schema.prisma`, onde
 * `User` é dono de `companies` e autor de `complaints` (com seus
 * `votes`/`resolutions`). `UserGenerator` produz este tipo já com
 * `companies`/`complaints` vazios; as fases seguintes do pipeline
 * (`CompanyOwnerAssigner`, `GenerateCityComplaintsUseCase`) só preenchem
 * esses dois campos via spread — nenhum tipo intermediário "sem relações"
 * é necessário.
 */
export interface UserSeed {
	full_name: string;
	display_name: string;
	phone: string;
	/** Chave natural, única — usada pelo upsert no consumidor Prisma e por
	 * toda referência cruzada entre usuários (`VoteSeed.voter_email`,
	 * `ResolutionSeed.resolver_email`). */
	email: string;
	address: AddressSeed;
	companies: CompanySeed[];
	complaints: ComplaintSeed[];
}
