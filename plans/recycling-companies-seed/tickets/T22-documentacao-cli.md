# T22 — Documentação da CLI

**Status:** ✅ Concluído
**Depende de:** T21
**Arquivos:** `api/docs/recycling-seed-cli.md`

## Checklist

- [x] Pré-requisitos (`GOOGLE_PLACES_API_KEY`)
- [x] Tabela de flags (`--city`, `--state`, `--target`, `--force`)
- [x] Exemplos: modo 100% flag, multi-cidade, modo interativo, modo híbrido (flags parciais)
- [x] Fluxo de prompts documentado passo a passo
- [x] Comportamento sem TTY (defaults seguros, não trava CI) documentado explicitamente
- [x] Seção de erros/estados de falha (isolamento por cidade, exit code)
