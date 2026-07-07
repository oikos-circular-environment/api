# T12 — Entidades de denúncia (`ComplaintSeed`)

**Status:** ⬜ Pendente
**Depende de:** T5
**Arquivos:** `cli/complaints/entities/complaint-seed.ts`

## Checklist

- [ ] `ComplaintStatusSeed`, `ComplaintCaptureModeSeed` (só `"PHOTO"` — vídeo fora de escopo), `ComplaintVoteTypeSeed`, `ResolutionHint = "PREFER_COMPANY" | "CITIZEN_ONLY"`
- [ ] `ComplaintAttachmentSeed { asset_file: string; type: ComplaintCaptureModeSeed }`
- [ ] `VoteSeed { resident_index: number; vote_type: ComplaintVoteTypeSeed }`
- [ ] `ResolutionSeed { resident_index: number; description: string; resolution_hint: ResolutionHint }`
- [ ] `ComplaintSeed { author_resident_index, date, observations, geospatial: Geospatial, waste_category_names: string[], attachments: ComplaintAttachmentSeed[], status: ComplaintStatusSeed, votes: VoteSeed[], resolutions: ResolutionSeed[] }` — `Geospatial` importado por tipo de `../../../src/modules/complaints/entities/complaint-entity.js`
- [ ] `ComplaintSeedFileMeta { generated_at, total, city, state_code }`
- [ ] `ComplaintSeedFile { _meta: ComplaintSeedFileMeta; complaints: ComplaintSeed[] }` — SEM array de moradores embutido (referencia o `CityResidentsFile` da mesma cidade/slug, resolvido em `prisma/seeds/`)
