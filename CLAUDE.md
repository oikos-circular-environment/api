# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server with hot reload (tsx watch + tsc --watch)
npm run build            # Compile TypeScript to dist/

# Linting & formatting (Biome)
npm run lint             # Lint and auto-fix
npm run format           # Format and auto-fix

# Tests
npm run test             # Run all unit tests
npm run test -- <filter> # Run a single test file or pattern (e.g. "create-complaint")
npm run test:watch       # Interactive watch mode
npm run test:coverage    # Run with V8 coverage report
npm run test:integration # Run integration tests (requires live DB + .env)

# Database
npm run migrate:dev      # Apply pending Prisma migrations
npm run migrate:generate # Regenerate Prisma client
npm run seed             # Seed the database

# Infrastructure
docker compose up postgresql redis minio createbuckets  # Start local services only
npm run minio:console    # Open MinIO web console (localhost:9001)
```

## Architecture

**Fastify + Zod** API using `fastify-type-provider-zod` for end-to-end type safety. All routes are registered in `src/app.ts` under the `/v1` prefix. Swagger/Scalar docs are served at `/docs`.

### Module structure

Each feature lives in `src/modules/<name>/` with these layers:

```
use-cases/        # Business logic classes (one class per file, co-located .spec.ts)
repositories/
  <name>-repository.ts          # TypeScript interface
  in-memory/                    # In-memory implementations (for unit tests)
  prisma/                       # Prisma implementations (production)
dtos/             # Zod schemas + inferred types (input/output contracts)
entities/         # Domain types (when distinct from DTOs)
factories/        # make*() helpers for test data
errors/           # Module-specific AppError subclasses
providers/        # External service abstractions (BullMQ, company-checker, etc.)
workers/          # BullMQ background workers
*-routes.ts       # Fastify route handler — wires use-cases, called from app.ts
```

### Key patterns

**Use-case classes** receive repository interfaces via constructor injection. Routes instantiate concrete Prisma repositories and pass them in — no IoC container.

**AppError** (`src/modules/common/errors/app-error.ts`) — domain errors carry `code` (snake_UPPER_CASE string) and `statusCode`. Routes catch these and call `.toResponse()`.

**Storage provider** abstraction (`src/modules/common/providers/storage/`) supports MinIO (default local) and Supabase. Selected at runtime via `STORAGE_PROVIDER` env var.

**BullMQ worker** (`src/modules/complaints/workers/`) handles async quorum resolution. It is registered in `src/server.ts` only when `REDIS_URL` is present.

**Prisma client** (`src/lib/prisma.ts`) uses the `@prisma/adapter-pg` driver with a pg connection pool. For integration tests, a `DATABASE_SCHEMA` env var sets a dedicated schema so tests are isolated.

**Path alias**: `@/` maps to `src/` (configured in `tsconfig.json` and vitest config).

## Tests

### Conventions

- **Language**: all test text (describe, it blocks, comments) must be in **English**.
- **`describe` label**: kebab-case matching the file name (without `.spec.ts`). Examples:
  - `describe("create-complaint-use-case", ...)` matches `create-complaint-use-case.spec.ts`
  - `describe("company-validation-utils", ...)` matches `company-validation-utils.spec.ts`
  - `describe("quorum-logic", ...)` matches `quorum-logic.integration.spec.ts`
  - Nested describes (when needed) use a short English kebab phrase: `describe("when-complaint-is-closed", ...)`
- One top-level `describe` per file.
- Always import `describe`, `it`, `expect` (and others) explicitly from `vitest`.
- Prefer exact matchers (`toBe`, `toStrictEqual`) over loose ones.
- **Scannable `it` names**: favor short, direct descriptions over verbose ones.
  - `"lists companies within radius"` not `"should correctly list all companies that are within the specified radius"`
  - `"returns null when complaint not found"` not `"deve retornar nulo quando a denúncia não existe"`
- **Behavior over implementation**: test observable outcomes, not internal calls. Avoid asserting on mocks when you can assert on the returned value or state.
- **No mock leaks**: use `vi.restoreAllMocks()` in `afterEach` when mocks are needed, or enable `restoreMocks: true` globally in vitest config.

### Unit tests (`.spec.ts`)

- Co-located with the file under test.
- Use in-memory repository implementations — no mocks.
- Compose the system under test (`sut`) from real constructors.

### Integration tests (`.integration.spec.ts`)

- Use `PrismaComplaintsRepository` (or equivalent) against a live database.
- Require a `.env` with a real `DATABASE_URL` and `DATABASE_SCHEMA` set for isolation.
- Use `afterEach` to clean up created records — always track IDs.
- Run sequentially (`fileParallelism: false`) via `vitest.integration.config.ts`.

### Test execution order

1. `npm run test -- <file-or-filter>` — validate the targeted test in isolation first.
2. `npm run test` — confirm the full suite still passes.
3. `npm run test:coverage` — use the report to check for logic gaps.

## Code comments & design decisions

- Zero explanatory comments in code by default. Add JSDoc only when needed to explain a non-obvious helper/utility function — not elsewhere.
- Design/architecture decisions belong in the plan/ticket (`plans/.../tickets/`), never as a code comment.
- When a design/architecture question comes up mid-task, research it and explain it at that point. Once it's settled and recorded in the ticket, don't re-explain or re-narrate it — that's wasted tokens.

## Response style (token economy)

- No step narration: skip "now I'll do X" before each tool call; keep end-of-turn summaries to 1-2 lines, don't restate the diff in prose.
- Prefer pointers over pasting code: reference existing code by `file:line`, don't paste the block back into the response.
- Explain only when asked: report what changed; only justify the "why" if the user asks or it's a genuine design question (see rule above).
- No inline TODO/FIXME: pending work becomes a ticket in the plan, never a loose marker in code.

## Pull requests

- A PR represents finished, verified work — never expose an open "Test plan" checklist in the PR description. That's a to-do list, and a PR isn't the place to leave to-dos.
- If there's verification still pending (migrations to apply, tests to run, manual checks), do it — or explicitly suggest it to the user — *before* opening the PR, not as a checklist inside it.
- Keep the PR body to a plain Summary of what changed and why. Only mention manual/local verification steps if something couldn't be verified in this environment and the reviewer needs to do it themselves.
