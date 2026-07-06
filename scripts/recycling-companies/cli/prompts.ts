import {
	autocompleteMultiselect,
	cancel,
	confirm,
	isCancel,
	select,
	text,
} from "@clack/prompts";
import type { IbgeMunicipio, IbgeUf } from "../entities/ibge-municipio.js";

const BACK_SENTINEL = "__back__";

/** Encerra o processo de forma limpa quando o usuário cancela (Ctrl+C). */
function handleCancel<T>(value: T | symbol): T {
	if (isCancel(value)) {
		cancel("Operação cancelada.");
		process.exit(0);
	}
	return value;
}

export async function promptState(ufs: IbgeUf[]): Promise<IbgeUf> {
	const bySigla = new Map(ufs.map((uf) => [uf.sigla, uf]));

	const sigla = handleCancel(
		await select({
			message: "Selecione o estado (UF)",
			options: ufs.map((uf) => ({
				value: uf.sigla,
				label: `${uf.nome} (${uf.sigla})`,
			})),
		}),
	);

	const uf = bySigla.get(sigla);
	if (!uf) throw new Error(`UF "${sigla}" não encontrada na lista do IBGE`);
	return uf;
}

export type PromptCitiesResult =
	| { back: true }
	| { back: false; municipios: IbgeMunicipio[] };

/**
 * Multiselect com busca — deixa marcar várias cidades do mesmo estado de
 * uma vez, em vez de uma-por-vez com confirmação no final. A primeira
 * opção da lista é um sentinela "← Voltar": se marcada (mesmo junto de
 * outras), a seleção inteira é descartada e o chamador deve refazer o
 * prompt de estado — o Clack não tem navegação "para trás" nativa.
 */
export async function promptCities(
	municipios: IbgeMunicipio[],
): Promise<PromptCitiesResult> {
	const byId = new Map(municipios.map((m) => [String(m.id), m]));

	const selected = handleCancel(
		await autocompleteMultiselect({
			message:
				"Digite para buscar e marque uma ou mais cidades (espaço marca, enter confirma)",
			placeholder: "Nome da cidade...",
			required: true,
			options: [
				{ value: BACK_SENTINEL, label: "← Voltar (escolher outro estado)" },
				...municipios.map((m) => ({ value: String(m.id), label: m.nome })),
			],
		}),
	);

	if (selected.includes(BACK_SENTINEL)) {
		return { back: true };
	}

	const chosen = selected
		.map((id) => byId.get(id))
		.filter((m): m is IbgeMunicipio => m !== undefined);

	if (chosen.length === 0) {
		throw new Error("Nenhuma cidade selecionada");
	}

	return { back: false, municipios: chosen };
}

export async function promptTarget(): Promise<number | undefined> {
	const value = handleCancel(
		await text({
			message:
				"Meta de empresas para esta cidade (Enter para não completar com sintéticas)",
			placeholder: "ex: 40",
			validate(value) {
				if (value === undefined || value === "") return undefined;
				if (!/^\d+$/.test(value)) return "Informe um número inteiro positivo";
				return undefined;
			},
		}),
	);

	return value === "" ? undefined : Number(value);
}

export async function promptAddAnotherState(): Promise<boolean> {
	return handleCancel(
		await confirm({
			message: "Adicionar cidades de outro estado?",
			initialValue: false,
		}),
	);
}

/**
 * Perguntado só quando o seed daquela cidade específica já existe — mais
 * preciso que um prompt genérico de "force" no início da execução, que
 * perguntaria antes mesmo de saber se alguma cidade precisa disso.
 */
export async function promptOverwrite(
	city: string,
	stateCode: string,
	path: string,
): Promise<boolean> {
	return handleCancel(
		await confirm({
			message: `Seed de ${city}-${stateCode} já existe em ${path}. Sobrescrever?`,
			initialValue: false,
		}),
	);
}

export async function promptOutputDir(
	defaultDir: string,
): Promise<string | undefined> {
	const value = handleCancel(
		await text({
			message: "Diretório de saída dos arquivos de seed",
			placeholder: defaultDir,
		}),
	);

	return value === "" || value === undefined ? undefined : value;
}
