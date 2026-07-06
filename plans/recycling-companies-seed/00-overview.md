# Gerador de Empresas de Reciclagem Multi-Cidade — Visão Geral

Hoje `scripts/fetch-recycling-places.ts` é um script único, hardcoded para Rondonópolis-MT (bounding box, IBGE ids e estado fixos no topo do arquivo). Toda empresa recebe os mesmos 4 resíduos e 3 serviços fixos, e um CNPJ fake sequencial sem dígito verificador. Isso não escala para os testes que precisam rodar contra outras cidades com dados variados.

Objetivo: um pacote modular que, para qualquer cidade brasileira escolhida (nome + UF), busca empresas reais via Google Places, complementa lacunas via Faker, classifica corretamente o tipo de empresa, e opcionalmente completa até uma meta de quantidade com empresas sintéticas — mantendo nome/endereço/geolocalização fiéis ao Google sempre que existirem.

---

## Bug descoberto (pré-requisito do trabalho)

`prisma/seeds/recycling-companies.ts` **ignora completamente** os campos `wastes`/`services` do JSON gerado e sempre aplica suas próprias constantes `DEFAULT_WASTES`/`DEFAULT_SERVICES` fixas para toda empresa. Mesmo que o gerador produza variedade, ela nunca chega ao banco hoje. Corrigir isso é pré-requisito para o objetivo de "dados variados" fazer sentido — ver `01-technical-plan.md`.

## Dataset legado desalinhado

`prisma/seeds/recycling-companies.json` (48 empresas de Rondonópolis) usa um shape antigo: `waste_type: "RECYCLABLE"` em vez de `waste_category_name`, `services: []`, campos que não existem no Prisma (`is_headquarters`, `accept_appointments`), e **`quantity: "0.00"` em todo item — o que viola `companyWasteSchema.quantity.positive()`**. A migração desse arquivo exige uma transformação pontual, não uma cópia direta.

---

## Decisões de Design

### Resolução geográfica 100% dinâmica
Sem lista de cidades mantida manualmente. Google Geocoding resolve bounds/centro da cidade; a API pública do IBGE (`servicodados.ibge.gov.br`, gratuita, sem chave) resolve `city_ibge_id`/`state_ibge_id`/`state_code`. Confirmado por teste real: a API do IBGE não tem busca por nome — a chamada correta é `estados/{UF}/municipios` (lista da UF) com match client-side por nome normalizado.

Para o Geocoding, usamos o SDK oficial `@googlemaps/google-maps-services-js` (nova devDependency) em vez de `fetch()` cru — é estável, cobre Geocoding de primeira classe com autenticação simples por API key. Para Places, permanece `fetch()` cru: o mesmo SDK só cobre a API **legada** de Places, e o único SDK oficial da "Places API (New)" está em preview (instável) e pressupõe autenticação via ADC/service account, incompatível com a chave simples já usada hoje.

### Arquitetura orientada a objetos, sem persistência nova por enquanto
O código é organizado em camadas explícitas — `entities/` (tipos de domínio), `providers/` (interfaces + implementações para as APIs externas), `services/` (lógica de domínio pura, uma responsabilidade por classe), `use-cases/` (orquestração via injeção de construtor) e `writers/` (saída do arquivo de seed) — espelhando o padrão já usado em `src/modules/` (interface + implementação, injeção via construtor, sem container de IoC). Isso deixa o código pronto para, no futuro, virar um serviço isolado sem redesenho.

**Persistência de dados brutos fica para depois.** Avaliamos SQLite (`node:sqlite`, nativo do Node 24) como cache de dados brutos, mas foi descartado por ora: quando chegar a hora de persistir, deve ser via **Prisma** — consistente com o resto do stack, não outra ferramenta. Por enquanto validamos via JSON (como já era feito), e só depois de validado o fluxo ponta a ponta é que a persistência entra, se fizer sentido.

### Google é fonte de verdade para identidade real; Faker só preenche lacunas
Nome, endereço e geolocalização **nunca são fabricados** quando existe dado real do Google — isso traz familiaridade a quem testa. Faker preenche apenas o que falta (telefone, email, horários, CNPJ/CPF válido, variedade de resíduos/serviços). Empresas 100% sintéticas só existem se `--target` pedir mais unidades do que o Google retornou para aquela cidade.

### Diversificação de `company_type`/`identity_type` por sinais reais
Classificação heurística a partir de nome/endereço retornado pelo Google: prefeitura/secretaria/ecoponto → `GOVERNMENT`; cooperativa/associação/ONG → `ONG`; sucata/ferro-velho informal → `COLLECTOR` com CPF; default → `COMPANY`/CNPJ. Ecopontos (locais geridos por município) são marcados explicitamente (`_source.is_ecoponto`) para permitir análises futuras.

### Migração, não regeneração, do dataset de Rondonópolis
Preserva o custo já pago em chamadas à API do Google. Uma transformação local (zero rede) corrige o shape para o schema atual e substitui `quantity: "0.00"` por valores positivos.

### Arquivos `.http` (REST Client) para inspeção manual
Pasta dedicada com requests prontos (Google Places Text Search/Details, Google Geocoding, IBGE municípios) usando a sintaxe da extensão [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client), para conferir request/response de cada API externa antes de confiar nelas no código. Não faz parte do fluxo de execução do script.

---

## Melhoria futura: seleção interativa de estado/cidade

Quando executado sem `--city`/`--state`, o CLI poderia entrar em modo interativo usando prompts como `@clack/prompts`. O usuário selecionaria o estado em uma lista (consumindo o endpoint `estados` do IBGE), depois a cidade via busca com autocomplete (consumindo `estados/{UF}/municipios` do IBGE), eliminando erros de digitação e chamadas desnecessárias à API Google Geocoding para nomes digitados errados. Também seria possível adicionar múltiplas cidades no mesmo ciclo, e os prompts de `--target` e `--force` seriam feitos interativamente.

A API pública do IBGE (`servicodados.ibge.gov.br`, gratuita, sem chave) já expõe ambos os endpoints necessários — `estados` (lista de UFs) e `estados/{UF}/municipios` (lista de municípios) — sem necessidade de Brasil API como fallback.

## Fora de escopo

- Não há dimensão de produto/UX — é uma ferramenta de tooling para gerar dados de teste/dev.
- Não inclui persistência de dados brutos (cache de respostas do Google/IBGE) — fica para uma fase futura, via Prisma, após validação via JSON.
- Não inclui deduplicação de `identity` entre execuções separadas do processo (o `Set` de unicidade vive só durante uma execução; o backstop entre execuções é a constraint `@unique` do banco).
- Não inclui a re-geração de variedade para o dataset já migrado de Rondonópolis (fica registrado como follow-up opcional).
- Não inclui um servidor HTTP próprio (ideia de "serviço isolado consumível pela API principal" fica só como preparação arquitetural — interfaces/DI — não como entrega desta etapa).
- **CLI/TUI improvements (pesquisa de ferramentas modernas):** o composition root atual usa `node:util` `parseArgs` (nativo, zero dependência), o que atende bem ao escopo atual. Como melhoria futura, registram-se as alternativas pesquisadas:
  - **Commander.js** — framework completo com subcomandos, validação, help automático, substituindo `parseArgs` cru.
  - **Clack (`@clack/prompts`)** — prompts interativos modernos (`text`, `select`, `multiselect`, `confirm`, `spinner`) para UX mais rica (ex.: selecionar cidade de uma lista, confirmar sobrescrita).
  - **Ora (`oraPromise`)** — spinners elegantes para operações assíncronas (Google Places, IBGE), com wrapping automático de promises.
  - **Listr2** — task lists com progresso visual para pipelines multi-etapa ("Resolvendo cidade → Buscando Google → Mapeando → Gerando sintéticas → Escrevendo JSON"), com suporte a subtasks, rollback e retry.
  - **Ink + Ink UI** — TUI completa com React no terminal (Flexbox, HMR), útil se o CLI evoluir para um dashboard interativo em tempo real.
  - **Enquirer / Inquirer.js** — bibliotecas clássicas de prompts, maior variedade de tipos de input (forms, survey, autocomplete).
  - **Terminal Kit** — TUI não-React com screen buffer, mouse, progress bars, útil para interfaces mais elaboradas sem React.
