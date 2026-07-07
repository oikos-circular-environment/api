import {
	autocompleteMultiselect,
	cancel,
	confirm,
	isCancel,
	note,
	select,
	text,
} from "@clack/prompts";
import type {
	IbgeMunicipio,
	IbgeUf,
} from "../shared/entities/ibge-municipio.js";

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
 * uma vez, em vez de uma-por-vez com confirmação no final. Não há um item
 * "← Voltar" misturado na lista (isso confundia: marcar aquele item parecia
 * uma seleção igual às cidades, sem deixar claro que descartava o resto).
 * Em vez disso, confirmar sem marcar nenhuma cidade (`required: false`,
 * lista vazia) é o próprio "voltar" — refaz o prompt de estado.
 */
export async function promptCities(
	municipios: IbgeMunicipio[],
): Promise<PromptCitiesResult> {
	const byId = new Map(municipios.map((m) => [String(m.id), m]));

	const selected = handleCancel(
		await autocompleteMultiselect({
			message:
				"Digite para buscar e marque uma ou mais cidades (espaço marca, enter confirma; enter sem marcar nada volta para a escolha de estado)",
			placeholder: "Nome da cidade...",
			required: false,
			options: municipios.map((m) => ({ value: String(m.id), label: m.nome })),
		}),
	);

	if (selected.length === 0) {
		return { back: true };
	}

	const chosen = selected
		.map((id) => byId.get(id))
		.filter((m): m is IbgeMunicipio => m !== undefined);

	return { back: false, municipios: chosen };
}

/** Mostra a lista final de cidades escolhidas e pede confirmação antes de gerar. */
export async function promptConfirmSelection(
	cities: { city: string; stateCode: string }[],
): Promise<boolean> {
	const list = cities.map((c) => `${c.city} (${c.stateCode})`).join("\n");
	note(list, `${cities.length} cidade(s) selecionada(s)`);

	return handleCancel(
		await confirm({
			message: "Confirma a geração para essas cidades?",
			initialValue: true,
		}),
	);
}

/**
 * Prompt de quantidade genérico, reaproveitado para moradores/empresas/
 * denúncias. `0` é uma resposta válida — significa "não gerar esse tipo
 * para esta cidade nesta execução". Enter aceita `defaultValue` quando
 * informado; sem default, Enter retorna `undefined` (deixa o chamador
 * decidir automaticamente, ex.: tamanho do pool de moradores).
 */
export async function promptTarget(
	label: string,
	defaultValue?: number,
): Promise<number | undefined> {
	const value = handleCancel(
		await text({
			message:
				defaultValue !== undefined
					? `Quantidade de ${label} (Enter para ${defaultValue})`
					: `Quantidade de ${label} (Enter para automático)`,
			placeholder: defaultValue !== undefined ? String(defaultValue) : "ex: 40",
			validate(value) {
				if (value === undefined || value === "") return undefined;
				if (!/^\d+$/.test(value))
					return "Informe um número inteiro (0 ou mais)";
				return undefined;
			},
		}),
	);

	if (value === "") return defaultValue;
	return Number(value);
}

export async function promptAddAnotherState(): Promise<boolean> {
	return handleCancel(
		await confirm({
			message: "Adicionar cidades de outro estado?",
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
