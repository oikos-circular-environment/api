# Oikos API

## Infraestrutura local

Suba todos os serviços com:

```bash
docker compose up
```

Ou apenas a infraestrutura (sem o container da API):

```bash
docker compose up postgresql redis minio createbuckets
```

### Credenciais dos serviços

| Serviço | Host | Porta | Usuário | Senha |
|---|---|---|---|---|
| PostgreSQL | `localhost` | `5432` | `oikos` | `oikos_dev` |
| PostgreSQL (superuser) | `localhost` | `5432` | `postgres` | `postgres_dev` |
| Redis | `localhost` | `6379` | — | — |
| MinIO (API) | `localhost` | `9000` | `oikos` | `oikos_dev` |
| MinIO (Console) | `localhost` | `9001` | `oikos` | `oikos_dev` |

Abra o painel do MinIO com:

```bash
npm run minio:console
```

### Comportamento do banco de dados

O PostgreSQL é **efêmero** — sem volume persistente. A cada `docker compose down && docker compose up` o banco é recriado do zero e as migrations são aplicadas automaticamente pelo container da API na inicialização.
