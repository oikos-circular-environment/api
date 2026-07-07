import type { CityContext } from "../entities/city-context.js";
import type { CityResidentSeed } from "../entities/city-resident.js";
import {
	CityResidentGenerator,
	computeResidentPoolSize,
} from "../services/city-resident-generator.js";
import type { CityResidentsFileWriter } from "../writers/city-residents-file-writer.js";

export interface ResolveCityResidentsOptions {
	companiesTarget?: number;
	complaintsTarget?: number;
	residentsFloor?: number;
	force?: boolean;
}

/**
 * Carrega o pool de moradores já gravado para a cidade, se existir (sem
 * redimensionar); senão gera um pool novo, dimensionado por
 * `computeResidentPoolSize`, e grava. Compartilhado pelos pipelines de
 * empresas (donos) e denúncias (autores/votantes/resolvedores) — nunca gera
 * pools separados para a mesma cidade na mesma execução.
 */
export class ResolveCityResidentsUseCase {
	constructor(
		private readonly writer: CityResidentsFileWriter,
		private readonly generator: CityResidentGenerator = new CityResidentGenerator(),
	) {}

	async execute(
		ctx: CityContext,
		opts: ResolveCityResidentsOptions = {},
	): Promise<CityResidentSeed[]> {
		const { exists } = this.writer.exists(ctx);
		if (exists && !opts.force) {
			return this.writer.read(ctx);
		}

		const count = computeResidentPoolSize(opts);
		const residents = this.generator.generate(ctx, count);

		this.writer.write(
			ctx,
			residents,
			{
				generated_at: new Date().toISOString(),
				city: ctx.city,
				state_code: ctx.stateCode,
			},
			{ force: opts.force },
		);

		return residents;
	}
}
