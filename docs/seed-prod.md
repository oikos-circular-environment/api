# Seed em Produção

Guia de referência rápida para rodar/depurar os seeds de `prisma/seeds` contra o banco e storage de **produção**. Não é o fluxo normal de dev (que roda `npm run seed` contra o Postgres/MinIO local) — uso esperado é manutenção pontual ou povoamento de infra nova. Ver também `cli/` e `docs/seed-cli.md` (geração dos arquivos `prisma/seeds/data-generated/<cidade>-<uf>.json` que o seed consome) e `docs/infrastructure.md` (repo `devops`) para o resto da infra.

## Acesso à VM (A1.Flex, Oracle Cloud)

| Item | Valor |
|---|---|
| Host SSH | `164.152.241.127` |
| Usuário SSH | `deploy` |
| Chave privada (nesta máquina) | `/media/ccrs/development/oracle/ssh-key-2026-06-30.key` |
| Diretório do compose na VM | `/opt/oikos/docker` |
| Containers relevantes | `oikos-prod-postgresql-1`, `oikos-prod-minio-1` |
| Credenciais (Postgres + MinIO) | `/opt/oikos/docker/.env.infra` na VM — `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`, `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` |
| Outras envs na VM | `.env.api` (JWT/BETTER_AUTH/ADMIN/etc.), `.env.web` — não usadas pelos scripts de seed |
| `APP_PUBLIC_URL` de produção | `https://api.oikos.company` |
| Bucket MinIO | `oikos` (default do schema, sem override) |

A chave privada não fica versionada no repo `api` — vive fora, em `/media/ccrs/development/oracle/`. Rodar `ssh`/`scp` com ela pode exigir liberar uma regra de permissão do Claude Code (`Bash(ssh -i /media/ccrs/development/oracle/ssh-key-2026-06-30.key *)` em `.claude/settings.local.json`).

**Importante — rode em foreground.** Comandos que escrevem em produção (`npm run seed:prod`, `npm run fix:prod-attachments`) são bloqueados pelo classificador de auto mode quando disparados em background, mesmo com a permissão de Bash liberada. Rode-os em foreground e aceite a espera.

## `npm run seed:prod` — seed normal

`scripts/seed-prod.ts` automatiza: descobre o IP interno dos containers Postgres e MinIO na VM, lê as credenciais em `.env.infra`, abre **dois** túneis SSH locais (Postgres e MinIO) e roda `npm run seed` localmente apontando pra eles — fechando os túneis ao final.

```bash
DEST_SSH_HOST=164.152.241.127 \
  DEST_SSH_KEY=/media/ccrs/development/oracle/ssh-key-2026-06-30.key \
  npm run seed:prod
```

Restringir a cidades específicas (slug = nome do arquivo em `prisma/seeds/data-generated/`, sem `.json`, separados por vírgula):

```bash
SEED_CITY_SLUG=alegrete-rs,porto-alegre-rs \
  DEST_SSH_HOST=164.152.241.127 \
  DEST_SSH_KEY=/media/ccrs/development/oracle/ssh-key-2026-06-30.key \
  npm run seed:prod
```

O script força, no processo do seed, `STORAGE_PROVIDER=minio`, `MINIO_ENDPOINT`/`MINIO_PORT` apontando pro túnel, `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` reais e `APP_PUBLIC_URL=https://api.oikos.company` — sem isso, os anexos de denúncia (upload real via `storageProvider`) sobem pro MinIO local de dev e/ou a `url` gravada no banco aponta pro host de dev, deixando a mídia quebrada em produção (ver "Histórico" abaixo).

O seed em si é idempotente: empresa já existente (por `identity`) é pulada; cidade cuja contagem de denúncias já bate com o total do arquivo é pulada inteira.

## `npm run fix:prod-attachments` — reparar anexos já quebrados

`scripts/fix-prod-complaint-attachments.ts` corrige anexos de denúncia cuja `url` não aponta pro host de produção. Não precisa dos arquivos originais em `cli/assets`: a coluna `path` (chave S3) e `base64` (conteúdo do arquivo) já ficam salvas em `complaint_attachments` desde a criação, então o script só reenvia esse conteúdo pra chave certa no bucket de produção e corrige a `url`.

```bash
DEST_SSH_HOST=164.152.241.127 \
  DEST_SSH_KEY=/media/ccrs/development/oracle/ssh-key-2026-06-30.key \
  npm run fix:prod-attachments
```

Roda sobre **todas** as denúncias com `url` quebrada no banco, não só de uma cidade — não precisa (nem aceita) `SEED_CITY_SLUG`. Seguro de rodar de novo: reenviar o mesmo conteúdo pra mesma chave S3 é idempotente.

## Conectar um gerenciador de banco/MinIO manualmente

Ver `docs/infrastructure.md` no repo `devops`, seção "Conectando um gerenciador de banco" — túnel SSH manual + Beekeeper (ou similar) usando a mesma chave e host acima.

## Histórico

**2026-09-02** — `seed:prod` só tunelava o Postgres. Anexos de denúncia seedados em produção (incluindo o lote de Rondonópolis/Santos) ficaram sem mídia porque o upload ia pro MinIO local de dev e/ou a URL gravada apontava pro `APP_PUBLIC_URL` local. Corrigido em `seed-prod.ts` (túnel MinIO + envs forçadas) e reparado em produção com `fix:prod-attachments` (2477 anexos corrigidos, 0 falhas).
