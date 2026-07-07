import type { CityContext } from "../entities/city-context.js";
import type { UserSeed } from "../entities/user-seed.js";
import {
	computeUserPoolSize,
	UserGenerator,
} from "../services/user-generator.js";

export interface ResolveCityUsersOptions {
	companiesTarget?: number;
	complaintsTarget?: number;
	usersFloor?: number;
}

/**
 * Gera o pool de usuários fictícios de uma cidade, dimensionado por
 * `computeUserPoolSize`. Compartilhado pelos pipelines de empresas
 * (donos) e denúncias (autores/votantes/resolvedores) — nunca gera pools
 * separados para a mesma cidade na mesma execução.
 */
export class ResolveCityUsersUseCase {
	constructor(
		private readonly generator: UserGenerator = new UserGenerator(),
	) {}

	execute(ctx: CityContext, opts: ResolveCityUsersOptions = {}): UserSeed[] {
		const count = computeUserPoolSize(opts);
		return this.generator.generate(ctx, count);
	}
}
