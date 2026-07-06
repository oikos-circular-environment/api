# T25 — Segunda onda de validação + multiselect de cidades + navegação back

**Status:** ✅ Concluído
**Depende de:** T21, T23
**Arquivos:** `services/fake-phone.ts` (novo), `services/company-gap-filler.ts`, `services/synthetic-company-generator.ts`, `services/company-seed-repairer.ts` (+spec, novo), `use-cases/generate-city-seed-use-case.ts` (+spec), `recycling-seed-pipeline.spec.ts`, `cli/prompts.ts`, `cli.ts`, `docs/recycling-seed-cli.md`

## Checklist

### Segunda onda de validação (rede de segurança, não corrige arquivos já existentes)

- [x] `services/fake-phone.ts` — extrai `generateFakePhone()`, antes duplicado entre `CompanyGapFiller` e `SyntheticCompanyGenerator`
- [x] `services/company-seed-repairer.ts` — `CompanySeedRepairer.repair(seed)`: preenche telefone/horário vazios (reaproveitando `generateFakePhone`/`generateSyntheticHours`) e revalida contra os mesmos schemas Zod do consumidor (`companyGeneralRegistrationValidationSchema`/`upsertCompanyAddressSchema`/`upsertCompanyBusinessHoursSchema`); retorna `stillInvalid` se a correção não foi suficiente (ex.: endereço malformado, que essa etapa não tenta corrigir)
- [x] `GenerateCitySeedUseCase.validateAndRepair(companies)` — novo método granular, chamado entre `generateSynthetic` e `writeSeed` (também dentro de `execute()`); descarta empresas que continuam inválidas em vez de gravá-las
- [x] Nova task Listr2 "Validando e corrigindo dados gerados" no `cli.ts`, mostrando quantos ajustes foram feitos (ou "nada a corrigir")
- [x] Escopo confirmado com o usuário: só rede de segurança para dados novos — **não** inclui um modo de reparar arquivos JSON já gerados (ex.: as 17 empresas inválidas do dataset legado de Rondonópolis continuam como estão, fora do escopo desta etapa)

### Multiselect de cidades + navegação back

- [x] `promptCities(municipios)` — troca o `promptCity` (autocomplete single) por `autocompleteMultiselect`, deixando marcar várias cidades do mesmo estado numa única interação
- [x] Sentinela `"← Voltar (escolher outro estado)"` como primeira opção da lista — se marcada, descarta a seleção e o chamador refaz o prompt de estado (Clack não tem navegação nativa "para trás")
- [x] `promptAddAnotherCity` renomeado para `promptAddAnotherState` (semântica mudou: agora pergunta por outro **estado**, já que cidades do mesmo estado são todas marcadas de uma vez)
- [x] `resolveCitiesInteractively` reestruturado como loop `while` com o novo fluxo
- [x] **Ajuste pós-review do usuário**: o sentinela `"← Voltar"` misturado na lista de cidades confundia (marcá-lo parecia uma seleção igual a uma cidade real, sem deixar claro que descartava o resto). Trocado por: `required: false` + confirmar sem marcar nenhuma cidade = voltar. Também adicionado `promptConfirmSelection` — mostra a lista completa de cidades escolhidas (via `note()`) e pede confirmação antes de seguir para os prompts de target/output-dir; se recusada, `resolveCitiesInteractively` recomeça a seleção do zero.

## Verificação

- [x] `npx tsc` sem erros
- [x] `npm run test` — suíte completa (319 testes, +5 do `CompanySeedRepairer`) passa
- [x] Testado manualmente em modo flag contra a API real: nova task aparece e mostra "nada a corrigir" (esperado, já que o gerador garante dados válidos por construção)
- [x] **Limitação conhecida**: o fluxo interativo (`autocompleteMultiselect`, navegação back) não foi testado com teclado real neste ambiente (sem TTY disponível para automação) — validado via typecheck (assinatura exata da API do Clack conferida no `node_modules`) e pelos testes unitários do `CompanySeedRepairer`, mas a interação de teclado em si (espaço pra marcar, "← Voltar") depende de verificação manual pelo usuário
