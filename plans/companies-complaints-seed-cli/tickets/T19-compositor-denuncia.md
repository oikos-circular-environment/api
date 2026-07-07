# T19 — Compositor de denúncia (`ComplaintGenerator`)

**Status:** ⬜ Pendente
**Depende de:** T13, T14, T15, T16, T17, T18
**Arquivos:** `cli/complaints/services/complaint-generator.ts` (+spec)

## Checklist

- [ ] `ComplaintGenerator(categoryPicker, attachmentPicker, geospatialGenerator, statusPicker, voteGenerator, resolutionGenerator)` — injeção de construtor, mesmo papel que `CompanySeedMapper` tem para empresas
- [ ] `generate(ctx: CityContext, residentPoolSize: number, residentsWithCompany: Set<number>): ComplaintSeed` — sorteia `author_resident_index` (qualquer morador do pool), compõe todos os campos via os services injetados
- [ ] Garante que `date` é uma data plausível no passado recente (`faker.date.recent`/`faker.date.past`, coerente com `created_at` implícito do consumidor)
- [ ] Spec cobre: composição completa produz um `ComplaintSeed` estruturalmente válido; `resolutions`/`votes` refletem o `status` sorteado (delega a verificação de coerência aos specs de T17/T18, aqui só confirma que a composição não quebra o contrato)
