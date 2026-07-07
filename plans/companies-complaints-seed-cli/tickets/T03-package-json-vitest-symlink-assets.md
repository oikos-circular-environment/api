# T3 — `package.json`, `vitest.config.ts`, symlink, assets

**Status:** ⬜ Pendente
**Depende de:** T1
**Arquivos:** `api/package.json`, `api/vitest.config.ts`, `api/cli/requests/.env` (symlink), `api/cli/assets/*`

## Checklist

- [ ] `package.json`: `"cli": "tsx scripts/recycling-companies/index.ts"` → `"cli": "tsx cli/index.ts"`
- [ ] `vitest.config.ts`: `include: ["src/**/*.spec.ts", "scripts/**/*.spec.ts"]` → `include: ["src/**/*.spec.ts", "cli/**/*.spec.ts"]` (confirmar antes que não há nenhum `.spec.ts` remanescente em `scripts/` — hoje só existe dentro do que está sendo movido)
- [ ] Recriar o symlink `requests/.env`: apagar o antigo (`scripts/recycling-companies/requests/.env -> ../../../.env`, 3 níveis) e criar `cli/requests/.env -> ../../.env` (2 níveis, já que `cli/` está um nível acima de onde `scripts/recycling-companies/` estava)
- [ ] `git mv` de cada um dos 7 arquivos de `api/src/assets/` para `api/cli/assets/`, renomeando para um padrão único: `image-test.jpg`→`complaint-sample-01.jpg`, `images.jpeg`→`complaint-sample-02.jpg`, `images (1).jpeg`→`complaint-sample-03.jpg`, `landfill.jpg`→`complaint-sample-04.jpg`, `plastic-waste-3692513_640.jpg`→`complaint-sample-05.jpg`, `plasticbottles_0.jpg`→`complaint-sample-06.jpg`, `waste.jpg`→`complaint-sample-07.jpg` — confirmar antes que nenhum ficou órfão em `src/assets/` (diretório deve ficar vazio/removido)
- [ ] Essas imagens são usadas SÓ como anexo de denúncia (`ComplaintAttachment`) — não usar para `ProfileImage`/`CompanyAvatar` em nenhum lugar deste trabalho
- [ ] `npm run cli -- --help`-equivalente (rodar sem argumentos e ver o prompt interativo iniciar) confirma que o entry point novo funciona
