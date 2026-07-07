# T21 — CLI reestruturado (flags híbridas + Listr2)

**Status:** ✅ Concluído
**Depende de:** T19, T20
**Arquivos:** `cli.ts`

## Checklist

- [x] `parseArgs`: `--city`/`--state` continuam funcionando como antes (sem exigir mínimo); `--target`/`--force` sem `default`, para distinguir "omitido" de "informado como false/0"
- [x] Modo híbrido: cada flag omitida vira prompt (city/state via `resolveCitiesInteractively`, target/force via `promptTarget`/`promptForce`) — mas **só quando `process.stdin.isTTY === true`**; sem TTY, usa defaults seguros (target: sem padding, force: false) em vez de travar esperando input; sem cidade E sem TTY, falha com erro claro
- [x] Task list Listr2 por cidade (4 tasks): Resolvendo cidade → Buscando empresas reais → Gerando sintéticas (só `enabled` quando `target` pede mais que o real) → Escrevendo arquivo — títulos atualizados dinamicamente com contagens
- [x] **Bug real encontrado e corrigido**: `exitOnError: false` no Listr2 **não** significa "não trave o processo" — significa "continue rodando as tasks seguintes mesmo se uma falhar", causando erros em cascata (tasks 2/3 falhando ao tentar usar um `ctx` nunca preenchido pela task 1 que já tinha falhado) e o processo saindo com exit code `0` mesmo com tudo falhando. Corrigido: `exitOnError` default (`true`) por lista de tasks — para as tasks restantes daquela cidade assim que uma falha; isolamento entre cidades diferentes feito via `try/catch` no loop externo de `runCli`, não pela opção do Listr2
- [x] `process.exitCode = 1` quando qualquer cidade falha, mesmo que outras tenham sucesso
- [x] Verificado manualmente: modo 100% flag (comportamento igual ao anterior, agora com task list visual); flags parciais sem TTY (usa defaults, não trava); cidade inválida (erro limpo, para na primeira task, exit 1); multi-cidade com uma inválida e outra válida (isolamento confirmado — a válida completa normalmente, exit 1 no final por causa da que falhou)
- [x] `npm run test` — suíte completa (308 testes) passa sem regressão
