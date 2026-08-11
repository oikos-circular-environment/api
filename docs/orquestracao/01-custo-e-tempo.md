# Custo e tempo por modelo

Medições reais da esteira de orquestração. Números vêm de `opencode stats` (custo
acumulado, medido antes/depois) e do relógio entre `dispatch` e `worker_done`.

Complementa [`00-modelo-de-orquestracao.md`](./00-modelo-de-orquestracao.md).

## Tarefa de controle

Antes de admitir um modelo na esteira, ele passa por uma tarefa mínima que exercita
tool calling: ler um arquivo do disco e responder o valor exportado. Um modelo que não
passa aqui não passa em task real.

| Modelo | Tool call | Latência | Veredito |
|---|---|---|---|
| `opencode/big-pickle` | ✅ Glob → Read → resposta correta | segundos | admitido |
| `opencode/deepseek-v4-flash-free` | ✅ | segundos | admitido |
| `opencode/ling-3.0-tiny-free` | ✅ | segundos | admitido |
| `opencode/laguna-s-2.1-free` | ✅ | segundos | admitido |
| `opencode-go/kimi-k2.7-code` | ✅ | segundos | admitido (pago) |
| `google/gemini-3.6-flash` | ✅ | segundos | **reprovado em produção** — ver abaixo |
| `groq/openai/gpt-oss-120b` | ❌ | — | reprovado: TPM 8k < 32–51k do system prompt |
| `openrouter/*:free` | ❌ | >100–150s sem resposta | reprovado: fila do tier gratuito |
| `ollama/qwen2.5-coder:3b` (local) | ❌ | — | reprovado: emite JSON de tool call cru |

`opencode models` lista modelos que a conta não tem — `opencode/north-mini-code-free`
responde *"Model not found"*. A lista não é fonte de verdade; a tarefa de controle é.

## Reprovações em execução real

### `google/gemini-3.6-flash` via opencode — cota

Passou na tarefa de controle e começou bem a task #68: montou todo list correta, leu o
plano técnico, usou `graphify query` conforme o prompt. Gastou **$0.14** e travou em
`gemini is way too hot right now [retrying ... attempt #7]`, com backoff crescendo até
2 minutos. Cota da chave Google esgotada.

### Gemini CLI — mesma cota

Tentado como alternativa: o CLI responde a prompt trivial, mas usa a mesma credencial
`gemini-api-key`, então não é um bucket de cota separado para trabalho real. Descartado.

Conclusão prática: **modelo com cota compartilhada não serve de tier primário.** Ele
falha no meio da task, não na entrada, e o custo do abandono é o trabalho já feito.

## Execução do E01 (api#8 / #62)

Baseline de custo no início da orquestração: **$26.32** acumulado (`opencode stats`).

| Task | Modelo | Tentativa | Tempo | Custo | Desfecho |
|---|---|---|---|---|---|
| #68 E01.1 | `google/gemini-3.6-flash` | 1ª | ~4 min | $0.14 | abortada — cota |
| #68 E01.1 | Gemini CLI | 2ª | — | — | abortada — mesma cota |
| #68 E01.1 | `opencode/big-pickle` | 3ª | **11m 04s** | **$0.00** | ✅ aprovada |
| #69 E01.2 | `opencode/big-pickle` | 1ª | ~15 min | $0.00 | abortada — cota free esgotada |
| #69 E01.2 | `opencode-go/kimi-k2.7-code` | 2ª | ~10 min | ~$0.39 | ✅ aprovada |
| #70 E01.3 | `opencode-go/kimi-k2.7-code` | 1ª | ~28 min | **$0.83** | ✅ aprovada |

**Custo total do E01: $1.22** (`opencode stats` foi de $26.32 para $27.54). Um épico de
fundação de autenticação — schema, migração, ports e 4 rotas versionadas com testes —
por pouco mais de um dólar em modelos executores.

### #68 em detalhe — o tier gratuito deu conta

`opencode/big-pickle` entregou o épico de fundação inteiro em 11 minutos, custo zero:
dependência `better-auth`, instância com `prismaAdapter`, schema unificado
(`users` + `accounts`/`sessions`/`verifications`, `password` nullable), mapeamento
snake_case, env zod e migração aplicada.

Gates do coordenador, todos verdes: `tsc --noEmit` 0 erros · `lint` 0 erros (9 warnings
pré-existentes, inalterados) · unit **388/388** · integração **49/49** · e2e **161/161**.

Qualidade do diff: **zero comentário explicativo adicionado**, sem TODO/FIXME, sem commit
nem push. Reusou `src/lib/prisma.ts` conforme o plano.

Dois sinais de que o modelo raciocinou, e não só transcreveu o plano:

- Bateu num `PrismaClientValidationError` em `banUser` e descobriu sozinho que o plugin
  `admin()` precisa do **próprio** mapeamento de schema (`ban_reason`, `ban_expires`,
  `impersonated_by`) — o `user.fields` de topo não cobre os campos do plugin. Corrigiu e
  seguiu.
- Ao tornar `users.password` nullable, propagou a consequência de tipo para o v1 em vez de
  quebrar o build: `AuthRepository.findByEmail` passou a devolver `password: string | null`,
  e `authenticate-user-use-case` + `change-password-use-case` passaram a rejeitar usuário
  sem senha. Contrato do v1 preservado — usuário v2 simplesmente não loga pelo v1.

**Falha de protocolo:** o `worker_done` não foi entregue (`failure_count: 2`), embora o
trabalho estivesse completo e reportado em prosa no terminal. A task foi fechada por
verificação do coordenador via `task-update`. É o caminho de recuperação previsto no guia
do Orca, mas mostra que **não dá para confiar só na mensagem de ciclo de vida** — o
coordenador precisa inspecionar o estado real do repo de qualquer forma.

### #69 e #70 — o limite do tier gratuito

O `big-pickle` começou o #69 bem (criou a interface, o contrato compartilhado e as duas
implementações) e parou no meio com **`Free usage exceeded, subscribe to Go
[retrying in 18h]`**. A cota gratuita do opencode é diária e vale para **todos** os
modelos `free` do provider — testei o `deepseek-v4-flash-free` logo depois e também não
respondia. Não é fallback dentro do tier: quando acaba, acaba o tier inteiro.

Escalei para `opencode-go/kimi-k2.7-code`, avisando por `orchestration send` que havia
trabalho parcial em disco para revisar em vez de recomeçar. O worker aproveitou o que
existia e fechou.

O #70 (rotas `/v2/auth`, DTOs, use-cases, e2e) rodou inteiro no `kimi-k2.7-code` por
$0.83 — o item mais caro e também o de maior superfície.

### Leitura dos números

- **O tier gratuito entrega trabalho real.** O #68, o épico de maior risco (schema
  unificado + migração), saiu de graça e passou em todos os gates.
- **O gratuito é imprevisível quanto a *quando* acaba**, não quanto à qualidade. O custo
  de estourar cota no meio é o trabalho perdido do worker abortado.
- **Começar barato compensou** mesmo com duas escaladas: $1.22 no total.

## Atrito operacional observado

Custo não é só token. O que efetivamente consumiu tempo:

- **Prompt de permissão para ler `.env`.** O opencode gateia leitura de `.env`
  separadamente de `edit`/`bash`; o worker para e espera resposta. Precisa ser
  liberado na primeira vez, ou o worker fica parado sem sinalizar erro.
- **`worker-stop` não funciona em dispatch de baixo nível.** Retorna
  `dispatch_not_found` para dispatch criada por `dispatch --inject` — ele só conhece
  worker criado por `worker-start`. Para trocar de modelo: `terminal close` e nova
  `dispatch` para o novo handle.
- **O opencode reescreve `.opencode/opencode.json`** adicionando `$schema` ao rodar no
  repo. Ruído no diff, precisa de `git checkout --` antes de commitar.
- **Cota gratuita é do provider, não do modelo.** Ao esgotar, todos os `*-free` caem
  juntos. Um preset de fallback dentro do mesmo tier não salva — a escalada tem que
  atravessar para o tier pago.
- **`worker_done` pode não chegar.** No #68 falhou duas vezes com o trabalho completo.
  O coordenador fecha a task por `task-update` depois de verificar o repo. Nunca tratar
  ausência de `worker_done` como falha do trabalho sem olhar o estado real.

## Como reproduzir

```bash
opencode stats                      # custo acumulado antes
# ... executar a task ...
opencode stats                      # depois; a diferença é o custo da task
```

Para tempo, o intervalo entre `orchestration dispatch` e o `worker_done` recebido no
`orchestration check --wait`.
