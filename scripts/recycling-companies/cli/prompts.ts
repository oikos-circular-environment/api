import {
	autocomplete,
	cancel,
	confirm,
	isCancel,
	select,
	text,
} from "@clack/prompts";
import type { IbgeMunicipio, IbgeUf } from "../entities/ibge-municipio.js";

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

export async function promptCity(
	municipios: IbgeMunicipio[],
): Promise<IbgeMunicipio> {
	const byId = new Map(municipios.map((m) => [m.id, m]));

	const id = handleCancel(
		await autocomplete({
			message: "Digite para buscar a cidade",
			placeholder: "Nome da cidade...",
			options: municipios.map((m) => ({ value: m.id, label: m.nome })),
		}),
	);

	const municipio = byId.get(id);
	if (!municipio) throw new Error(`Município id ${id} não encontrado`);
	return municipio;
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

export async function promptAddAnotherCity(): Promise<boolean> {
	return handleCancel(
		await confirm({
			message: "Adicionar outra cidade?",
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
