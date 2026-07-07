# Referência: Ferramentas Modernas para CLI e TUI

Pesquisa realizada em 2026-07-06 sobre o ecossistema atual de construção de CLIs e TUIs no Node.js/TypeScript.

---

## 1. CLI Argument Parsing & Estrutura

### Commander.js

- **ID Context7:** `/tj/commander.js`
- **Snippets:** 175 | **Reputação:** High | **Benchmark:** 82.83
- **Descrição:** Framework completo para CLIs com subcomandos, opções tipadas, help automático, validação.
- **Ideal para:** CLIs multi-comando (ex: `cli --city X --state MT --target 40`)

```ts
import { Command } from "commander";

const program = new Command();

program
  .name("cli")
  .description("Gera empresas de reciclagem para uma cidade")
  .version("1.0.0")
  .requiredOption("--city <name>", "Nome da cidade")
  .requiredOption("--state <uf>", "Sigla da UF")
  .option("--target <number>", "Meta de empresas", parseInt)
  .option("--force", "Sobrescrever arquivo existente")
  .action((options) => {
    console.log(`Buscando empresas em ${options.city}-${options.state}`);
  });

program.parse();
```

### Oclif

- **ID Context7:** `/websites/oclif_io`
- **Snippets:** 388 | **Reputação:** High | **Benchmark:** 85.48
- **Descrição:** Framework opinativo da Heroku/Salesforce. Geração de código via CLI, sistema de plugins, TypeScript nativo.
- **Ideal para:** CLIs corporativos, plugin-based, com muitos subcomandos.

```bash
# Geração de novo projeto
oclif generate mycli
# Geração de comando
oclif generate command recycling:fetch
```

### Yargs

- **Descrição:** Clássico, parse robusto de argumentos, middleware, suporte a TypeScript.
- **Ideal para:** Alternativa ao Commander, mais flexível, menor.

### `node:util` `parseArgs` (nativo Node 24)

- **Descrição:** Nativo do Node 24, zero dependência.
- **Ideal para:** CLIs simples, sem subcomandos (o que o projeto atual usa).

```ts
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    city: { type: "string", multiple: true },
    state: { type: "string", multiple: true },
    target: { type: "string" },
    force: { type: "boolean", default: false },
  },
});
```

---

## 2. Prompt Libraries (Input Interativo)

### Clack (`@clack/prompts`)

- **ID Context7:** `/bombshell-dev/clack`
- **Snippets:** 89 | **Reputação:** High | **Benchmark:** 81.62
- **Descrição:** Moderno, bonito, prompts prontos. Leve, zero dependências pesadas.
- **Ideal para:** Substituir prompts manuais com experiência interativa rica.

```ts
import { text, select, multiselect, confirm, spinner } from "@clack/prompts";

// Text input
const city = await text({
  message: "Qual cidade?",
  placeholder: "Rondonópolis",
  validate(value) {
    if (value.length === 0) return "Cidade é obrigatória";
  },
});

// Select
const state = await select({
  message: "Selecione o estado",
  options: [
    { value: "MT", label: "Mato Grosso" },
    { value: "SP", label: "São Paulo" },
  ],
});

// Multi-select
const queries = await multiselect({
  message: "Queries para buscar no Google Places",
  options: [
    { value: "reciclagem", label: "Reciclagem" },
    { value: "cooperativa reciclagem", label: "Cooperativa" },
    { value: "ferro velho", label: "Ferro Velho" },
  ],
});

// Confirm
const force = await confirm({
  message: "Sobrescrever arquivo existente?",
  initialValue: false,
});

// Spinner
const s = spinner();
s.start("Buscando dados do Google Places...");
// ... operação assíncrona
s.stop("Dados obtidos com sucesso");
```

### Enquirer

- **ID Context7:** `/enquirer/enquirer`
- **Snippets:** 168 | **Reputação:** High | **Benchmark:** 62.5
- **Descrição:** Customizável, estilizável, prompts complexos (forms, survey, autocomplete).
- **Ideal para:** Quando precisa de tipos de prompt mais variados que o Clack.

```ts
const { prompt } = require("enquirer");

const resposta = await prompt({
  type: "input",
  name: "username",
  message: "Qual seu nome de usuário?",
});
```

### Inquirer.js

- **ID Context7:** `/sboudrias/inquirer.js`
- **Snippets:** 442 | **Reputação:** High | **Benchmark:** 84.62
- **Descrição:** O mais popular historicamente. Maior variedade de prompts. Ecossistema maduro.
- **Ideal para:** Projetos que precisam de estabilidade e muitos tipos de input prontos.

---

## 3. TUI Frameworks (Rich Terminal UI)

### Ink

- **ID Context7:** `/vadimdemedes/ink`
- **Snippets:** 727 | **Reputação:** High | **Benchmark:** 82.44
- **Descrição:** React no terminal. Componentes com Flexbox (Yoga), HMR, renderização eficiente.
- **Ideal para:** Dashboards interativos, TUIs complexas, apps que precisam de layout declarativo.

```tsx
import React from "react";
import { render, Box, Text } from "ink";

const App = () => (
  <Box flexDirection="column" padding={1}>
    <Text bold color="green">
      Gerador de Empresas de Reciclagem
    </Text>
    <Box marginTop={1}>
      <Text>Cidade: Rondonópolis-MT</Text>
    </Box>
    <Box>
      <Text color="yellow">Empresas encontradas: 12</Text>
    </Box>
  </Box>
);

render(<App />);
```

### Ink UI (`@inkjs/ui`)

- **ID Context7:** `/vadimdemedes/ink-ui`
- **Snippets:** 58 | **Reputação:** High | **Benchmark:** 80.55
- **Descrição:** Componentes prontos para Ink — Select, TextInput, Spinner, ProgressBar, Confirm.
- **Ideal para:** Acelerar TUI com Ink sem construir tudo do zero.

```tsx
import React, { useState } from "react";
import { render, Box, Text } from "ink";
import { Select, TextInput } from "@inkjs/ui";

function Example() {
  const [cidade, setCidade] = useState("");

  return (
    <Box flexDirection="column" gap={1}>
      <Select
        options={[
          { label: "Rondonópolis", value: "rondonopolis" },
          { label: "Cuiabá", value: "cuiaba" },
          { label: "Campinas", value: "campinas" },
        ]}
        onChange={setCidade}
      />
      <TextInput
        placeholder="Digite a UF..."
        submit={(value) => console.log(`UF: ${value}`)}
      />
    </Box>
  );
}

render(<Example />);
```

### Terminal Kit

- **ID Context7:** `/cronvel/terminal-kit`
- **Snippets:** 1801 | **Reputação:** High | **Benchmark:** 77.25
- **Descrição:** TUI completa não-React. Screen buffer com composição 32-bit, mouse, image loading, 256 cores, input fields, progress bars.
- **Ideal para:** TUIs sem React, baixo nível, controle total do terminal.

---

## 4. Progresso & Visual Feedback

### Ora

- **ID Context7:** `/sindresorhus/ora`
- **Snippets:** 79 | **Reputação:** High | **Benchmark:** 94.43 (maior da lista)
- **Descrição:** O padrão-ouro para spinners elegantes. API simples, suporte a promises via `oraPromise`.
- **Ideal para:** Feedback visual durante operações assíncronas (chamadas de API, processamento).

```ts
import ora from "ora";
import { oraPromise } from "ora";

// Modo manual
const spinner = ora("Buscando empresas via Google Places...").start();
try {
  const places = await googlePlacesProvider.textSearch(query, bounds);
  spinner.succeed(`Encontradas ${places.length} empresas`);
} catch (error) {
  spinner.fail(`Erro na busca: ${error.message}`);
}

// Modo promise (automático)
const data = await oraPromise(
  fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    body: JSON.stringify({ textQuery: "reciclagem em Rondonópolis" }),
  }),
  {
    text: "Consultando Google Places...",
    successText: (res) => `Resposta obtida (status ${res.status})`,
    failText: (err) => `Falha na consulta: ${err.message}`,
  }
);
```

### Listr2

- **ID Context7:** `/listr2/listr2`
- **Snippets:** 278 | **Reputação:** Medium | **Benchmark:** 89.83
- **Descrição:** Task lists com progresso visual, subtasks, rollback, retry, renderers swappable (DefaultRenderer/TTY, SimpleRenderer/non-TTY, VerboseRenderer).
- **Ideal para:** Pipelines multi-etapa com feedback visual de cada passo.

```ts
import { Listr, delay } from "listr2";

const tasks = new Listr(
  [
    {
      title: "Resolvendo contexto da cidade",
      task: async (ctx) => {
        ctx.cityContext = await resolveCityUseCase.execute("Rondonópolis", "MT");
      },
    },
    {
      title: "Buscando empresas no Google Places",
      task: async (ctx) => {
        ctx.places = await fetchCityCompaniesUseCase.execute(ctx.cityContext, queries);
      },
    },
    {
      title: "Gerando empresas sintéticas (padding)",
      enabled: (ctx) => ctx.places.length < target,
      task: async (ctx) => {
        ctx.synthetic = syntheticGenerator.generate(target - ctx.places.length, ctx.cityContext);
      },
    },
    {
      title: "Escrevendo arquivo de seed",
      task: async (ctx) => {
        writer.write(ctx.cityContext, [...ctx.places, ...(ctx.synthetic || [])]);
      },
    },
  ],
  { concurrent: false, exitOnError: true }
);

await tasks.run();
```

---

## 5. Análise para o Projeto Atual

### O que o projeto usa hoje

```ts
// scripts/recycling-companies/cli.ts — composition root
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    city: { type: "string", multiple: true },
    state: { type: "string", multiple: true },
    target: { type: "string" },
    force: { type: "boolean", default: false },
  },
});
```

### Recomendações por complexidade

| Cenário | Stack recomendado | Dependências adicionais |
|---|---|---|
| **Manter simples** (atual) | `node:util` `parseArgs` + `console.log` | Zero |
| **+UX de prompts** | Clack (`@clack/prompts`) | 1 dependência (~20kB) |
| **+Spinners** | Ora (`ora` / `oraPromise`) | 1 dependência (~10kB) |
| **+Task pipeline** | Listr2 | 1 dependência (~50kB) |
| **Full CLI framework** | Commander.js + Ora + Clack | 3 dependências |
| **TUI interativa** | Ink + Ink UI | React + ~5 dependências |
| **TUI não-React** | Terminal Kit | 1 dependência (~200kB) |

### Estimativa de impacto

- **Commander.js** substitui `parseArgs` — ganha validação de tipo, help automático (`--help`), subcomandos se o CLI crescer.
- **Clack** adiciona prompts interativos — útil para `--force` (confirm dialog), seleção de cidade de uma lista (em vez de digitar), seleção de queries do Google.
- **Ora** é o de maior custo-benefício — feedback visual simples para operações que hoje rodam "silenciosas" (Google Places, IBGE, escrita de arquivo).
- **Listr2** organiza o pipeline em etapas visíveis — cada passo mostra status (pending/running/completed/failed) com spinner e mensagem.
- **Ink** só faz sentido se o CLI evoluir para um dashboard interativo (ex.: modo "watch" que monitora a geração de várias cidades em tempo real).

### Tendência no ecossistema de AI agents CLI

Ferramentas modernas para AI agents (Vercel CLI, Biome, `create-next-app`, `pkgx`, `mise`) estão usando o combo:

1. **Commander.js** (argumentos estruturados)
2. **Clack** (prompts bonitos e interativos)
3. **Ora** (spinners para operações async)
4. **Chalk** (cores no terminal — já coberto por libs como Clack)
5. **Picocolors** (alternativa mais leve que Chalk)

O padrão é: CLI framework pequeno + prompts interativos + spinners, sem React no terminal a menos que a complexidade da UI justifique.

---

## Referências

- Commander.js: https://github.com/tj/commander.js
- Clack: https://github.com/bombshell-dev/clack
- Ink: https://github.com/vadimdemedes/ink
- Ink UI: https://github.com/vadimdemedes/ink-ui
- Oclif: https://oclif.io
- Ora: https://github.com/sindresorhus/ora
- Listr2: https://github.com/listr2/listr2
- Enquirer: https://github.com/enquirer/enquirer
- Inquirer.js: https://github.com/SBoudrias/Inquirer.js
- Terminal Kit: https://github.com/cronvel/terminal-kit
