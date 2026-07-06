# T23 — Correção do cache + flag de diretório de saída + rename do comando

**Status:** ✅ Concluído
**Depende de:** T21
**Arquivos:** `writers/seed-file-writer.ts`, `writers/json-seed-file-writer.ts` (+spec), `use-cases/generate-city-seed-use-case.ts` (+spec), `cli/prompts.ts`, `cli.ts`, `package.json`, `docs/recycling-seed-cli.md`

## Checklist

- [x] **Bug real encontrado**: a checagem "já existe, pular" só rodava na última task (`writeSeed`), depois que "Resolvendo cidade" e principalmente "Buscando empresas reais no Google Places" (a etapa cara) já tinham rodado por completo — reexecutar para uma cidade já gerada gastava a busca inteira à toa
- [x] `SeedFileWriter.exists(ctx)` — checagem pura, sem side-effect, extraída de dentro de `write()`
- [x] `JsonSeedFileWriter` recebe `outputDir` configurável no construtor (default preservado, exportado como `DEFAULT_SEEDS_DIR`)
- [x] `GenerateCitySeedUseCase.checkExisting(ctx)` — delega ao writer, mantendo-o encapsulado
- [x] Nova task Listr2 "Verificando se já existe" logo após "Resolvendo cidade", antes de "Buscando empresas reais" — tasks seguintes ganham `enabled: (ctx) => !ctx.skipCity`
- [x] Modo interativo: `promptOverwrite(cidade, uf, path)` — pergunta só quando o arquivo daquela cidade específica já existe (removido o prompt genérico `promptForce()` do início da execução, que seria redundante/confuso com esse novo prompt pontual)
- [x] Modo não-interativo: continua pulando silenciosamente sem `--force` (comportamento preservado para CI/scripts)
- [x] Nova flag `--output-dir=<path>`, promptable via `promptOutputDir` quando omitida e houver TTY
- [x] Rename `"seed:fetch"` → `"cli"` em `package.json`; todas as referências em `docs/recycling-seed-cli.md` e nos documentos de `plans/recycling-companies-seed/` atualizadas
- [x] `docs/recycling-seed-cli.md` ganhou seção "Cache e reexecução" explicando o comportamento corrigido
- [x] Verificado manualmente com tempo de execução: primeira geração ~4.3s (busca real), segunda execução sem `--force` ~1.0s (para logo após "Verificando se já existe", sem tocar o Google Places) — confirma a correção
- [x] Verificado `--force` (regenera de verdade, ~4s) e `--output-dir` (escreve no diretório customizado)
- [x] `npm run test` — suíte completa (314 testes) passa sem regressão
