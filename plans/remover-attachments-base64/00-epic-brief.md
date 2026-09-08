# Épico — Remover `base64` dos anexos (attachments)

## Contexto

Três tabelas guardam o conteúdo binário do arquivo duas vezes: uma vez no
MinIO (via `storageProvider.uploadFile()`) e outra vez como string base64
inteira na coluna `base64` da própria tabela do Postgres
(`file.content.toString("base64")`, gravado no mesmo `create()` do Prisma).

Tabelas afetadas (`prisma/schema.prisma`):

| Model | Coluna | Módulo de escrita |
|---|---|---|
| `ComplaintAttachment` | `base64` (linha ~412) | `src/modules/complaints/use-cases/create-complaint-attachment-use-case.ts` |
| `ComplaintResolutionAttachment` | `base64` (linha ~548) | `src/modules/complaints/use-cases/add-resolution-attachment-use-case.ts` |
| `DenunciationAttachment` | `base64` (linha ~495) | `src/modules/denunciation/use-cases/create-denunciation-attachment-use-case.ts` |

`SupportAttachment` **não** tem essa coluna — já está limpa, serve de
referência do formato final.

O campo também está exposto na resposta pública da API (`complaints-dto.ts`,
`denunciations-dto.ts`, entities). Confirmado por grep que **nem `mobile` nem
`web` leem esse campo** (mobile: zero ocorrências de `base64` fora de
`package-lock.json`; web: só aparece no SDK gerado a partir do OpenAPI, não em
código de uso) — remoção da API pública é segura, sem coordenação cross-repo
necessária.

Achado à parte, incluído no escopo: `StorageProvider.convertFileToBase64()`
(interface `storage.ts` + 3 implementações: Minio/Supabase/InMemory) nunca é
chamado em produção — o base64 salvo vem direto do buffer em memória no
use-case, não desse método. É código morto desde sempre, sai junto na faxina
final (T4).

## Por que remover

- Duplicação pura: o arquivo já está servido via `/storage/*` (proxy MinIO)
  com cache em CDN (Cloudflare) sendo configurado agora — o base64 no Postgres
  nunca foi consumido para servir a imagem.
- Infla linha de tabela (fotos/vídeos de denúncia em base64 = +33% do tamanho
  binário, direto no banco transacional).
- Infla payload de resposta da API sem consumidor.

## Ordem de execução

Sequencial, um ticket por vez, cada um fechando com schema + migration +
código + testes verdes antes do próximo começar:

1. [T1 — Denunciation attachments](./tickets/T1-denunciation-attachments.md)
2. [T2 — Complaint attachments](./tickets/T2-complaint-attachments.md)
3. [T3 — Complaint resolution attachments](./tickets/T3-resolution-attachments.md)
4. [T4 — Faxina final: `convertFileToBase64` morto + grep global](./tickets/T4-cleanup-final.md)

T1/T2/T3 não dependem entre si (tabelas diferentes) — a ordem é só a
sequência de execução pedida, não uma dependência técnica. T4 depende dos
três anteriores (precisa que nenhum lugar mais grave `base64` antes de tirar
o método morto e fazer o grep de confirmação).

## Padrão de migration

Cada ticket edita **só o model correspondente** em `prisma/schema.prisma`
(remove a linha `base64 String`) e gera uma migration própria:

```bash
docker compose up -d postgresql
npm run migrate:dev -- --name remove_base64_from_<tabela>
```

`prisma migrate dev` já roda `prisma generate` depois de aplicar — não precisa
rodar `migrate:generate` à parte.
