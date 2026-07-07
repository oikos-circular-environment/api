import type { Geospatial } from "../../../src/modules/complaints/entities/complaint-entity.js";

export type ComplaintStatusSeed = "OPEN" | "RESOLVED" | "CANCELED";

/** Os 7 assets de exemplo em `cli/assets/` são todos imagem — vídeo fora de escopo. */
export type ComplaintCaptureModeSeed = "PHOTO";

export type ComplaintVoteTypeSeed = "RESOLVED" | "NOT_RESOLVED";

/**
 * Dica para o consumidor Prisma: `"PREFER_COMPANY"` só é gerada quando o
 * usuário sorteado já é dono de alguma empresa no mesmo arquivo de usuários
 * da cidade — o consumidor usa o `company_id` real daquele usuário (já
 * disponível em memória do próprio seed), nunca de outro (ver
 * `01-technical-plan.md` §3.12).
 */
export type ResolutionHint = "PREFER_COMPANY" | "CITIZEN_ONLY";

export interface ComplaintAttachmentSeed {
	/** Nome do arquivo em `cli/assets/`, ex. "complaint-sample-01.jpg". */
	asset_file: string;
	type: ComplaintCaptureModeSeed;
}

export interface VoteSeed {
	/** Email do usuário votante — chave natural em `UserSeed.email` (nunca o
	 * autor, nunca repetido dentro dos votos da mesma denúncia). */
	voter_email: string;
	vote_type: ComplaintVoteTypeSeed;
}

export interface ResolutionSeed {
	/** Email do usuário resolvedor candidato — chave natural em `UserSeed.email`. */
	resolver_email: string;
	description: string;
	resolution_hint: ResolutionHint;
}

/** Posse é estrutural — uma `ComplaintSeed` só existe aninhada em
 * `UserSeed.complaints`, nunca solta com um ponteiro pro autor. */
export interface ComplaintSeed {
	date: string;
	observations: string | null;
	geospatial: Geospatial;
	/** 1-3 nomes canônicos de `CATEGORIES` (`waste-categories-base.ts`), nunca inventados. */
	waste_category_names: string[];
	attachments: ComplaintAttachmentSeed[];
	status: ComplaintStatusSeed;
	votes: VoteSeed[];
	/** Vazio se `status === "OPEN"`; 1-2 se `RESOLVED`; vazio se `CANCELED`. */
	resolutions: ResolutionSeed[];
}
