# Painel de erros no admin: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/admin/erros` no PlanA que lista as falhas reexecutáveis (cobranças, gerações de plano, mensagens) com o detalhe do erro e um botão "Reexecutar", e os logs de erro do servidor (`app_logs`), só para leitura.

**Architecture:**
- O PlanA lê `payments`, `plan_generations`, `notifications` e `app_logs` direto no MySQL compartilhado, com um repositório novo (`FailuresRepo`).
- O botão chama a rota `POST /api/admin/failures/retry`, que pede ao `v0-tami-forms` o `POST /api/jobs/retry` que já existe, por um método novo do `forms-client`.
- Nada muda no `v0-tami-forms`.

**Tech Stack:** Next.js 16 (route handlers, páginas client), TypeScript, Drizzle ORM 0.45 + `mysql2`, zod 3, Vitest 5, componentes `components/ui/*` (Radix) e `sonner`.

**Spec:** [docs/superpowers/specs/2026-10-24-painel-erros-design.md](../specs/2026-10-24-painel-erros-design.md). Leia o spec inteiro antes de qualquer tarefa. Este plano cita as seções dele (§N) e não repete os textos e tabelas que já estão lá.

## Global Constraints

- Tudo em `C:\Users\Tâmili\repo\dieta-app`, na branch `feature/painel-erros` (já existe, com o spec). Commits locais, **sem `push`**. O `../v0-tami-forms` precisa estar em `develop` (tem as migrations `0004`/`0005`).
- Gerenciador: **pnpm**, sempre como `corepack pnpm …`. Um teste: `corepack pnpm vitest run <arquivo>`.
- Toda mensagem de commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Estilo do projeto: fábricas `createX(d)` com dependências por parâmetro, comentários em português, sem ponto e vírgula, aspas duplas nos arquivos novos. Só `lib/repos/` importa o Drizzle e o schema.
- Rotas de API: `export const runtime = "nodejs"` e `export const dynamic = "force-dynamic"`, `requireAdmin()` antes de tudo, `getContainer()` para as dependências.
- **Não edite** `lib/db/schema.ts` nem `lib/time.ts` à mão: são cópias do `v0-tami-forms`, conferidas por `tests/db/schema-sync.test.ts`.
- Nenhuma dependência nova.
- Valores fixos do spec: teto de **200** linhas por tipo em `listFailed`; **50** logs por página; corpo da reexecução até **4 KB** (`4 * 1024`); timeout do `retry` **5000 ms** (o `timeoutMs` do cliente); período dos logs de no máximo **90 dias**, padrão **7 dias**; `page` de **1 a 10.000**; `area` até **40** caracteres; `id` de **1 a 64** caracteres; níveis `info`, `warn`, `error`, padrão `warn,error`.
- Nunca vão para o log do PlanA: `JOBS_TOKEN`, URL do `v0-tami-forms`, id do item reexecutado, `responseBody`, `fields`, nome e e-mail do paciente.
- Na página, `responseBody` e `fields` são exibidos **como texto** (`{texto}` dentro de `<pre>`), nunca com `dangerouslySetInnerHTML`.
- **Banco de teste.** Os testes de MySQL só rodam com `TEST_DATABASE_URL` apontando para o banco descartável `plana_test`, nunca para o `DATABASE_URL` do `.env.local`:

  ```bash
  export TEST_DATABASE_URL="$(node -e "const u=new URL(require('fs').readFileSync('../v0-tami-forms/.env.local','utf8').match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^[\"']|[\"']$/g,''));u.pathname='/plana_test';console.log(u.href)")"
  ```
  Sem a variável, os testes de repositório são pulados (`skipIf`). Isso não conta como "passou": rode-os com a variável antes de fechar a Task 1.

## Review Focus

1. **Virada do dia no filtro de datas.** "Até 24/10" tem que incluir um erro gravado às 23h30 de São Paulo, que em UTC já é 25/10 02:30. Teste em `saoPauloDayRange` (Task 4).
2. **`last_error` com tipo errado.** O JSON vem de outro app e de versões antigas: `httpStatus: "500"` (texto), `attempt` ausente, `responseBody` numérico. A falha deve aparecer mesmo assim, só com os campos válidos, sem quebrar a lista. Teste em `toFailedLastError` (Task 1).
3. **Página além do fim.** `page=10` com 3 logs: lista vazia, mas `total` certo, para a paginação voltar. Teste no repositório (Task 1).
4. **Item já reaberto por outra aba.** O `v0-tami-forms` responde `{ ok: true, reopened: 0 }`; o cliente tem que devolver `{ ok: true, reopened: 0 }`, e não um erro, para a tela dizer "já não está em falha". Teste na Task 2.
5. **Data só com dia na query.** `from=2026-10-24` (sem hora) ou `from=24/10/2026` chegando de um link antigo ou digitado à mão: recusar com 400, não interpretar no fuso do servidor. Teste em `parseAppLogsQuery` (Task 3).

---

### Task 1: Schema sincronizado e `FailuresRepo`

**Files:**
- Modify: `lib/db/schema.ts` (só via `corepack pnpm db:sync-schema`), `lib/repos/types.ts`, `lib/container.ts`
- Create: `lib/repos/failures.ts`
- Test: `tests/repos/failures.test.ts`

**Interfaces:**
- Produces (em `lib/repos/types.ts`):
  ```ts
  export type FailedItemType = "payment" | "plan_generation" | "notification"
  export type FailedLastError = { step: string; message: string; attempt?: number; at?: string; httpStatus?: number; responseBody?: string }
  export type FailedItem = {
    type: FailedItemType
    id: string
    patient: { id: string; name: string; email: string }
    lastError: FailedLastError | null
    attempts: number
    createdAt: Date
    updatedAt: Date
    channel?: Channel
    kind?: string
  }
  export type LogLevel = "info" | "warn" | "error"
  export type AppLogFilter = { from: Date; to: Date; area?: string; levels: LogLevel[]; page: number }
  export type AppLogRow = { id: number; ts: Date; level: string; event: string; area: string; fields: Record<string, unknown> }
  export type AppLogPage = { rows: AppLogRow[]; total: number; areas: string[] }
  export interface FailuresRepo {
    listFailed(): Promise<FailedItem[]>
    listAppLogs(f: AppLogFilter): Promise<AppLogPage>
  }
  ```
- Produces (em `lib/repos/failures.ts`): `createFailuresRepo(db: Db): FailuresRepo`, `toFailedLastError(raw: unknown): FailedLastError | null`, `FAILED_LIMIT_PER_TYPE = 200`, `APP_LOGS_PAGE_SIZE = 50`.
- Produces (em `lib/container.ts`): `c.repos.failures: FailuresRepo`.

Só `step` e `message` são obrigatórios em `FailedLastError` (§4.1); na tela, "tentativa N" e a data só aparecem quando vierem.

- [ ] **Step 1: Sincronizar o schema**

Run: `corepack pnpm db:sync-schema && corepack pnpm vitest run tests/db/schema-sync.test.ts tests/lib/db/check.test.ts`
Expected: `schema copiado: …`, e os dois arquivos PASS. `git diff --stat lib/db/schema.ts` mostra só adições (`app_logs`, `funnel_sessions`, `funnel_events` e os imports `bigint`, `smallint`, `tinyint`).

- [ ] **Step 2: Escrever os testes que falham** em `tests/repos/failures.test.ts`, no molde de `tests/repos/stats.test.ts` (`describe.skipIf(!mysqlTestsEnabled)`, `openTestDb`, `truncateAll` no `beforeEach`), com `seedQuizPatient` de `tests/helpers/seed.ts` para criar paciente, cobrança e envio do quiz:

```ts
// toFailedLastError (fora do describe do MySQL: roda sempre)
it("toFailedLastError aproveita os campos válidos", () => {
  expect(toFailedLastError({ step: "asaas.payment", message: "HTTP 400", attempt: 1, at: "2026-10-24T13:05:00.000Z", httpStatus: 400, responseBody: "{}" }))
    .toEqual({ step: "asaas.payment", message: "HTTP 400", attempt: 1, at: "2026-10-24T13:05:00.000Z", httpStatus: 400, responseBody: "{}" })
})
it("toFailedLastError descarta campos com tipo errado e mantém o resto", () => {
  expect(toFailedLastError({ step: "x", message: "m", httpStatus: "500", responseBody: 12, extra: true }))
    .toEqual({ step: "x", message: "m" })
})
it("toFailedLastError sem step ou sem message em texto → null", () => {
  for (const raw of [null, "texto", [], { message: "m" }, { step: "x" }, { step: 1, message: "m" }]) expect(toFailedLastError(raw)).toBeNull()
})

// MySQL
it("listFailed traz os três tipos em falha com o paciente, em updatedAt decrescente", …)
// cobrança ASAAS_FAILED (updatedAt T1), geração failed (T3), mensagem failed whatsapp/payment_link (T2)
// → types na ordem ["plan_generation", "notification", "payment"]; patient { id, name, email } do seed;
//   attempts = sync_attempts na cobrança e attempts nas outras; channel/kind só na mensagem
it("listFailed ignora o que não está em falha", …)
// cobranças PENDING_ASAAS, PENDING, RECEIVED, CONFIRMED; gerações pending, done; mensagens pending, sent → []
it("listFailed devolve lastError null quando o JSON é malformado", …)
it("listFailed limita a 200 por tipo, os mais recentes", …)
// 201 cobranças ASAAS_FAILED → 200 itens "payment", sem a de updatedAt mais antigo
it("listAppLogs filtra por período (from incluído, to excluído), nível e área", …)
it("listAppLogs pagina de 50 em 50, do mais recente; total conta tudo", …)
// 51 logs → page 1: 50 linhas, a primeira é a mais recente; page 2: 1 linha; total 51 nas duas
it("listAppLogs além da última página → rows [] e total certo", …)
// 3 logs, page 10 → { rows: [], total: 3 }
it("listAppLogs: areas é a lista distinta e ordenada do período e nível, ignorando o filtro de área", …)
// logs payment/warn, webhook/error, plan/info; filtro levels [warn, error], area "payment" → rows só payment; areas ["payment", "webhook"]
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/repos/failures.test.ts`
Expected: FAIL (módulo `@/lib/repos/failures` não existe).

- [ ] **Step 4: Implementar** os tipos em `lib/repos/types.ts`, `lib/repos/failures.ts` e `repos.failures` no `Container` e no `buildContainer`.
  - `listFailed`: três `select … innerJoin(patients) … where(status) orderBy(desc(updatedAt)) limit(200)` (§4.2), unidos e ordenados por `updatedAt` decrescente.
  - `listAppLogs`: o `where` de §4.3 montado com `and(gte(ts, from), lt(ts, to), inArray(level, levels), area ? eq(area, area) : undefined)`; `rows`, `count()` e `selectDistinct({ area })` (sem a condição de área) em `Promise.all`.

- [ ] **Step 5: Rodar e ver passar**

Run (com `TEST_DATABASE_URL` exportada): `corepack pnpm vitest run tests/repos/failures.test.ts && corepack pnpm typecheck`
Expected: PASS, sem testes pulados no arquivo; typecheck sem erros.

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.ts lib/repos/types.ts lib/repos/failures.ts lib/container.ts tests/repos/failures.test.ts
git commit -m "feat: schema com app_logs e repositório das falhas e dos logs de erro"
```

### Task 2: `forms.retry`

**Files:**
- Modify: `lib/forms-client.ts`
- Test: `tests/lib/forms-client.test.ts`

**Interfaces:**
- Produces (em `lib/forms-client.ts`):
  ```ts
  export type RetryTarget = { paymentId: string } | { planGenerationId: string } | { notificationId: string }
  export type RetryResult = { ok: true; reopened: number } | { ok: false }
  // FormsClient ganha: retry(target: RetryTarget): Promise<RetryResult>
  ```
- Comportamento: §5.3 do spec. Usa o `timeoutMs` que já existe (padrão `DEFAULT_TIMEOUT_MS`) e lê o corpo dentro do prazo, como o `submitRenewal`.

- [ ] **Step 1: Escrever os testes que falham** num `describe("formsClient.retry")`, reaproveitando `TOKEN` e `fakeLog` do arquivo:

```ts
it.each([{ paymentId: "p1" }, { planGenerationId: "g1" }, { notificationId: "n1" }])(
  "faz POST em /api/jobs/retry com o Bearer e o corpo %o", async (target) => {
    // fetch responde 200 { ok: true, reopened: 1 }
    // url "http://forms:5000/api/jobs/retry"; method POST; authorization `Bearer ${TOKEN}`;
    // content-type application/json; JSON.parse(body) toEqual(target); resultado { ok: true, reopened: 1 }
  })
it("reopened 0 (item já reaberto) → { ok: true, reopened: 0 }", …)
it.each([401, 404, 500])("status %i → { ok: false } e warn forms.retry.failed { status }", …)
it.each([{}, { ok: false }, { ok: true }, { ok: true, reopened: -1 }, { ok: true, reopened: 1.5 }, { ok: true, reopened: "1" }])(
  "corpo inesperado %o → { ok: false } e warn com reason unexpected_body", …)
it("JSON inválido na resposta → { ok: false }", …)
it("erro de rede → { ok: false } e warn { error: err.name }", …)
it("timeout → { ok: false }", …) // mesmo molde do teste de timeout do dispatch, timeoutMs: 20
it("nenhum warn traz o token, a URL nem o id", …)
// junte JSON.stringify de todas as chamadas de log.warn dos casos de falha; não contém TOKEN, "forms:5000" nem "p1"
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/lib/forms-client.test.ts`
Expected: FAIL (`client.retry is not a function`); os testes antigos continuam PASS.

- [ ] **Step 3: Implementar `retry`** em `lib/forms-client.ts`, com `retryUrl = \`${base}/api/jobs/retry\``. `reopened` válido = `Number.isInteger(x) && x >= 0`. Atualize o comentário do `createFormsClient` para citar a reexecução.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/lib/forms-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/forms-client.ts tests/lib/forms-client.test.ts
git commit -m "feat: cliente do v0-tami-forms pede a reexecução de uma falha"
```

### Task 3: Validação do pedido de reexecução e do filtro de logs

**Files:**
- Create: `lib/validation/failures.ts`
- Test: `tests/lib/validation/failures.test.ts`

**Interfaces:**
- Consumes: `RetryTarget` (Task 2), `FailedItemType`, `LogLevel`, `AppLogFilter` (Task 1).
- Produces:
  ```ts
  export const retryRequestSchema: z.ZodType<{ type: FailedItemType; id: string }>
  export function toRetryTarget(r: { type: FailedItemType; id: string }): RetryTarget
  export const APP_LOGS_MAX_RANGE_DAYS = 90
  export const APP_LOGS_DEFAULT_RANGE_DAYS = 7
  export function parseAppLogsQuery(params: URLSearchParams, now: Date): { ok: true; filter: AppLogFilter } | { ok: false }
  ```
- `from`/`to` aceitam só data e hora ISO 8601 com fuso (`z.string().datetime({ offset: true })`), nunca uma data sem hora.

- [ ] **Step 1: Escrever os testes que falham**

```ts
const NOW = new Date("2026-10-24T15:00:00.000Z")
const q = (s: string) => parseAppLogsQuery(new URLSearchParams(s), NOW)

it.each([["payment", { paymentId: "x" }], ["plan_generation", { planGenerationId: "x" }], ["notification", { notificationId: "x" }]] as const)(
  "toRetryTarget(%s)", (type, target) => expect(toRetryTarget({ type, id: "x" })).toEqual(target))
it("retryRequestSchema aceita os três tipos com id de 1 a 64", …) // id "a" e "a".repeat(64)
it.each([{ type: "allFailed", id: "x" }, { type: "payment", id: "" }, { type: "payment", id: "a".repeat(65) }, { type: "payment", id: "x", extra: 1 }, { type: "payment" }, null])(
  "retryRequestSchema recusa %o", …)

it("sem parâmetros: últimos 7 dias, warn e error, página 1, sem área", () => {
  expect(q("")).toEqual({ ok: true, filter: { from: new Date("2026-10-17T15:00:00.000Z"), to: NOW, levels: ["warn", "error"], page: 1 } })
})
it("lê from, to, area, level e page", …)
// "from=2026-10-01T03:00:00.000Z&to=2026-10-25T02:59:59.999Z&area=payment&level=error,info&page=3"
it("aceita período de exatamente 90 dias", …)
it.each([
  "from=2026-10-24T00:00:00.000Z&to=2026-10-24T00:00:00.000Z",  // from = to
  "from=2026-07-01T00:00:00.000Z&to=2026-10-24T00:00:00.000Z",  // > 90 dias
  "from=2026-10-24", "from=24/10/2026", "to=ontem",
  "level=debug", "level=warn,warn", "level=",
  `area=${"a".repeat(41)}`, "area=",
  "page=0", "page=1.5", "page=10001", "page=abc",
])("recusa %s", (s) => expect(q(s)).toEqual({ ok: false }))
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/lib/validation/failures.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar** `lib/validation/failures.ts`. Padrões aplicados antes da checagem de período: `to` ausente → `now`; `from` ausente → `to - 7 dias`.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/lib/validation/failures.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validation/failures.ts tests/lib/validation/failures.test.ts
git commit -m "feat: validação da reexecução e do filtro dos logs de erro"
```

### Task 4: Formatação para a tela

**Files:**
- Create: `lib/admin/failures-format.ts`
- Test: `tests/lib/admin/failures-format.test.ts`

**Interfaces:**
- Consumes: `FailedItemType`, `Channel` (Task 1 / `lib/repos/types.ts`).
- Produces:
  ```ts
  export function failureTypeLabel(type: FailedItemType): string        // "Cobrança" | "Geração de plano" | "Mensagem"
  export function notificationLabel(channel: Channel, kind: string): string
  export function failureHint(type: FailedItemType): string             // textos de §6.1
  export function formatSaoPauloDateTime(iso: string, opts?: { seconds?: boolean }): string
  /** Dias de calendário de São Paulo (YYYY-MM-DD) → instantes ISO: from às 00:00:00.000 e to às 23:59:59.999 de São Paulo. */
  export function saoPauloDayRange(fromDay: string, toDay: string): { from: string; to: string }
  ```
- `saoPauloDayRange` usa o deslocamento fixo `-03:00` (o Brasil não tem horário de verão desde 2019): `new Date(\`${day}T00:00:00.000-03:00\`)`. `formatSaoPauloDateTime` usa `Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", … })`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it("rótulos dos tipos", …) // payment → "Cobrança", plan_generation → "Geração de plano", notification → "Mensagem"
it.each([
  ["email", "payment_link", "Mensagem · E-mail · link de pagamento"],
  ["whatsapp", "plan_ready", "Mensagem · WhatsApp · plano pronto"],
  ["email", "password_reset", "Mensagem · E-mail · redefinição de senha"],
  ["email", "plan_expiring_d5", "Mensagem · E-mail · aviso de vencimento (5 dias)"],
  ["whatsapp", "plan_expiring_d2", "Mensagem · WhatsApp · aviso de vencimento (2 dias)"],
  ["email", "plan_expiring_d0", "Mensagem · E-mail · aviso de vencimento (no dia)"],
  ["email", "novo_tipo", "Mensagem · E-mail · novo_tipo"],
] as const)("notificationLabel(%s, %s)", …)
it("dicas por tipo", …) // os três textos exatos de §6.1
it("formatSaoPauloDateTime", () => {
  expect(formatSaoPauloDateTime("2026-10-24T13:05:00.000Z")).toBe("24/10/2026 10:05")
  expect(formatSaoPauloDateTime("2026-10-25T02:30:00.000Z")).toBe("24/10/2026 23:30")
  expect(formatSaoPauloDateTime("2026-10-24T13:05:00.000Z", { seconds: true })).toBe("24/10/2026 10:05:00")
})
it("saoPauloDayRange inclui o dia inteiro de São Paulo", () => {
  expect(saoPauloDayRange("2026-10-24", "2026-10-24")).toEqual({ from: "2026-10-24T03:00:00.000Z", to: "2026-10-25T02:59:59.999Z" })
})
it("um erro às 23h30 de São Paulo cai dentro do dia", () => {
  const { from, to } = saoPauloDayRange("2026-10-24", "2026-10-24")
  const ts = new Date("2026-10-25T02:30:00.000Z")
  expect(ts >= new Date(from) && ts < new Date(to)).toBe(true)
})
```

Se o `Intl` do Node devolver separador diferente (`24/10/2026, 10:05`), monte a string com `formatToParts` para obter exatamente o formato acima.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/lib/admin/failures-format.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar** `lib/admin/failures-format.ts` (sem imports de servidor: a página client importa este arquivo; importe só tipos com `import type`).

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/lib/admin/failures-format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/admin/failures-format.ts tests/lib/admin/failures-format.test.ts
git commit -m "feat: rótulos, dicas e datas de São Paulo do painel de erros"
```

### Task 5: Rotas do admin

**Files:**
- Create: `app/api/admin/failures/route.ts`, `app/api/admin/failures/retry/route.ts`, `app/api/admin/app-logs/route.ts`

**Interfaces:**
- Consumes: `c.repos.failures` (Task 1), `c.forms.retry` (Task 2), `retryRequestSchema`, `toRetryTarget`, `parseAppLogsQuery` (Task 3), `requireAdmin` (`lib/auth/guards.ts`), `readJsonBody` (`lib/http/read-json.ts`).
- Produces (contratos que a página da Task 6 consome; datas serializadas em ISO pelo `Response.json`):
  - `GET /api/admin/failures` → 200 `{ items: FailedItem[] }` | 500 `{ error: "Erro ao carregar as falhas" }`
  - `POST /api/admin/failures/retry` body `{ type, id }` → 200 `{ ok: true, reopened: number }` | 400/413 `{ error: "Pedido inválido" }` | 502 `{ error: "Não foi possível reexecutar agora" }`
  - `GET /api/admin/app-logs?from&to&area&level&page` → 200 `{ rows: AppLogRow[], total, areas, page, pageSize: 50 }` | 400 `{ error: "Filtro inválido" }` | 500 `{ error: "Erro ao carregar os logs" }`
  - Todas: 401 do `requireAdmin` sem sessão de admin.

O projeto não tem testes de rota: as peças com lógica (guarda, validação, repositório, cliente) já estão testadas nas Tasks 1 a 3 e em `tests/lib/auth/guards.test.ts`. As rotas só as ligam.

- [ ] **Step 1: Implementar as três rotas** no molde de `app/api/admin/dashboard-stats/route.ts`, seguindo §5.1, §5.2 e §5.4. No retry: `readJsonBody(req, 4 * 1024)`; com falha, responder com o `status` que ele devolve. Log de sucesso: `c.log.info("admin.failures.retry", { type, reopened, adminId: guard.session.userId })`. Erros: `admin.failures.error`, `admin.failures.retry.error`, `admin.app_logs.error`, com `{ message: error instanceof Error ? error.name : "unknown" }`.

- [ ] **Step 2: Verificar**

Run: `corepack pnpm typecheck && corepack pnpm vitest run`
Expected: typecheck sem erros; suíte toda PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/failures app/api/admin/app-logs
git commit -m "feat: rotas do admin para listar falhas e logs e reexecutar uma falha"
```

### Task 6: Página `/admin/erros` e item no menu

**Files:**
- Create: `app/admin/erros/page.tsx`
- Modify: `components/admin-nav.tsx`

**Interfaces:**
- Consumes: as rotas da Task 5; `failureTypeLabel`, `notificationLabel`, `failureHint`, `formatSaoPauloDateTime`, `saoPauloDayRange` (Task 4); `todayInSaoPaulo`, `addDaysISO` (`lib/time.ts`) para os valores iniciais dos campos de data; `AdminNav`, `Pagination`, `components/ui/{card,button,badge,input,select,switch,alert-dialog}`, `sonner`, `lucide-react`.

Tudo o que a tela mostra e os textos exatos estão em §6.1 e §6.2. Decisões que o spec deixa abertas:

- `useSearchParams` para `?aba=` exige `<Suspense>` em volta do conteúdo, como em `app/admin/dashboard/page.tsx`. Trocar de aba usa `router.replace` com o parâmetro novo.
- Checagem de sessão igual à do dashboard (`/api/auth/session`, `userType !== "admin"` → `/admin/login`). Uma resposta 401 de qualquer rota nova também vai para `/admin/login`.
- Valores iniciais dos campos "De" e "Até": `addDaysISO(todayInSaoPaulo(new Date()), -7)` e `todayInSaoPaulo(new Date())`. Antes de chamar a API, converta com `saoPauloDayRange(de, ate)`. Datas vazias ou "De" depois de "Até" não disparam a busca e mostram `toast.error("Período inválido")`.
- "Ver resposta" e "Ver campos" usam `<details><summary>…</summary><pre className="… max-h-80 overflow-auto whitespace-pre-wrap break-all">…</pre></details>`, sem componente novo.
- O botão "Reexecutar" de um item fica desabilitado enquanto o pedido daquele item está em andamento. Isso evita o duplo clique; os outros itens continuam livres.
- Os `Switch` de nível: desligar o último ligado é ignorado (ele continua ligado).
- `totalPages = Math.max(1, Math.ceil(total / pageSize))`. Se a resposta vier com `rows` vazio e `page > totalPages`, volte para `totalPages`.
- Menu: `{ href: "/admin/erros", label: "Erros", icon: AlertTriangle }` entre "Receitas" e "Configurações".

- [ ] **Step 1: Implementar** `app/admin/erros/page.tsx` e o item em `components/admin-nav.tsx`.

- [ ] **Step 2: Verificar a compilação**

Run: `corepack pnpm typecheck && corepack pnpm build`
Expected: os dois sem erros; o build lista `/admin/erros`.

- [ ] **Step 3: Conferir no navegador** com `corepack pnpm dev` (porta 5000), logado como admin, com o banco de desenvolvimento:
  - o menu mostra "Erros" e a página abre na aba "Falhas";
  - com uma linha `failed` em `notifications` (crie uma à mão no banco de desenvolvimento, se não houver), o card mostra selo, paciente com link, erro, dica e "Reexecutar"; o diálogo de confirmação aparece;
  - a aba "Logs de erro" lista os logs dos últimos 7 dias e os filtros mudam a lista;
  - `?aba=logs` abre direto na segunda aba.
  Se não houver `v0-tami-forms` rodando, "Reexecutar" deve mostrar o toast de erro e o item continuar na lista. Esse também é um critério de §10.

- [ ] **Step 4: Commit**

```bash
git add app/admin/erros/page.tsx components/admin-nav.tsx
git commit -m "feat: página de erros no admin com reexecução das falhas e logs do servidor"
```

### Task 7: README e verificação final

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Atualizar o README:**
  - na descrição do admin (seção 1), a página **Erros** em uma ou duas frases: falhas reexecutáveis com botão e logs de erro do servidor dos últimos 90 dias;
  - na seção 6 (Deploy), uma nota com o texto de §8 do spec: depois desta versão, o boot exige `app_logs`, `funnel_sessions` e `funnel_events`, então o `v0-tami-forms` com a observabilidade (migrations `0004`/`0005`) sobe antes;
  - na seção 10, o link para o spec novo.

- [ ] **Step 2: Verificação completa**

Run (com `TEST_DATABASE_URL` exportada): `corepack pnpm vitest run && corepack pnpm typecheck && corepack pnpm build`
Expected: todos os testes PASS (incluindo `tests/repos/failures.test.ts` e `tests/db/schema-sync.test.ts`, sem pulados por falta de banco), typecheck e build sem erros.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README com a página de erros e a ordem de deploy das tabelas de observabilidade"
```
