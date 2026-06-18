# Testes

## Pré-requisitos

- Node.js e npm instalados
- Docker e Docker Compose instalados

## Tipos de teste

| Tipo | Comando | Infra necessária | Padrão de arquivo |
|------|---------|-------------------|-------------------|
| Unit | `npm run test` | Nenhuma | `*.spec.ts` |
| Integration | `npm run test:integration` | Containers de teste | `*.integration.spec.ts` |
| E2E | `npm run test:e2e` | Containers de teste | `*.e2e.spec.ts` |

## Testes unitários

Não dependem de banco de dados nem de serviços externos. Usam repositórios in-memory.

```bash
npm run test                   # roda todos
npm run test -- <filtro>       # roda um arquivo ou padrão específico
npm run test:watch             # modo watch interativo
npm run test:coverage          # gera relatório de cobertura
```

## Testes de integração e E2E

Esses testes precisam de infraestrutura real (PostgreSQL, Redis, MinIO). A infra de teste roda em containers Docker **isolados**, com portas e credenciais diferentes do ambiente de desenvolvimento — um não interfere no outro.

### Infraestrutura de teste

Os containers são definidos em `docker-compose.test.yml` e rodam nas seguintes portas:

| Serviço | Porta (dev) | Porta (test) |
|---------|-------------|--------------|
| PostgreSQL | 5432 | **5433** |
| Redis | 6379 | **6380** |
| MinIO API | 9000 | **9002** |
| MinIO Console | 9001 | **9003** |

### Subindo e derrubando a infra

```bash
# Subir containers de teste (aguarda healthchecks)
npm run test:infra:up

# Rodar testes
npm run test:integration
npm run test:e2e

# Derrubar containers e limpar volumes
npm run test:infra:down
```

Os containers de teste usam o project name `oikos-test`, então não conflitam com os containers de desenvolvimento (`docker compose up`).

### Configuração

As variáveis de ambiente dos testes ficam em `.env.test`. Esse arquivo já vem configurado para apontar para as portas da infra de teste. Não é necessário alterar nada para rodar localmente.

Se precisar sobrescrever alguma variável localmente, crie um arquivo `.env.test.local` (já está no `.gitignore`).

### Como funciona o isolamento do banco

A cada execução dos testes de integração/E2E, o setup (`src/test/integration-setup.ts`):

1. Cria um **schema temporário** no PostgreSQL (ex: `test_a1b2c3d4e5f6g7h8`)
2. Roda `prisma migrate deploy` nesse schema
3. Executa os testes
4. Remove o schema ao final

Isso garante que cada execução começa com um banco limpo, sem resíduos de runs anteriores.

## Fluxo recomendado

```bash
# 1. Rode o teste específico que você está trabalhando
npm run test -- create-complaint

# 2. Rode a suite completa de unit tests
npm run test

# 3. Se mexeu em queries ou repositórios, rode integração/e2e
npm run test:infra:up
npm run test:integration
npm run test:e2e
npm run test:infra:down
```
