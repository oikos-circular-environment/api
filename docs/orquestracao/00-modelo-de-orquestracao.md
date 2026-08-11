# Orquestração de agentes — modelo de execução

Como o trabalho da `api` é executado por múltiplos agentes de IA sob um coordenador,
com roteamento por custo. Documento operacional: descreve o que existe e foi medido,
não uma proposta.

## Papéis

| Papel | Quem | Responsabilidade |
|---|---|---|
| Coordenador | Claude Opus, no worktree `development` | Decompõe, cria tasks, despacha, **verifica o resultado**, escala de tier, abre PR |
| Executor | opencode com preset fixo, no worktree da feature | Implementa uma task e reporta `worker_done` |
| Revisor | opencode `oikos-review` (read-only) | Lê o diff e reporta achados; nunca edita |

O coordenador nunca delega a **verificação**. Um executor barato tende a declarar
sucesso cedo, então quem roda os gates é o coordenador, sempre.

## Esteira de custo

A ordem é sempre do mais barato para o mais caro. Sobe de tier só quando o tier atual
falha de verdade.

```
opencode/big-pickle  →  google/gemini-3.6-flash  →  opencode/deepseek-v4-flash-free
                     →  opencode-go/kimi-k2.7-code  →  claude
       (free)                  (cota/pago)                  (pago)         (reserva)
```

**Exceção de roteamento:** task que precisa ler muito arquivo de uma vez começa direto no
`gemini-3.6-flash` — janela de contexto grande resolve num passo o que um modelo de
contexto curto faria em vários, e o total sai mais barato mesmo com o token custando mais.

### Critérios de escalonamento

Sobe de tier quando, e só quando:

- o worker envia `worker_done --outcome failed`; ou
- o worker reporta sucesso mas **um gate do coordenador reprova**; ou
- 3 falhas consecutivas na mesma task (o Orca abre circuit-break na dispatch).

Cada escalonamento é uma dispatch nova com `--retry-of <dispatch_id>`, para a tentativa
anterior continuar auditável.

## Providers testados e reprovados

Medidos nesta máquina, com a mesma tarefa de controle (ler um arquivo e responder o valor):

| Provider | Resultado | Causa |
|---|---|---|
| **Groq free** | ❌ inutilizável | `Request too large ... TPM: Limit 8000, Requested 51256`. O system prompt do opencode pede 32–51k tokens contra teto de 8k/min. Não é ajustável do nosso lado. |
| **OpenRouter free** | ❌ inutilizável | `nemotron-3-super-120b:free` e `gpt-oss-20b:free` estouraram timeout (>150s e >100s) sem resposta, na tarefa que o `big-pickle` resolve em segundos. Fila do tier gratuito. |
| **Ollama local** (`qwen2.5-coder:3b`, 16k ctx) | ❌ inutilizável | Emite JSON de tool call cru em vez da resposta. Desabilitar `tools` no preset não resolve: os MCPs globais (context7, pencil, figma, chrome-devtools) reinjetam ferramentas que o modelo de 3B tenta chamar. |

O tier local ainda pode voltar a fazer sentido com mais VRAM (aqui: RTX 4050, 6 GB) ou um
modelo com tool-calling mais confiável. O teste é reproduzível — basta repetir a tarefa
de controle.

**Nota sobre o Ollama:** existem dois compose separados de propósito.
`docker-compose.ollama.yml` (porta 11434, `OLLAMA_CONTEXT_LENGTH=4096`) é do **graphify**,
com o contexto calibrado para o chunking de arquivos — **não alterar**.
`docker-compose.ollama-agents.yml` (porta 11435, 16k) é o dos agentes, isolado em volume
próprio justamente para não interferir naquele.

## Presets

Ficam no config **global** do opencode (`~/.config/opencode/opencode.json`), não no repo:
são operacionais e amarrados às credenciais da máquina, e manter fora do repo evita
poluir o diff das features.

| Preset | Modelo | Permissão |
|---|---|---|
| `oikos-exec` | `opencode/big-pickle` | edit + bash |
| `oikos-exec-gemini` | `google/gemini-3.6-flash` | edit + bash |
| `oikos-exec-alt` | `opencode/deepseek-v4-flash-free` | edit + bash |
| `oikos-exec-go` | `opencode-go/kimi-k2.7-code` | edit + bash |
| `oikos-review` | `opencode/ling-3.0-tiny-free` | read-only |
| `oikos-text` | `ollama/qwen2.5-coder:3b` | sem ferramentas (inviável, ver acima) |

Os prompts dos presets estão em `~/.config/opencode/prompt/`. Eles reforçam: orientação
por `graphify query` antes de grep, zero comentário explicativo, SOLID com serviço
externo atrás de interface, e proibição de merge/push em `development` e `production`.

Convenções de repo (testes em inglês, `describe` kebab-case, in-memory em teste unitário)
não são repetidas no prompt: o opencode lê `AGENTS.md` sozinho.

## Ciclo de uma task

```bash
orca-ide orchestration run-create --objective "<épico>" --json
orca-ide orchestration task-create --spec "<task>" [--deps '["<task_anterior>"]'] --json

orca-ide terminal create --worktree id:<repo>::<path> \
  --title "<task>" --command "opencode --agent oikos-exec" --json
orca-ide terminal wait --terminal <handle> --for tui-idle --timeout-ms 120000 --json
orca-ide orchestration dispatch --task <task_id> --to <handle> --inject --json

orca-ide orchestration check --wait --types worker_done,escalation,question \
  --timeout-ms 2700000 --json
```

`--inject` é o que injeta o preâmbulo de ciclo de vida no worker — sem ele o agente não
sabe reportar `worker_done`. Depois de cada `worker_done` aceito, o coordenador roda
`worker-release` (ou reusa o terminal para a próxima task) antes de esperar de novo.

`worker-start` seria a via composta e mais curta, mas seu `--model` só aceita Claude,
Codex e Cursor. Como o roteamento por custo depende de fixar o modelo do opencode, a via
de dois passos (`terminal create` com argv custom + `dispatch --inject`) é a que usamos.

### Execução sequencial

Uma task por vez. Sub-issues de um mesmo épico costumam mexer nos mesmos arquivos
(`prisma/schema.prisma`, `src/app.ts`), e paralelizar ali gera conflito sem ganho. Todas
compartilham **um worktree e uma branch**, e o épico fecha em um PR.

## Gates do coordenador

Rodados pelo coordenador após cada `worker_done`, antes de aceitar a task:

```bash
npx tsc --noEmit
npm run lint
npm run test              # unit
npm run test:integration  # integração
npm run test:e2e          # e2e
```

Mais a inspeção do diff: zero comentário explicativo, serviço externo atrás de interface,
documentação Scalar acompanhando rotas novas.

## Limites

- **Nunca** fazer merge de PR, nem push direto em `development` ou `production`. O
  coordenador abre o PR e para ali.
- Executores não usam `--no-verify`. Os hooks de lefthook valem para todo mundo.
- Worker com permissão de `edit`/`bash` automática fica confinado ao worktree da feature,
  que é descartável (`git worktree remove`) e não é o checkout principal.

Medições de custo e tempo por modelo: [`01-custo-e-tempo.md`](./01-custo-e-tempo.md).
