# T8 — Use-case de resolução de moradores

**Status:** ⬜ Pendente
**Depende de:** T6, T7
**Arquivos:** `cli/shared/use-cases/resolve-city-residents-use-case.ts` (+spec)

## Checklist

- [ ] `ResolveCityResidentsUseCase(writer, generator)` — injeção de construtor, mesmo padrão dos demais use-cases do pacote
- [ ] `execute(ctx, opts: { companiesTarget?, complaintsTarget?, force? })`: se `writer.exists(ctx)` e não `opts.force`, retorna `writer.read(ctx)` (carrega sem redimensionar); senão gera via `computeResidentPoolSize` + `generator.generate`, grava via `writer.write`, retorna o array gerado
- [ ] Spec cobre: primeira chamada gera e grava; segunda chamada (mesma cidade, sem `force`) retorna exatamente o mesmo array sem gerar de novo (spy/contador de chamadas ao generator); com `force: true`, regenera
