# Self-Hosted Infra — Tech Plan

## Abordagem Arquitetural

**Decisão 1 — Seleção de provider por variável de ambiente**
Uma factory function `makeStorageProvider()` lê `STORAGE_PROVIDER` e retorna a instância correta. As 3 rotas que instanciam `SupabaseBucket` diretamente (`profile-routes`, `company-routes`, `complaint-routes`) passam a chamar a factory. Mudança de 1 linha por arquivo, sem alterar use cases ou a interface `StorageProvider`.

**Decisão 2 — SDK: `@aws-sdk/client-s3`**
MinIO é S3-compatible. Usar o SDK da AWS permite que o mesmo `MinioBucket` funcione apontando para AWS S3 em produção — basta trocar as variáveis de ambiente (`endpoint`, `region`, `credentials`). Nenhuma linha de código muda na migração para AWS.

**Decisão 3 — URLs de arquivo via proxy da API**
`MinioBucket.getFileUrl()` retorna `${APP_PUBLIC_URL}/storage/${filePath}`. A API expõe `GET /storage/*` (rota pública, sem JWT) que faz stream do objeto do MinIO para o cliente. Com isso, uma única URL ngrok serve API e arquivos.

**Decisão 4 — Inicialização do bucket MinIO**
Service `createbuckets` no docker-compose usa a imagem `minio/mc` para criar o bucket `oikos` com política pública após o MinIO estar healthy. Idempotente — seguro para múltiplos `docker compose up`.

**Decisão 5 — Container da API com hot-reload**
Dockerfile de desenvolvimento: imagem `node:lts-alpine`, dependências instaladas na imagem, source code montado como volume. Comando: `npm run dev` (`tsx watch`). Alterações no código recarregam sem rebuild da imagem.

**Restrição:** Supabase continua no código como provider alternativo. Vars Supabase tornam-se opcionais no schema Zod, obrigatórias apenas quando `STORAGE_PROVIDER=supabase` (validação condicional com `.superRefine()`).

---

## Modelo de Dados

Nenhuma alteração no schema do banco. As colunas existentes que armazenam caminhos/URLs de arquivos (`avatar_url`, `image_url`, campos similares) são `text` — compatíveis tanto com URLs Supabase CDN quanto com URLs do proxy da API. Novos uploads já usam o formato `/storage/{filePath}`; registros antigos (Supabase) continuam válidos até serem substituídos. Sem migrations necessárias.

---

## Arquitetura de Componentes

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/modules/common/providers/storage/minio/minio-bucket.ts` | Implementa `StorageProvider` via `@aws-sdk/client-s3` apontando para MinIO |
| `src/modules/common/providers/storage/make-storage-provider.ts` | Factory: lê `STORAGE_PROVIDER`, retorna `MinioBucket` ou `SupabaseBucket` |
| `src/modules/storage/storage-routes.ts` | Rota pública `GET /storage/*` — proxy/stream de objetos do MinIO |
| `Dockerfile` | Imagem de desenvolvimento da API com hot-reload |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `docker-compose.yml` | Adiciona services `minio`, `createbuckets`, `api` |
| `src/env/index.ts` | Adiciona `STORAGE_PROVIDER`, `MINIO_*`, `APP_PUBLIC_URL`; Supabase vars → `.optional()` com superRefine |
| `src/modules/profiles/profile-routes.ts` | `new SupabaseBucket()` → `makeStorageProvider()` |
| `src/modules/companies/company-routes.ts` | `new SupabaseBucket()` → `makeStorageProvider()` |
| `src/modules/complaints/complaint-routes.ts` | `new SupabaseBucket()` → `makeStorageProvider()` |
| `src/app.ts` (ou entry point) | Registra `storageRoutes` |

### Novas variáveis de ambiente

```env
STORAGE_PROVIDER=minio          # ou supabase
APP_PUBLIC_URL=http://localhost:3333  # URL pública da API (ngrok em exposição)
MINIO_ENDPOINT=minio            # hostname do container (ou localhost fora do docker)
MINIO_PORT=9000
MINIO_ACCESS_KEY=oikos
MINIO_SECRET_KEY=oikos_dev
MINIO_BUCKET=oikos
```

### Fluxo de uma requisição de upload (ponta a ponta)

1. Cliente `PUT /profiles/avatar` → `profile-routes` → `makeStorageProvider()` → `MinioBucket.uploadFile()`
2. `MinioBucket` faz `PutObjectCommand` no MinIO via S3 SDK
3. Use case armazena o path no banco
4. Resposta inclui URL: `getFileUrl()` retorna `${APP_PUBLIC_URL}/storage/profiles/user-id/avatar.jpg`
5. Cliente acessa a imagem via `GET /storage/profiles/user-id/avatar.jpg`
6. `storage-routes` faz `GetObjectCommand` no MinIO e faz stream para o cliente
