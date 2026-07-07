export interface IbgeUf {
	id: number;
	sigla: string;
	nome: string;
}

/** Shape real da API do IBGE — a UF vem aninhada em microrregiao.mesorregiao.UF. */
export interface IbgeMunicipio {
	id: number;
	nome: string;
	microrregiao: {
		mesorregiao: {
			UF: IbgeUf;
		};
	};
}
