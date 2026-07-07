# T22 — Prompts novos (quantidades, sem seletor de dataset)

**Status:** ⬜ Pendente
**Depende de:** T1
**Arquivos:** `cli/cli/prompts.ts`

## Checklist

- [ ] Generalizar `promptTarget()` existente para `promptTarget(label: string, defaultValue?: number): Promise<number>` — mensagem passa a incluir o rótulo (`"moradores"`, `"empresas"`, `"denúncias"`); Enter aceita `defaultValue` quando informado; validação de inteiro `>= 0` (0 é um valor válido — "desligar" aquele tipo para a cidade atual, não é mais tratado como "sem meta" como no `promptTarget` antigo de empresas)
- [ ] Sem `promptDatasets()` — não existe mais seletor de "o que gerar"; a escolha de cidade sempre gera o pacote completo, só as quantidades variam
- [ ] Nenhuma mudança no restante dos prompts existentes (`promptState`, `promptCities`, `promptConfirmSelection`, `promptAddAnotherState`, `promptOverwrite`, `promptOutputDir`)
