# Base de Conhecimento: ABNT NBR 10004:2024 — Classificação de Resíduos Sólidos

> **Fonte:** ABNT NBR 10004-1:2024 (Parte 1 – Requisitos) e ABNT NBR 10004-2:2024 (Parte 2 – SGCR-10004)
> **Finalidade:** Referência para o projeto Oikos — classificação de resíduos recicláveis, grau de periculosidade, enquadramento na LGR.

---

## 1. Visão Geral da Norma

A ABNT NBR 10004:2024 é composta por duas partes complementares:

| Parte | Título | Páginas | Conteúdo |
|-------|--------|---------|----------|
| **Parte 1** | Requisitos para classificação | 29 | Processo de classificação, terminologia, fluxogramas |
| **Parte 2** | Sistema Geral de Classificação de Resíduos (SGCR-10004) | 746 | LGR (Lista Geral de Resíduos), Anexos, LSCT |

---

## 2. Terminologia Central

| Termo | Significado |
|-------|-------------|
| **RP** | Resíduo Perigoso (Classe 1) |
| **RNP** | Resíduo Não Perigoso (Classe 2) |
| **Classe 1** | Perigoso — apresenta características de periculosidade |
| **Classe 2A** | Não inerte — não é perigoso, mas tem propriedades como biodegradabilidade |
| **Classe 2B** | Inerte — não apresenta propriedades reativas |
| **LGR** | Lista Geral de Resíduos — tabela com códigos de 8 dígitos |
| **Entrada Única (U)** | Resíduo classificado diretamente como RP ou RNP sem ambiguidade |
| **Entrada-Espelho (E)** | Resíduo que pode ser RP ou RNP dependendo da composição/análise |
| **POP** | Poluentes Orgânicos Persistentes (ex: PCB, dioxinas, furanos) |
| **LSCT** | Lista de Substâncias Conhecidamente Tóxicas |
| **LSCT-a** | Substâncias com toxicidade aguda |
| **LSCT-c** | Substâncias com toxicidade crônica |

---

## 3. Processo de Classificação — Os 4 Passos

```
INÍCIO
  │
  ▼
PASSO 1 ──► Enquadrar na LGR (Lista Geral de Resíduos)
  │          └─ Encontrou Entrada Única (U)?
  │              ├─ Sim → Classificação definida (RP ou RNP)
  │              └─ Não (Entrada-Espelho E) → continuar
  │
  ▼
PASSO 2 ──► Verificar presença de POP (Poluentes Orgânicos Persistentes)
  │          └─ PCB, dioxinas, furanos, etc. acima dos limites do Anexo C?
  │              ├─ Sim → RP (Classe 1)
  │              └─ Não → continuar
  │
  ▼
PASSO 3 ──► Avaliar características físico-químicas de periculosidade:
  │            • Inflamabilidade
  │            • Corrosividade
  │            • Reatividade
  │            • Patogenicidade
  │          └─ Apresenta alguma? → Sim → RP; Não → continuar
  │
  ▼
PASSO 4 ──► Avaliar toxicidade via LSCT
               • Toxicidade aguda
               • Toxicidade mutagênica / carcinogênica
               • Toxicidade reprodutiva
               • STOT (toxicidade a órgãos-alvo específicos)
               • Toxicidade por aspiração
               • Ecotoxicidade
             └─ Apresenta? → Sim → RP; Não → RNP
```

---

## 4. Estrutura do Código LGR

Os códigos da LGR têm **8 dígitos** com 4 níveis hierárquicos:

```
XX  XX  XX  XX
│   │   │   └── Variante / especificação adicional
│   │   └────── Resíduo específico
│   └────────── Subcapítulo (processo/subgrupo)
└────────────── Capítulo (setor gerador / tipo de resíduo)
```

**Exemplos:**
- `15 01 02 00` = Cap.15 → Subcap.01 (embalagens) → 02 (plástico) → 00 (padrão)
- `15 04 01 01` = Cap.15 → Subcap.04 (pilhas/baterias) → 01 (portáteis) → 01 (lítio)
- `18 01 02 00` = Cap.18 (RSS) → Subcap.01 (agentes biológicos) → 02 (alto risco epidemiológico)

---

## 5. Características de Periculosidade (Passo 3)

| Característica | Critério Resumido |
|---------------|-------------------|
| **Inflamabilidade** | Ponto de fulgor ≤ 60°C (líquidos) ou sólidos que entram facilmente em combustão |
| **Corrosividade** | pH ≤ 2 ou pH ≥ 12,5, ou corrói aço a taxa > 6,35 mm/ano |
| **Reatividade** | Instável, reage violentamente com água, libera gases tóxicos |
| **Patogenicidade** | Contém micro-organismos patogênicos viáveis, toxinas, príons |
| **Toxicidade** | Avaliada via LSCT (aguda, crônica, mutagênica, carcinogênica, ecotóxica) |

---

## 6. LGR — Lista Geral de Resíduos: Todos os Capítulos

### Capítulos por Setor Gerador (01–12)

| Cap | Setor Gerador | Periculosidade Geral |
|-----|--------------|---------------------|
| **01** | Mineração, lavra de pedras, extração | Misto (rejeitos de mineração = RNP; metais pesados = RP) |
| **02** | Agricultura, horticultura, aquicultura, silvicultura, caça, pesca, processamento de alimentos | Maioria RNP; agroquímicos e pesticidas = RP |
| **03** | Processamento de madeira, produção de papel e celulose | Misto (madeira limpa = RNP; tratada com biocidas = RP) |
| **04** | Curtição de couros, tratamento de têxteis, vestuário | Misto (têxteis = RNP; cromados = RP) |
| **05** | Refino de petróleo, purificação de gás natural, carvão | Maioria RP (hidrocarbonetos, benzeno, PAH) |
| **06** | Processos químicos inorgânicos | Maioria RP (ácidos, bases, metais pesados) |
| **07** | Processos químicos orgânicos | Maioria RP (solventes, pesticidas) |
| **08** | Fabricação de tintas, vernizes, adesivos, selantes, tinturas | Misto (tintas com metais pesados = RP) |
| **09** | Indústria fotográfica | Misto (reveladores com prata = RP) |
| **10** | Fabricação de vidro, cerâmicas, metais, cimento | Misto |
| **11** | Tratamento e revestimento de superfícies metálicas, hidrometalurgia | Maioria RP (cromatos, cianetos, níquel) |
| **12** | Moldagem e tratamento mecânico de metais e plásticos | Misto |

### Capítulos por Tipo de Resíduo (13–19)

| Cap | Tipo de Resíduo | Periculosidade Geral |
|-----|----------------|---------------------|
| **13** | Óleos usados e resíduos de combustíveis líquidos/pastosos | Todos RP |
| **14** | Resíduos de solventes, fluidos de refrigeração, gases propulsores | Todos RP |
| **15** | Embalagens, sucatas, eletrônicos, pilhas, resíduos domésticos separados | **Misto — ver detalhamento abaixo** |
| **16** | Resíduos não especificados em outros capítulos (veículos, equipamentos elétricos) | Misto |
| **17** | Resíduos de construção e demolição | Maioria RNP; amianto = RP |
| **18** | Resíduos de serviços de saúde (RSS) | Todos RP |
| **19** | Resíduos de instalações de tratamento (ETE, ETA, incineração) | Misto |

---

## 7. Capítulo 15 — Detalhamento (Principal para Oikos)

O capítulo 15 é o mais relevante para o contexto de coleta seletiva e reciclagem urbana.

### 15 01 — Embalagens Vazias

| Código | RP/RNP | Tipo | Descrição |
|--------|--------|------|-----------|
| 15 01 01 00 | RNP | U | Embalagens de papel e papelão misturados |
| 15 01 01 01 | RNP | U | Embalagens de papel e cartão |
| 15 01 01 02 | RNP | U | Embalagens de papelão |
| 15 01 02 00 | RNP | U | Embalagens de plástico |
| 15 01 03 00 | RNP | U | Embalagens de madeira |
| 15 01 04 00 | RNP | U | Embalagens de metal |
| 15 01 05 00 | RNP | U | Embalagens tipo longa-vida |
| 15 01 06 00 | RNP | U | Mistura de embalagens |
| 15 01 07 00 | RNP | U | Embalagens de vidro |
| 15 01 09 00 | RNP | U | Embalagens têxteis |
| **15 01 10 00** | **RP** | **U** | **Embalagens contaminadas por substâncias perigosas (incluindo aerossóis cheios)** |
| 15 01 11 00 | RP | U | Embalagens de metal com matriz porosa sólida perigosa (amianto) |
| 15 01 12 00 | RNP | U | Embalagens de metal e recipientes vazios sob pressão, sem matriz porosa sólida |

> **Nota:** A distinção crítica é entre embalagem LIMPA (RNP) e embalagem CONTAMINADA (RP). Embalagem de agrotóxico, solvente ou substância perigosa = RP.

### 15 02 — Absorventes, EPI, Panos de Limpeza

| Código | RP/RNP | Tipo | Descrição |
|--------|--------|------|-----------|
| 15 02 02 00 | RP | E | Absorventes/EPI/panos contaminados por substâncias perigosas |
| 15 02 03 00 | RNP | E | Absorventes/EPI/panos NÃO contaminados |

### 15 03 — Sucatas e Materiais Recuperáveis

| Código | RP/RNP | Tipo | Descrição |
|--------|--------|------|-----------|
| 15 03 01 00 | RNP | U | Sucatas e aparas de plásticos |
| 15 03 02 00 | RNP | U | Sucatas, aparas e cabos metálicos misturados (ferrosos e não ferrosos) |
| 15 03 02 01 | RNP | U | Sucatas, aparas e cabos metálicos ferrosos |
| 15 03 02 02 | RNP | U | Sucatas, aparas e cabos metálicos não ferrosos |
| 15 03 03 00 | RNP | U | Sucatas de vidro |
| 15 03 04 00 | RNP | U | Aparas e restos de papel, cartão e papelão misturados |
| 15 03 04 01 | RNP | U | Aparas e restos de papel e cartão |
| 15 03 04 02 | RNP | U | Aparas e restos de papelão |
| 15 03 05 00 | RNP | U | Aparas e restos de tecidos e produtos têxteis |
| 15 03 06 00 | RNP | U | Aparas e resíduos de madeira |
| 15 03 07 00 | RNP | U | Resíduos de borrachas, correias, mangueiras |
| 15 03 08 00 | RP | E | Óleos e gorduras alimentares com substâncias perigosas |
| 15 03 09 00 | RNP | E | Óleos e gorduras (não abrangidos em 15 03 08 00) |
| **15 03 98 00** | **RP** | **E** | **Sucatas/materiais contaminados com substâncias perigosas** |

> **Exemplos LGR (conforme a norma):** Sucatas e aparas de plásticos incluem mantas de cura, telas de proteção, tubos de água, esgoto e conduítes. Sucatas metálicas incluem residuos de ferragens, vigas, chapas, latas de tinta vazias, alumínio, fios de cobre.

### 15 04 — Pilhas, Baterias e Acumuladores Elétricos

| Código | RP/RNP | Tipo | Descrição |
|--------|--------|------|-----------|
| **15 04 01 00** | **RP** | **E** | Pilhas/baterias portáteis com mercúrio, pilhas-botão, NiCd |
| **15 04 01 01** | **RP** | **U** | Baterias de lítio portáteis |
| 15 04 02 00 | RNP | E | Outras pilhas/baterias portáteis (não abrangidas em 15 04 01 00) |
| 15 04 02 01 | RNP | U | Pilhas alcalinas |
| **15 04 03 00** | **RP** | **U** | Bateria e acumuladores estacionários à base de chumbo |
| **15 04 04 00** | **RP** | **U** | Bateria e acumuladores estacionários de níquel-cádmio |
| **15 04 05 00** | **RP** | **U** | Bateria e acumuladores estacionários de lítio |
| **15 04 06 00** | **RP** | **U** | Eletrólitos de pilhas e acumuladores coletados separadamente |
| **15 04 07 00** | **RP** | **U** | Baterias de níquel-hidreto metálico (NiMH) portáteis e estacionárias |

> **Resumo:** A maioria das baterias/pilhas é RP. Somente pilhas alcalinas comuns (AA, AAA, C, D) são classificadas como RNP (entrada única).

### 15 05 — Outros Resíduos de Geração Não Específica

| Código | RP/RNP | Tipo | Descrição |
|--------|--------|------|-----------|
| **15 05 01 00** | **RP** | **E** | Lâmpadas fluorescentes, vapor de sódio, mercúrio e luz mista |
| 15 05 02 00 | RNP | E | Lâmpadas não abrangidas em 15 05 01 00 (LED, incandescentes) |
| **15 05 03 00** | **RP** | **E** | Produtos eletroeletrônicos fora de uso COM substâncias perigosas |
| 15 05 04 00 | RNP | E | Produtos eletroeletrônicos fora de uso SEM substâncias perigosas |
| **15 05 05 00** | **RP** | **E** | Componentes de EEE fora de uso COM substâncias perigosas |
| 15 05 06 00 | RNP | E | Componentes de EEE fora de uso SEM substâncias perigosas |
| 15 05 08 00 | RNP | U | Medicamentos vencidos/domiciliares (uso domiciliar comum) |
| **15 05 09 00** | **RP** | **U** | Resíduos de desinfetantes fora de uso ou obsoletos |
| **15 05 10 00** | **RP** | **U** | Embalagens de desinfetantes |

> **Importante:** Eletroeletrônicos são Entrada-Espelho (E) — a classificação depende da análise da composição. Equipamentos com PCB, mercúrio, CFC ou outros componentes perigosos = RP. Equipamentos sem esses componentes = RNP.

---

## 8. Capítulo 16 — Resíduos Não Especificados (Veículos e Equipamentos)

### 16 01 — Veículos em Fim de Vida

| Código | RP/RNP | Descrição |
|--------|--------|-----------|
| **16 01 03 00** | **RP** | Veículos em fim de vida **COM** fluidos (óleos, combustível, aditivos, baterias, air bags) |
| 16 01 04 00 | RNP | Veículos em fim de vida **SEM** fluidos e componentes perigosos |
| 16 01 07 00 | RP | Filtros de óleo automotivos |
| 16 01 08 00 | RP | Componentes e peças contendo mercúrio |
| 16 01 09 00 | RP | Componentes contaminados por PCB |
| 16 01 10 00 | RP | Componentes explosivos (air bags) |
| 16 01 13 00 | RP | Fluidos de freio |
| 16 01 24 00 | RNP | Pneus inservíveis ou usados de automóveis |
| 16 01 25 00 | RNP | Pneus inservíveis ou usados de bicicletas |
| 16 01 26 00 | RNP | Pneus inservíveis ou usados de caminhões e ônibus |
| 16 01 27 00 | RNP | Pneus inservíveis ou usados de motocicletas |

### 16 02 — Equipamentos Elétricos e Eletrônicos (REEE/WEEE)

| Código | RP/RNP | Tipo | Descrição |
|--------|--------|------|-----------|
| 16 02 09 00 | RP | E | Transformadores/capacitores contaminados por PCB |
| 16 02 10 00 | RP | E | Equipamentos fora de uso contaminados por PCB |
| 16 02 11 00 | RP | E | Equipamentos fora de uso contendo CFC/HCFC/HFC |
| 16 02 12 00 | RP | E | Equipamentos fora de uso contendo amianto livre |
| 16 02 13 00 | RP | E | Equipamentos fora de uso com outros componentes perigosos |
| 16 02 14 00 | RNP | E | Equipamentos fora de uso (sem substâncias perigosas) |
| 16 02 15 00 | RP | E | Componentes perigosos retirados de equipamentos fora de uso |
| 16 02 16 00 | RNP | E | Componentes não perigosos retirados de equipamentos fora de uso |

---

## 9. Capítulo 17 — Construção e Demolição (RCD)

| Subcap | Descrição | Periculosidade |
|--------|-----------|---------------|
| **17 01** | Cimento, tijolos, cerâmica | RNP (Categoria A — Conama 307/2002) |
| **17 02** | Madeiras | Madeira não tratada = RNP; madeira tratada com biocidas (CCA, CCB, creosoto) = RP |
| **17 03** | Betuminosas, asfalto | Sem alcatrão = RNP; com alcatrão = RP |
| **17 05** | Solos, rochas, dragagem | Solo não contaminado = RNP; solo contaminado = RP |
| **17 06** | Materiais de isolamento | Sem amianto = RNP; **com amianto = RP** |
| **17 08** | Gesso | RNP |
| **17 09** | Outros (misturas) | Depende de contaminação |

---

## 10. Capítulo 18 — Resíduos de Serviços de Saúde (RSS)

> **TODOS os RSS são classificados como RP (Resíduo Perigoso) — nenhuma exceção relevante para coleta convencional.**

### 18 01 — Resíduos com Agentes Biológicos (Risco de Infecção)

| Código | Descrição |
|--------|-----------|
| 18 01 01 00 | Culturas de micro-organismos; descarte de vacinas; resíduos de laboratório de manipulação genética |
| 18 01 02 00 | Resíduos com contaminação biológica com elevado risco individual e epidemiológico |
| 18 01 03 00 | Bolsas transfusionais rejeitadas (sangue ou hemocomponentes) |
| 18 01 04 00 | Amostras de laboratório com sangue ou líquidos corpóreos na forma livre |
| 18 01 05 00 | Carcaças de animais inoculados com micro-organismos |
| 18 01 06 00 | Peças anatômicas humanas |
| 18 01 07 00 | Kits de linhas arteriais, endovenosas e dialisadores descartados |
| 18 01 08 00 | Filtros de ar de área contaminada |
| 18 01 09 00 | Amostras com fezes, urina e secreções (patógenos de baixo risco, mas ainda RP) |
| 18 01 10 00 | Resíduos de cirurgia plástica (tecido adiposo de lipoaspiração) |
| 18 01 11 00 | Recipientes/materiais do processo de assistência à saúde (sem sangue livre) |
| 18 01 12 00 | Peças anatômicas (órgãos e tecidos) de cirurgias |
| 18 01 13 00 | Carcaças de animais não inoculados |
| 18 01 14 00 | Bolsas transfusionais vazias ou com volume residual |
| 18 01 15 00 | Tecidos/fluidos com suspeita de príons |

### 18 02 — RSS com Substâncias Químicas Perigosas

| Código | Descrição |
|--------|-----------|
| 18 02 01 00 | Produtos hormonais, antimicrobianos, citostáticos, antineoplásicos (descartados por serviços de saúde ou farmácias) |
| 18 02 02 00 | Saneantes, desinfetantes, reagentes de laboratório contendo metais pesados |
| 18 02 03 00 | Efluentes de processadores de imagem (reveladores e fixadores) |
| 18 02 04 00 | Efluentes de equipamentos automatizados de análises clínicas |
| 18 02 98 00 | Outros RSS perigosos |

### 18 03 — RSS com Radionuclídeos

| Código | Descrição |
|--------|-----------|
| 18 03 01 00 | Resíduos de medicina nuclear e radioterapia com radionuclídeos acima dos limites de eliminação |

### 18 04 — Materiais Perfurocortantes

| Código | Descrição |
|--------|-----------|
| 18 04 01 00 | Agulhas, escalpes, ampolas, lâminas de bisturi, lancetas, micropipetas, vidros quebrados de laboratório |

> **Para o Oikos:** RSS são de coleta especializada. Empresas comuns de reciclagem NÃO devem aceitar RSS. O risco de contaminação biológica, química ou radioativa é extremamente alto.

---

## 11. Capítulo 13 — Óleos Usados

> **Todos RP (Resíduo Perigoso)**

| Subcap | Descrição |
|--------|-----------|
| 13 01 | Óleos hidráulicos usados (contaminados por PCB = RP U; não PCB = RP U) |
| 13 02 | Óleos de motores, transmissões e lubrificação usados |
| 13 03 | Óleos isolantes, de refrigeração e de transmissão de calor usados |
| 13 04 | Óleos bunker (de porão) de navios |
| 13 05 | Conteúdo de separadores óleo-água |
| 13 07 | Resíduos de combustíveis líquidos (óleo combustível, diesel, gasolina) |
| 13 08 | Outros óleos usados (graxas, emulsões) |

---

## 12. Capítulo 15 01 — Tabela de Embalagens vs. Resolução CONAMA 307/2002

A norma referencia a Resolução CONAMA 307/2002 explicitamente nos exemplos:

| Tipo | Categoria CONAMA 307 | LGR |
|------|---------------------|-----|
| Cimento, concreto, cerâmica, tijolos | **Categoria A** (reutilizáveis/recicláveis como agregados) | RNP |
| Madeira serrada não tratada | **Categoria B** (recicláveis) | RNP |
| Papelão, papel, plástico, metal, vidro, gesso | **Categoria B** (recicláveis) | RNP |
| Plásticos reforçados com fibra, forros PVC | **Categoria C** (sem tecnologia de reciclagem) | RNP |
| Madeira tratada com biocidas | **Categoria D** (perigosos) | RP |

---

## 13. Pontos Críticos para o Sistema Oikos

### 13.1 Entrada-Espelho nos Eletroeletrônicos
Produtos eletroeletrônicos (código `15 05 03 00` / `15 05 04 00`) são **Entrada-Espelho**: a classificação exige análise da composição. Para fins práticos no Oikos, equipamentos com:
- Mercúrio, PCB, CFC/HCFC → **RP**
- Chumbo (soldas, monitores CRT) → verificar
- Sem os acima → potencialmente **RNP**

### 13.2 Baterias Portáteis
- **Lítio (Li-ion, LiPo)** = sempre **RP** (risco de incêndio/explosão)
- **NiMH** = **RP**
- **NiCd** = **RP**
- **Chumbo-ácido** = **RP**
- **Alcalinas (AA, AAA, etc.)** = **RNP** (pilhas comuns)
- **Pilhas-botão** = **RP** (contêm mercúrio ou lítio)

### 13.3 Lâmpadas
- **Fluorescentes, vapor de sódio/mercúrio** = **RP** (contêm mercúrio)
- **LED, incandescentes** = **RNP** (em geral)

### 13.4 Medicamentos Domiciliares
- **Medicamentos comuns vencidos** (uso domiciliar) = **RNP** (`15 05 08 00`)
- **Hormônios, antimicrobianos, citostáticos, antineoplásicos** = **RP** (`18 02 01 00`)
- A distinção é o **tipo e origem** do medicamento e quem descarta.

### 13.5 Óleo de Cozinha Usado
- **Óleo vegetal alimentar** sem contaminação = **RNP** (`15 03 09 00`, `19 08 09 00`)
- **Óleo mineral (lubrificante, motor)** = **RP** (cap. 13)

---

## 14. Referências Normativas Citadas na NBR 10004-2:2024

| Referência | Assunto |
|-----------|---------|
| Resolução CONAMA 307/2002 | Resíduos da construção civil — Categorias A, B, C, D |
| Resolução CONAMA 420/2009 | Qualidade do solo e prevenção de contaminação |
| Convenção de Estocolmo | POPs (Poluentes Orgânicos Persistentes) |
| Acordo de Minamata | Mercúrio |
| RDC ANVISA | Resíduos de serviços de saúde |

---

## 15. Fluxo de Decisão Simplificado para Oikos

```
O resíduo é de SERVIÇO DE SAÚDE (hospital, clínica, laboratório)?
  └─ SIM → RP (Classe 1). NÃO COLETAR. Coleta especializada.

O resíduo é ÓLEO MINERAL (motor, lubrificante, hidráulico)?
  └─ SIM → RP (Classe 1). Coleta especializada (PNRS).

O resíduo é BATERIA/PILHA?
  └─ Lítio, NiMH, NiCd, Chumbo-ácido → RP
  └─ Alcalinas comuns → RNP (mas logística reversa obrigatória pelo PNRS)

O resíduo é ELETROELETRÔNICO?
  └─ Analisar componentes → RP se contiver mercúrio, PCB, CFC
  └─ Em geral → tratar como RP para segurança (Entrada-Espelho)

O resíduo é EMBALAGEM?
  └─ Limpa (papel, plástico, metal, vidro, longa-vida) → RNP (reciclável)
  └─ Contaminada com produto perigoso → RP

O resíduo é CONSTRUÇÃO CIVIL?
  └─ Cimento, tijolo, cerâmica, madeira não tratada → RNP (Categoria A/B)
  └─ Com amianto → RP (coleta especializada)

O resíduo é LÂMPADA?
  └─ Fluorescente, vapor de mercúrio → RP
  └─ LED, incandescente → RNP (em geral)
```

---

*Documento gerado a partir da leitura integral da ABNT NBR 10004-1:2024 (29 páginas) e leitura seletiva da ABNT NBR 10004-2:2024 (páginas 1–162 da LGR), em 2026-06-08.*
