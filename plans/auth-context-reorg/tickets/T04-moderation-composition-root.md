# T04 — `moderation-routes.ts` vira composition root; separa support/admin

**Status:** [x] Concluído
**Depende de:** T01, T03
**Arquivos:** `src/modules/moderation/**`, `src/app.ts`

## Contexto

`moderation` vai crescer com mais sub-rotas/submódulos ao longo do tempo (é o
guarda-chuva de gestão da plataforma). Hoje o módulo tem duas rotas Fastify
registradas separadamente em `app.ts`, com prefixos diferentes (`/v1` pro
suporte público, `/v2/moderation` pro admin privado — ver T03). Christian quer
`moderation-routes.ts` como **composition root**: um único ponto que `app.ts`
registra, e que por dentro delega pros sub-módulos, cada um com seu próprio
arquivo e prefixo. Esse é o padrão a seguir para qualquer sub-rota nova de
`moderation` no futuro (ex.: `moderation-reports-routes.ts` e por aí vai).

**Alinhamento de tags OpenAPI:** já foi iniciado manualmente (working tree tem
edições não commitadas em `moderation-routes.ts` e `users-admin-routes.ts`) —
**não reverter, só carregar adiante no rename**. O padrão aplicado: toda rota
usa a tag da sua sub-área (`"Moderation / Support"` ou `"Moderation / Users"`);
só a primeira/representativa rota de cada arquivo (o único POST de support, o
"List users" do admin) também carrega a tag guarda-chuva `"Moderation"`. Não
adicionar `"Moderation"` nas demais rotas — o padrão já está correto como está,
só precisa sobreviver ao rename dos arquivos.

## Passo 1 — extrair `moderation-support-routes.ts`

`git mv` não se aplica aqui (é split, não move 1:1) — criar
`src/modules/moderation/moderation-support-routes.ts` com o conteúdo atual de
`moderation-routes.ts` (a rota `POST /moderation/support`, imports, use-case,
etc.), renomeando a função exportada `moderationRoutes` → `moderationSupportRoutes`.
Manter os imports e a lógica idênticos — só o nome do arquivo e da função mudam.

## Passo 2 — renomear `users-admin-routes.ts` → `moderation-admin-routes.ts`

`git mv src/modules/moderation/users-admin-routes.ts
src/modules/moderation/moderation-admin-routes.ts`. Dentro do arquivo, renomear
a função exportada `usersAdminRoutes` → `moderationAdminRoutes`. Não mexer em
mais nada — imports, tags (já alinhadas, ver acima) e lógica ficam iguais.

## Passo 3 — renomear o e2e spec

`git mv src/modules/moderation/users-admin.e2e.spec.ts
src/modules/moderation/moderation-admin.e2e.spec.ts`. Trocar o `describe`
de nível superior de `"users-admin"` para `"moderation-admin"` (convenção do
repo: describe em kebab-case igual ao nome do arquivo, ver `CLAUDE.md`).
Nenhuma outra mudança no spec — os paths `/v2/moderation/users/*` já estão
corretos (T03).

## Passo 4 — reescrever `moderation-routes.ts` como composition root

Novo conteúdo (substitui o antigo por completo — o conteúdo de rota já foi
para `moderation-support-routes.ts` no Passo 1):

```ts
import type { FastifyInstance } from "fastify";
import { moderationAdminRoutes } from "./moderation-admin-routes.js";
import { moderationSupportRoutes } from "./moderation-support-routes.js";

export async function moderationRoutes(app: FastifyInstance): Promise<void> {
	await app.register(moderationSupportRoutes, { prefix: "/v1" });
	await app.register(moderationAdminRoutes, { prefix: "/v2/moderation" });
}
```

O prefixo de cada sub-rota fica encapsulado aqui dentro — `app.ts` não precisa
mais saber que existem dois prefixos diferentes.

## Passo 5 — `src/app.ts`

- Remover a linha `import { usersAdminRoutes } from
  "./modules/moderation/users-admin-routes.js";` (import morto agora).
- Remover a linha `app.register(usersAdminRoutes, { prefix: "/v2/moderation" });`.
- Trocar `app.register(moderationRoutes, { prefix: "/v1" });` por
  `app.register(moderationRoutes);` (sem prefix — o composition root já aplica
  os prefixos corretos por dentro).

## Verificação

- `npx tsc --noEmit` limpo.
- `npm run lint` sem novos warnings.
- `npm run test:e2e -- moderation-admin` verde (nome do filtro muda junto com o
  rename do spec).
- Manual (Scalar `/docs`): confirmar que `POST /v1/moderation/support` e todas
  as `/v2/moderation/users/*` continuam respondendo, e que a tag `Moderation`
  aparece como grupo guarda-chuva com `Moderation / Support` e
  `Moderation / Users` como sub-grupos na sidebar.
