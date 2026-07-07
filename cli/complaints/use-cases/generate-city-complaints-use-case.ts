import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_SEEDS_DIR } from "../../companies/writers/json-seed-file-writer.js";
import type { CityContext } from "../../shared/entities/city-context.js";
import type { CityResidentSeed } from "../../shared/entities/city-resident.js";
import { citySlug } from "../../shared/services/city-slug.js";
import type { ResolveCityResidentsUseCase } from "../../shared/use-cases/resolve-city-residents-use-case.js";
import type { ResolveCityUseCase } from "../../shared/use-cases/resolve-city-use-case.js";
import type { ComplaintSeed } from "../entities/complaint-seed.js";
import type { ComplaintGenerator } from "../services/complaint-generator.js";
import type {
	ComplaintSeedFileWriter,
	ExistsResult,
	WriteResult,
} from "../writers/complaint-seed-file-writer.js";

export interface GenerateCityComplaintsOptions {
	target?: number;
	force?: boolean;
	/** Diretório onde procurar o CompanySeedFile da mesma cidade (para
	 * `residentsWithCompany`) — default é o mesmo dos arquivos de empresas. */
	companiesDir?: string;
}

export interface GenerateCityComplaintsResult {
	ctx: CityContext;
	total: number;
	written: boolean;
	path: string;
}

interface CompanySeedFileShape {
	companies: { owner_resident_index?: number }[];
}

/**
 * Orquestrador de ponta a ponta para denúncias de uma cidade: reaproveita a
 * MESMA resolução de cidade e o MESMO pool de moradores do pipeline de
 * empresas (shared/) — nunca resolve/gera de novo. Fases expostas como
 * métodos públicos (mesmo padrão de `GenerateCitySeedUseCase`) para
 * alimentar o Listr2 do CLI passo a passo.
 */
export class GenerateCityComplaintsUseCase {
	constructor(
		private readonly resolveCityUseCase: ResolveCityUseCase,
		private readonly resolveCityResidents: ResolveCityResidentsUseCase,
		private readonly complaintGenerator: ComplaintGenerator,
		private readonly writer: ComplaintSeedFileWriter,
	) {}

	resolveCity(city: string, stateCode: string): Promise<CityContext> {
		return this.resolveCityUseCase.execute(city, stateCode);
	}

	resolveResidents(
		ctx: CityContext,
		opts: { companiesTarget?: number; complaintsTarget?: number } = {},
	): Promise<CityResidentSeed[]> {
		return this.resolveCityResidents.execute(ctx, opts);
	}

	/** Checagem pura, sem side-effect. */
	checkExisting(ctx: CityContext): ExistsResult {
		return this.writer.exists(ctx);
	}

	/**
	 * Lê o `CompanySeedFile` da mesma cidade em disco, SE existir — tanto faz
	 * se foi escrito nesta mesma execução do CLI (pipeline de empresas roda
	 * antes) ou numa execução anterior. Se não existir nenhum arquivo de
	 * empresas para essa cidade, retorna um Set vazio (toda resolução cai
	 * para `CITIZEN_ONLY` — comportamento correto, não é erro).
	 */
	computeResidentsWithCompany(
		ctx: CityContext,
		companiesDir: string = DEFAULT_SEEDS_DIR,
	): Set<number> {
		const path = resolve(companiesDir, `${citySlug(ctx)}.json`);
		if (!existsSync(path)) return new Set();

		const parsed: CompanySeedFileShape = JSON.parse(readFileSync(path, "utf-8"));
		return new Set(
			parsed.companies
				.map((c) => c.owner_resident_index)
				.filter((index): index is number => index !== undefined),
		);
	}

	generateComplaints(
		ctx: CityContext,
		residents: CityResidentSeed[],
		residentsWithCompany: Set<number>,
		target: number,
	): ComplaintSeed[] {
		return Array.from({ length: target }, () =>
			this.complaintGenerator.generate(ctx, residents.length, residentsWithCompany),
		);
	}

	writeSeed(
		ctx: CityContext,
		complaints: ComplaintSeed[],
		opts: { force?: boolean } = {},
	): WriteResult {
		return this.writer.write(
			ctx,
			complaints,
			{
				generated_at: new Date().toISOString(),
				city: ctx.city,
				state_code: ctx.stateCode,
			},
			{ force: opts.force },
		);
	}

	async execute(
		city: string,
		stateCode: string,
		residents: CityResidentSeed[],
		opts: GenerateCityComplaintsOptions = {},
	): Promise<GenerateCityComplaintsResult> {
		const ctx = await this.resolveCity(city, stateCode);
		const residentsWithCompany = this.computeResidentsWithCompany(
			ctx,
			opts.companiesDir,
		);
		const complaints = this.generateComplaints(
			ctx,
			residents,
			residentsWithCompany,
			opts.target ?? 0,
		);
		const { written, path } = this.writeSeed(ctx, complaints, {
			force: opts.force,
		});

		return { ctx, total: complaints.length, written, path };
	}
}
