import type { Geospatial } from "../../../src/modules/complaints/entities/complaint-entity.js";

export type ComplaintStatusSeed = "OPEN" | "RESOLVED" | "CANCELED";

/** Os 7 assets de exemplo em `cli/assets/` são todos imagem — vídeo fora de escopo. */
export type ComplaintCaptureModeSeed = "PHOTO";

export type ComplaintVoteTypeSeed = "RESOLVED" | "NOT_RESOLVED";

/**
 * Dica para o consumidor Prisma: `"PREFER_COMPANY"` só é gerada quando o
 * morador sorteado já é dono de alguma empresa no mesmo arquivo de moradores
 * da cidade — o consumidor confirma no banco e usa o `company_id` real
 * daquele morador, nunca de outro (ver `01-technical-plan.md` §3.12).
 */
export type ResolutionHint = "PREFER_COMPANY" | "CITIZEN_ONLY";

export interface ComplaintAttachmentSeed {
	/** Nome do arquivo em `cli/assets/`, ex. "complaint-sample-01.jpg". */
	asset_file: string;
	type: ComplaintCaptureModeSeed;
}

export interface VoteSeed {
	/** Índice em `CityResidentsFile.residents` — nunca o autor, nunca repetido
	 * dentro dos votos da mesma denúncia. */
	resident_index: number;
	vote_type: ComplaintVoteTypeSeed;
}

export interface ResolutionSeed {
	/** Índice em `CityResidentsFile.residents` — autor candidato da resolução. */
	resident_index: number;
	description: string;
	resolution_hint: ResolutionHint;
}

export interface ComplaintSeed {
	author_resident_index: number;
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

export interface ComplaintSeedFileMeta {
	generated_at: string;
	total: number;
	city: string;
	state_code: string;
}

export interface ComplaintSeedFile {
	_meta: ComplaintSeedFileMeta;
	complaints: ComplaintSeed[];
}
