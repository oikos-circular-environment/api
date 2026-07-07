# CLI de Seed Multi-Domínio — Índice de Tickets

Cada ticket é um arquivo próprio em `tickets/`, com checklist de execução. Marcar `[x]` no arquivo do ticket conforme concluído. Ver `02-execution-plan.md` para o grafo de dependências completo.

| Ticket | Título | Status |
|---|---|---|
| [T1](tickets/T01-rename-split-shared-companies.md) | Rename `scripts/recycling-companies/` → `cli/`, split `shared/`/`companies/` | ⬜ Pendente |
| [T2](tickets/T02-relocar-address-seed-fake-phone.md) | Relocar `AddressSeed` e `fake-phone.ts` para `shared/` | ⬜ Pendente |
| [T3](tickets/T03-package-json-vitest-symlink-assets.md) | `package.json`, `vitest.config.ts`, symlink, assets | ⬜ Pendente |
| [T4](tickets/T04-rename-docs-seed-cli.md) | Rename inicial de `docs/recycling-seed-cli.md` → `docs/seed-cli.md` | ⬜ Pendente |
| [T5](tickets/T05-entidades-pool-moradores.md) | Entidades do pool de moradores (`CityResidentSeed`) | ⬜ Pendente |
| [T6](tickets/T06-gerador-moradores.md) | Gerador de moradores + `computeResidentPoolSize` | ⬜ Pendente |
| [T7](tickets/T07-writer-pool-moradores.md) | Writer do pool de moradores (`exists`/`write`/`read`) | ⬜ Pendente |
| [T8](tickets/T08-use-case-resolucao-moradores.md) | Use-case de resolução de moradores | ⬜ Pendente |
| [T9](tickets/T09-company-seed-owner-resident-index.md) | `CompanySeed` ganha `owner_resident_index` | ⬜ Pendente |
| [T10](tickets/T10-company-owner-assigner.md) | Atribuidor de donos de empresa (teto de 2 por morador) | ⬜ Pendente |
| [T11](tickets/T11-integra-atribuicao-donos-pipeline.md) | Integra atribuição de donos ao pipeline de empresas | ⬜ Pendente |
| [T12](tickets/T12-entidades-denuncia.md) | Entidades de denúncia (`ComplaintSeed`) | ⬜ Pendente |
| [T13](tickets/T13-seletor-categorias.md) | Seletor de categorias de denúncia | ⬜ Pendente |
| [T14](tickets/T14-seletor-anexos.md) | Seletor de anexos de denúncia | ⬜ Pendente |
| [T15](tickets/T15-gerador-geospatial-sintetico.md) | Gerador de geospatial sintético | ⬜ Pendente |
| [T16](tickets/T16-seletor-status.md) | Seletor de status de denúncia | ⬜ Pendente |
| [T17](tickets/T17-gerador-votos.md) | Gerador de votos (coerência com quórum) | ⬜ Pendente |
| [T18](tickets/T18-gerador-resolucoes.md) | Gerador de resoluções (`resolution_hint`) | ⬜ Pendente |
| [T19](tickets/T19-compositor-denuncia.md) | Compositor de denúncia (`ComplaintGenerator`) | ⬜ Pendente |
| [T20](tickets/T20-writer-denuncias.md) | Writer de denúncias | ⬜ Pendente |
| [T21](tickets/T21-use-case-orquestrador-denuncias.md) | Use-case orquestrador de denúncias | ⬜ Pendente |
| [T22](tickets/T22-prompts-novos.md) | Prompts novos (quantidades de moradores/empresas/denúncias) | ⬜ Pendente |
| [T23](tickets/T23-cli-reestruturado.md) | `cli.ts` reestruturado — composition root único | ⬜ Pendente |
| [T24](tickets/T24-helper-upsert-city-resident.md) | Helper compartilhado de upsert de morador | ⬜ Pendente |
| [T25](tickets/T25-reescrita-consumidor-empresas.md) | Reescrita de `prisma/seeds/recycling-companies.ts` | ⬜ Pendente |
| [T26](tickets/T26-novo-consumidor-complaints.md) | Novo `prisma/seeds/complaints.ts` | ⬜ Pendente |
| [T27](tickets/T27-registro-seeds-index.md) | Registro em `prisma/seeds/index.ts` | ⬜ Pendente |
| [T28](tickets/T28-teste-pipeline-denuncias.md) | Teste de pipeline ponta a ponta (denúncias) | ⬜ Pendente |
| [T29](tickets/T29-documentacao-completa.md) | Documentação completa do CLI | ⬜ Pendente |
