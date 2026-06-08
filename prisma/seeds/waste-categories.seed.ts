import type { PrismaClient } from '../../src/generated/prisma/client.js'

type HazardLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
type SubcategoryType = 'INCLUDE' | 'EXCLUDE'

interface SubcategoryInput {
	name: string
	description?: string
	observations?: string
	hazard_level: HazardLevel
	type: SubcategoryType
}

interface CategoryInput {
	name: string
	description: string
	observations: string
	hazard_levels: HazardLevel[]
	subcategories: SubcategoryInput[]
}

const CATEGORIES: CategoryInput[] = [
	{
		name: 'Papel / Papelão',
		description: 'Materiais celulósicos de embalagem, impressão e escrita. Aceitos quando limpos e secos.',
		observations: 'Reciclável padrão — aceito por todas as cooperativas. Papel contaminado com óleo, tinta ou alimento em excesso perde a condição de reciclável.',
		hazard_levels: ['LOW'],
		subcategories: [
			{ name: 'Caixas de papelão e papelão ondulado', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Papel de escritório, revistas, jornais, livros', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Embalagens de papel (sacos, envelopes)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Papel cartão (caixas de remédio, embalagens de alimentos)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Embalagens longa-vida / Tetra Pak', hazard_level: 'LOW', type: 'INCLUDE', observations: 'Composição mista (papel + plástico + alumínio) — requer cooperativa específica' },
			{ name: 'Papel contaminado com óleo, tinta ou alimento em excesso', hazard_level: 'MEDIUM', type: 'EXCLUDE', observations: 'Tratar como resíduo comum' },
			{ name: 'Embalagens que contiveram produtos químicos perigosos', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Embalagens Contaminadas' },
		],
	},
	{
		name: 'Plástico',
		description: 'Embalagens e materiais plásticos limpos classificados por resina (código 1–7). A presença de produto perigoso residual altera a classificação.',
		observations: 'Reciclável padrão. Verificar se a embalagem está limpa antes de aceitar. Embalagens de agrotóxico ou solvente são perigosas mesmo aparentemente vazias.',
		hazard_levels: ['LOW'],
		subcategories: [
			{ name: 'PET — garrafas de refrigerante e água', description: 'Polietileno tereftalato — Resina 1', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'PEAD — frascos de higiene, leite, balde', description: 'Polietileno de alta densidade — Resina 2', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'PVC — tubos, calhas, canos', description: 'Policloreto de vinila — Resina 3', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'PEBD — sacolas, filmes, embalagens flexíveis', description: 'Polietileno de baixa densidade — Resina 4', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'PP — potes, copos, tampas', description: 'Polipropileno — Resina 5', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'PS / Isopor — copos descartáveis, caixas', description: 'Poliestireno — Resina 6', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Outros plásticos — carcaças, galões, conduítes', description: 'Policarbonato, acrílico, nylon — Resina 7', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Embalagens de agrotóxico, solvente ou produto perigoso', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Embalagens Contaminadas' },
			{ name: 'Plástico contaminado com substâncias perigosas', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Embalagens Contaminadas' },
		],
	},
	{
		name: 'Metal / Alumínio',
		description: 'Embalagens metálicas e sucatas de metais ferrosos e não ferrosos limpos. Inclui alumínio, aço, ferro, cobre e ligas desde que sem contaminação.',
		observations: 'Reciclável de alto valor. Latas devem estar amassadas e limpas. Aerossóis devem estar completamente vazios — verificar antes de aceitar.',
		hazard_levels: ['LOW'],
		subcategories: [
			{ name: 'Latas de alumínio (bebidas, conservas)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Latas de aço (alimentos, tintas VAZIAS)', hazard_level: 'LOW', type: 'INCLUDE', observations: 'Devem estar limpas' },
			{ name: 'Sucata ferrosa (ferragens, vigas, chapas, vergalhões)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Sucata não ferrosa (alumínio, cobre, latão)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Fios e cabos de cobre (sem revestimento contaminante)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Alumínio (perfis, esquadrias, panelas)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Embalagens aerossol VAZIAS', hazard_level: 'LOW', type: 'INCLUDE', observations: 'Verificar se está completamente vazio antes de aceitar' },
			{ name: 'Latas com resíduo de tinta, solvente ou produto perigoso', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Embalagens Contaminadas' },
			{ name: 'Aerossóis cheios ou com produto perigoso residual', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Embalagens Contaminadas — risco de pressurização' },
			{ name: 'Componentes metálicos de veículos com fluidos', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Veículos' },
		],
	},
	{
		name: 'Vidro',
		description: 'Embalagens e artigos de vidro limpos para uso doméstico ou industrial. Vidros de laboratório, médicos ou contaminados saem desta categoria.',
		observations: 'Reciclável. Não misturar com vidros de laboratório ou material médico. Vidros quebrados devem ser acondicionados em embalagem resistente para evitar acidentes.',
		hazard_levels: ['LOW'],
		subcategories: [
			{ name: 'Garrafas e frascos de vidro (alimentos, bebidas, cosméticos)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Potes de vidro (conservas, geleia)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Vidro plano (janelas, espelhos)', hazard_level: 'LOW', type: 'INCLUDE', observations: 'Acondicionar com cuidado — risco de corte' },
			{ name: 'Vidro translúcido, refletivo e temperado', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Embalagem de vidro contaminada com produto perigoso', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Embalagens Contaminadas' },
			{ name: 'Ampolas e vidros de laboratório', hazard_level: 'VERY_HIGH', type: 'EXCLUDE', observations: 'RSS — não misturar em hipótese alguma' },
			{ name: 'Vidros blindados ou laminados de veículos', hazard_level: 'LOW', type: 'EXCLUDE', observations: 'Veículos — subcategoria específica' },
		],
	},
	{
		name: 'Madeira',
		description: 'Madeira de construção, paletes e produtos industrializados. A periculosidade varia com o tipo de tratamento — madeira com biocidas é perigosa.',
		observations: 'Madeira não tratada = reciclável. Inspecionar visualmente quanto a marcações de tratamento (dormentes, mourões, decks externos).',
		hazard_levels: ['LOW', 'MEDIUM', 'HIGH'],
		subcategories: [
			{ name: 'Madeira serrada não tratada (ripas, vigas, tábuas)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Paletes e caixotes não tratados', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Compensado, MDF, OSB, madeira industrializada', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Composição variável — adesivos e resinas sintéticas' },
			{ name: 'Madeira tratada com biocidas — CCA, CCB, creosoto', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Não aceitar — dormentes, mourões, decks externos; identificar marcação de tratamento' },
		],
	},
	{
		name: 'Têxtil / Roupas / Tecidos',
		description: 'Vestuário, calçados e materiais têxteis de uso doméstico limpos. Tecidos de EPI industrial contaminados ou uniformes hospitalares saem desta categoria.',
		observations: 'Reciclável / reutilizável. Verificar se o material não é de uso industrial contaminado (EPI) ou hospitalar antes de aceitar.',
		hazard_levels: ['LOW'],
		subcategories: [
			{ name: 'Roupas usadas (camisas, calças, vestidos, casacos)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Calçados (tênis, sapatos)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Bolsas e acessórios têxteis', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Retalhos de tecido, fios, malhas', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Carpetes, panos, toalhas', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Tecidos de EPI contaminados com substâncias perigosas', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'RP — uso industrial contaminado' },
			{ name: 'Uniformes e roupas hospitalares', hazard_level: 'VERY_HIGH', type: 'EXCLUDE', observations: 'RSS — proibida coleta comum' },
		],
	},
	{
		name: 'Borracha / Pneus',
		description: 'Pneus inservíveis de qualquer porte e materiais de borracha industrial limpos. Sujeitos a logística reversa obrigatória.',
		observations: 'Logística reversa obrigatória (Resolução CONAMA 416/2009). Não aceitar pneus com produtos perigosos internos.',
		hazard_levels: ['LOW'],
		subcategories: [
			{ name: 'Pneus inservíveis de automóveis', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Pneus de bicicletas', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Pneus de motocicletas', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Pneus de caminhões e ônibus', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Mangueiras, correias transportadoras, borrachas em geral', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Solados de calçados', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Borracha contaminada com produto perigoso', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'RP específico conforme o contaminante' },
		],
	},
	{
		name: 'Eletroeletrônicos (REEE)',
		description: 'Equipamentos elétricos e eletrônicos fora de uso. Composição variável — equipamentos com mercúrio, CFC/HCFC ou chumbo (CRT) são de alto risco.',
		observations: 'Logística reversa obrigatória (Decreto 9.177/2017). Orientar o gerador a remover baterias antes do descarte. Equipamentos com CRT ou refrigeração exigem coleta especializada.',
		hazard_levels: ['LOW', 'MEDIUM', 'HIGH'],
		subcategories: [
			{ name: 'Fios e cabos elétricos', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Computadores e notebooks', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Chumbo em soldas, cádmio em baterias' },
			{ name: 'Smartphones e tablets', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Remover bateria de lítio antes do descarte' },
			{ name: 'Monitores LCD/LED', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Podem conter mercúrio em backlights antigos' },
			{ name: 'Televisores LCD/LED', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Verificar backlights fluorescentes' },
			{ name: 'Impressoras e scanners', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Remover cartuchos de tinta antes do descarte' },
			{ name: 'Micro-ondas', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Magnetron contém berílio' },
			{ name: 'Equipamentos de som e vídeo', hazard_level: 'MEDIUM', type: 'INCLUDE' },
			{ name: 'Câmeras e filmadoras', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Baterias embutidas — remover antes do descarte' },
			{ name: 'Monitores CRT (antigos)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Contêm até 3 kg de chumbo no funil de vidro — não desmontar sem EPI' },
			{ name: 'Televisores de tubo (CRT)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Chumbo significativo — não desmontar sem EPI' },
			{ name: 'Geladeiras e ar-condicionado', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'CFC/HCFC — drenagem obrigatória por técnico habilitado antes do descarte' },
		],
	},
	{
		name: 'Pilhas e Baterias',
		description: 'Pilhas portáteis e baterias recarregáveis de diferentes químicas. A maioria é altamente perigosa. Pilhas alcalinas são a única exceção de menor risco.',
		observations: 'Logística reversa obrigatória (Resolução CONAMA 401/2008). Baterias de lítio danificadas = risco imediato de incêndio — armazenar em recipiente metálico com areia.',
		hazard_levels: ['MEDIUM', 'HIGH', 'VERY_HIGH'],
		subcategories: [
			{ name: 'Pilhas alcalinas (AA, AAA, C, D, 9V)', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Único tipo de menor risco — logística reversa ainda obrigatória' },
			{ name: 'Baterias Níquel-Cádmio (NiCd)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Cádmio cancerígeno e ecotóxico — não descartar em lixo comum' },
			{ name: 'Baterias Níquel-Hidreto Metálico (NiMH)', hazard_level: 'HIGH', type: 'INCLUDE' },
			{ name: 'Bateria de chumbo-ácido (automotiva)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Manter em posição vertical — risco de vazamento de ácido sulfúrico' },
			{ name: 'Bateria de lítio estacionária', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Armazenar longe de fontes de calor' },
			{ name: 'Pilhas-botão (relógio, controle remoto)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Mercúrio ou lítio miniatura — risco de ingestão acidental' },
			{ name: 'Baterias de lítio portáteis (Li-ion, LiPo)', hazard_level: 'VERY_HIGH', type: 'INCLUDE', observations: 'Risco de incêndio e explosão se danificada, perfurada ou comprimida' },
		],
	},
	{
		name: 'Lâmpadas',
		description: 'Lâmpadas de diferentes tecnologias. Fluorescentes e de vapor contêm mercúrio e são altamente perigosas. LED e incandescentes são de risco baixo a médio.',
		observations: 'Logística reversa obrigatória (Decreto 9.177/2017). Lâmpadas fluorescentes não devem ser quebradas — liberam mercúrio no ar.',
		hazard_levels: ['LOW', 'MEDIUM', 'HIGH'],
		subcategories: [
			{ name: 'Incandescente', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'LED', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Pode conter arsênico e índio' },
			{ name: 'Halógena', hazard_level: 'MEDIUM', type: 'INCLUDE' },
			{ name: 'Fluorescente (tubular, compacta)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Não quebrar — libera mercúrio (3–5 mg/lâmpada)' },
			{ name: 'Vapor de sódio (postes)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Sódio reativo + mercúrio — não quebrar' },
			{ name: 'Vapor de mercúrio', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Não quebrar' },
			{ name: 'Mista (mercúrio + tungstênio)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Não quebrar' },
		],
	},
	{
		name: 'Óleo Vegetal Usado (de cozinha)',
		description: 'Óleos de fritura e gorduras animais de cozimento usados. A mistura com óleo mineral ou contaminantes químicos inviabiliza o reaproveitamento.',
		observations: 'Reciclável para produção de biodiesel. Não misturar com água, óleo mineral ou produtos químicos — contamina o lote inteiro.',
		hazard_levels: ['MEDIUM'],
		subcategories: [
			{ name: 'Óleo de soja, canola, girassol, milho, oliva (fritura)', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Manter em recipiente fechado e identificado' },
			{ name: 'Gordura animal de cozimento (banha, sebo)', hazard_level: 'MEDIUM', type: 'INCLUDE' },
			{ name: 'Óleo misturado com óleo mineral (lubrificante)', hazard_level: 'VERY_HIGH', type: 'EXCLUDE', observations: 'Óleo Mineral / Lubrificante — não misturar' },
			{ name: 'Óleo com resíduos de produtos químicos', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Descartar separadamente — não é reciclável' },
		],
	},
	{
		name: 'Óleo Mineral / Lubrificante',
		description: 'Óleos lubrificantes usados derivados de petróleo — motor, hidráulicos, transmissão e graxas. Todos são altamente perigosos. Destinação obrigatória para rerrefino.',
		observations: 'NÃO aceitar em coleta comum. Coleta especializada obrigatória (Resolução CONAMA 362/2005). Manter em recipiente estanque e identificado.',
		hazard_levels: ['VERY_HIGH'],
		subcategories: [
			{ name: 'Óleo de motor usado (automóveis, motos, caminhões)', hazard_level: 'VERY_HIGH', type: 'INCLUDE' },
			{ name: 'Óleo hidráulico usado', hazard_level: 'VERY_HIGH', type: 'INCLUDE' },
			{ name: 'Óleo de transmissão usado', hazard_level: 'VERY_HIGH', type: 'INCLUDE' },
			{ name: 'Graxas e lubrificantes usados', hazard_level: 'VERY_HIGH', type: 'INCLUDE' },
			{ name: 'Óleo de corte e usinagem', hazard_level: 'VERY_HIGH', type: 'INCLUDE' },
		],
	},
	{
		name: 'Medicamentos',
		description: 'Medicamentos vencidos ou não utilizados. Comuns domiciliares são de risco médio; especiais são de alto risco. A distinção é definida pelo tipo e pelo gerador.',
		observations: 'Pontos de coleta regulamentados pela ANVISA (RDC 222/2018). Não aceitar medicamentos especiais (oncológicos, hormonais, imunossupressores).',
		hazard_levels: ['MEDIUM', 'HIGH', 'VERY_HIGH'],
		subcategories: [
			{ name: 'Medicamentos comuns vencidos (analgésicos, antigripais, vitaminas)', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Apenas gerador domiciliar' },
			{ name: 'Hormônios e anticoncepcionais', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Apenas via farmácias / serviços de saúde' },
			{ name: 'Antibióticos e antimicrobianos', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Apenas via farmácias / serviços de saúde' },
			{ name: 'Quimioterápicos e antineoplásicos', hazard_level: 'VERY_HIGH', type: 'INCLUDE', observations: 'Serviços de saúde especializados — coleta proibida para empresas convencionais' },
			{ name: 'Imunossupressores e antirretrovirais', hazard_level: 'VERY_HIGH', type: 'INCLUDE', observations: 'Serviços de saúde especializados — coleta proibida para empresas convencionais' },
		],
	},
	{
		name: 'Embalagens Contaminadas',
		description: 'Embalagens que contiveram substâncias perigosas — agrotóxicos, solventes, corrosivos, desinfetantes industriais. Todas são altamente perigosas, mesmo aparentemente vazias.',
		observations: 'NÃO aceitar em coleta comum. Logística reversa específica por segmento: agrotóxicos = INPEV. Embalagens de agrotóxico retêm resíduos mesmo "vazias".',
		hazard_levels: ['HIGH', 'VERY_HIGH'],
		subcategories: [
			{ name: 'Embalagens de agrotóxico / pesticida (mesmo vazias)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Logística reversa obrigatória — INPEV' },
			{ name: 'Embalagens de solventes, tintas com solvente, vernizes', hazard_level: 'HIGH', type: 'INCLUDE' },
			{ name: 'Embalagens de produtos corrosivos (ácidos, bases)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Usar EPI ao manusear' },
			{ name: 'Embalagens de desinfetantes industriais', hazard_level: 'HIGH', type: 'INCLUDE' },
			{ name: 'Aerossóis não completamente vazios com produto perigoso', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Não perfurar ou comprimir — risco de pressurização' },
			{ name: 'Embalagens com matrizes sólidas perigosas (amianto)', hazard_level: 'VERY_HIGH', type: 'EXCLUDE', observations: 'Construção Civil (RCD)' },
		],
	},
	{
		name: 'Construção Civil (RCD)',
		description: 'Resíduos de construção e demolição. A maioria é de baixo risco (concreto, cerâmica, gesso). Amianto e madeira tratada com biocidas são exceções de alto risco.',
		observations: 'Material limpo de construção civil é reciclável. Amianto = coleta especializada obrigatória — proibida coleta comum.',
		hazard_levels: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
		subcategories: [
			{ name: 'Concreto, cimento, argamassa', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Tijolos e blocos cerâmicos', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Azulejos, pisos cerâmicos, louças sanitárias', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Madeira serrada não tratada', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Gesso (drywall, gesso liso)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Asfalto sem alcatrão (RAP)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Solos e rochas limpos', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Materiais isolantes sem amianto', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Compensado, MDF, OSB', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Composição variável — adesivos e resinas' },
			{ name: 'Tinta, verniz, resíduos com PCB', hazard_level: 'HIGH', type: 'INCLUDE' },
			{ name: 'Madeira tratada com biocidas (CCA, CCB, creosoto)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Não aceitar em coleta comum' },
			{ name: 'Telhas e tubos de amianto / eternit', hazard_level: 'VERY_HIGH', type: 'INCLUDE', observations: 'Não manipular sem EPI respiratório — coleta especializada obrigatória' },
		],
	},
	{
		name: 'Veículos em Fim de Vida',
		description: 'Veículos automotores e seus componentes fora de uso. A periculosidade depende do estado: com fluidos é alto risco; drenado é baixo risco.',
		observations: 'Recebimento de veículos completos exige credenciamento de desmontadora (DENATRAN/SENATRAN). Drenar todos os fluidos antes de movimentar.',
		hazard_levels: ['LOW', 'HIGH'],
		subcategories: [
			{ name: 'Veículo drenado (sem fluidos perigosos)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Pneus inservíveis', hazard_level: 'LOW', type: 'INCLUDE', observations: 'Logística reversa obrigatória' },
			{ name: 'Veículo completo (com fluidos, bateria, combustível)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Drenar todos os fluidos antes de movimentar' },
			{ name: 'Filtros de óleo automotivos', hazard_level: 'HIGH', type: 'INCLUDE' },
			{ name: 'Fluidos de freio', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Manter em recipiente fechado e identificado' },
			{ name: 'Air bags (não deflagrados)', hazard_level: 'HIGH', type: 'INCLUDE', observations: 'Não manusear — risco de deflagração acidental' },
			{ name: 'Bateria automotiva (chumbo-ácido)', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Pilhas e Baterias — manter vertical para evitar vazamento de ácido' },
		],
	},
	{
		name: 'Resíduos Orgânicos',
		description: 'Restos de alimentos, resíduos vegetais e podas de árvores. Não apresentam características de periculosidade sob condições normais.',
		observations: 'Reciclável via compostagem ou biodigestão. Não confundir com óleo de cozinha — categoria separada.',
		hazard_levels: ['LOW', 'MEDIUM'],
		subcategories: [
			{ name: 'Restos de alimentos crus (frutas, vegetais, cascas)', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Borra de café, chá e filtros', hazard_level: 'LOW', type: 'INCLUDE', observations: 'Excelente para compostagem' },
			{ name: 'Poda de árvores e arbustos (galhos, troncos)', hazard_level: 'LOW', type: 'INCLUDE', observations: 'Triturar antes do descarte — geração de biomassa' },
			{ name: 'Grama, folhas e resíduos de jardinagem', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Resíduos de feiras livres e hortifrúti', hazard_level: 'LOW', type: 'INCLUDE' },
			{ name: 'Restos de alimentos cozidos (carnes, laticínios)', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Exige compostagem em sistema fechado — atrai vetores' },
			{ name: 'Resíduos de restaurantes e cozinhas comerciais', hazard_level: 'MEDIUM', type: 'INCLUDE', observations: 'Grandes geradores sujeitos à Resolução ANVISA' },
			{ name: 'Óleo vegetal de fritura', hazard_level: 'MEDIUM', type: 'EXCLUDE', observations: 'Óleo Vegetal Usado — categoria separada' },
			{ name: 'Resíduos orgânicos com agrotóxico (folha de lavoura tratada)', hazard_level: 'HIGH', type: 'EXCLUDE', observations: 'Não se enquadra como orgânico simples — verificar classificação específica' },
			{ name: 'Resíduos de laboratório com material biológico', hazard_level: 'VERY_HIGH', type: 'EXCLUDE', observations: 'RSS — proibida coleta comum' },
		],
	},
	{
		name: 'Resíduos de Serviços de Saúde (RSS)',
		description: 'Resíduos gerados em serviços de saúde — hospitalares, clínicos e laboratoriais. Todos de altíssimo risco. Coleta convencional proibida sem exceção.',
		observations: 'COLETA PROIBIDA por empresa convencional. Obrigatório coleta por empresa licenciada pela ANVISA e Secretaria de Saúde (RDC 222/2018).',
		hazard_levels: ['VERY_HIGH'],
		subcategories: [
			{ name: 'Agulhas, seringas, escalpes, lancetas (perfurocortantes)', hazard_level: 'VERY_HIGH', type: 'INCLUDE', observations: 'Descartar em recipiente rígido — risco de acidente perfurocortante' },
			{ name: 'Curativos, gazes, ataduras com sangue', hazard_level: 'VERY_HIGH', type: 'INCLUDE', observations: 'Contaminação biológica — vírus, bactérias' },
			{ name: 'Fluidos corpóreos (sangue, urina, fezes) em forma livre', hazard_level: 'VERY_HIGH', type: 'INCLUDE', observations: 'Vírus, bactérias, príons' },
			{ name: 'Material de laboratório (culturas, meios de cultura)', hazard_level: 'VERY_HIGH', type: 'INCLUDE', observations: 'Contaminação biológica' },
			{ name: 'Peças anatômicas e tecidos cirúrgicos', hazard_level: 'VERY_HIGH', type: 'INCLUDE' },
			{ name: 'Bolsas transfusionais', hazard_level: 'VERY_HIGH', type: 'INCLUDE' },
			{ name: 'Equipamentos de hemodiálise descartados', hazard_level: 'VERY_HIGH', type: 'INCLUDE' },
			{ name: 'Medicamentos especiais (antibióticos, hormônios, quimioterápicos)', hazard_level: 'VERY_HIGH', type: 'INCLUDE', observations: 'Contaminação química' },
			{ name: 'Resíduos de medicina nuclear', hazard_level: 'VERY_HIGH', type: 'INCLUDE', observations: 'Radioatividade — protocolo específico de armazenamento e transporte' },
		],
	},
]

export async function seedWasteCategories(prisma: PrismaClient): Promise<void> {
	console.log('Seeding waste categories...')

	for (const category of CATEGORIES) {
		const existing = await prisma.wasteCategory.findFirst({
			where: { name: category.name },
		})

		if (existing) {
			console.log(`  skip: ${category.name} (already exists)`)
			continue
		}

		await prisma.wasteCategory.create({
			data: {
				name: category.name,
				description: category.description,
				observations: category.observations,
				hazard_levels: category.hazard_levels,
				subcategories: {
					create: category.subcategories.map((sub) => ({
						name: sub.name,
						description: sub.description ?? null,
						observations: sub.observations ?? null,
						hazard_level: sub.hazard_level,
						type: sub.type,
					})),
				},
			},
		})

		console.log(`  created: ${category.name} (${category.subcategories.length} subcategories)`)
	}

	console.log('Done seeding waste categories.')
}
