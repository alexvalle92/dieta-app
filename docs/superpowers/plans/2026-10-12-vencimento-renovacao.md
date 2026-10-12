# Vencimento e renovação: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Avisar o paciente por tela, e-mail e WhatsApp de que o plano está acabando e deixá-lo renovar pelo PlanA: formulário, cobrança, pagamento e plano novo, sem ação manual.

**Architecture:**
- O `v0-tami-forms` continua dono das migrations, do Asaas e de todo envio. Ele ganha a migration `0003`, um passo no job que enfileira os avisos de vencimento e o endpoint interno `POST /api/renewals`, que reaproveita o serviço do quiz.
- O estado da renovação não é gravado em lugar nenhum: é calculado a partir de `payments` por uma regra pura, `lib/renewal/rules.ts`, que existe idêntica nos dois repositórios.
- O PlanA ganha o formulário em `/cliente/planos/[id]/renovar`, chama o `v0-tami-forms` para criar a cobrança, e o alerta de vencimento passa a decidir o que mostrar por uma função pura.

**Tech Stack:** Next.js 16 (route handlers, `after()`, `middleware.ts`), TypeScript, Drizzle ORM 0.45 + `mysql2`, zod 3, Vitest 5.

**Spec:** [docs/superpowers/specs/2026-10-12-vencimento-renovacao-design.md](../specs/2026-10-12-vencimento-renovacao-design.md). Leia o spec inteiro antes de qualquer tarefa. Este plano cita as seções dele (§N) e não repete os textos que já estão lá.

## Global Constraints

- **Dois repositórios.** Tasks 1 a 5 rodam em `C:\Users\Tâmili\repo\v0-tami-forms`; Tasks 6 a 11 em `C:\Users\Tâmili\repo\dieta-app`. Branch `feature/vencimento-renovacao` nos dois: no `dieta-app` ela já existe; no `v0-tami-forms`, crie a partir de `main` antes da Task 1 (`git checkout -b feature/vencimento-renovacao`). Commits locais, **sem `push`**.
- Gerenciador: **pnpm 9.15.0**, sempre como `corepack pnpm …`. Um teste: `corepack pnpm vitest run <arquivo>`.
- Toda mensagem de commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Layout intocado.** Em telas existentes só mudam os pontos de §8.3 e §8.4. Não altere `className`, estrutura de JSX nem textos fora deles.
- Estilo dos dois projetos: fábricas `createX(d)` com dependências por parâmetro, comentários em português, sem ponto e vírgula, aspas duplas, relógio da aplicação (`now`) em vez do relógio do banco, ids com `randomUUID()`, todo `UPDATE` define `updatedAt`. No PlanA, só `lib/repos/` importa o Drizzle.
- Rotas de API: `export const runtime = "nodejs"` e `export const dynamic = "force-dynamic"`. Leitura de env sempre lazy.
- "Hoje" é sempre a data em `America/Sao_Paulo` (`todayInSaoPaulo(now)`), nunca a data UTC.
- Valores fixos do spec:
  - estágios por dias restantes: 3 a 5 → `d5`; 1 e 2 → `d2`; 0 → `d0`; negativo → vencido; formulário aberto com 2 dias ou menos (§4);
  - tipos de mensagem: `plan_expiring_d5`, `plan_expiring_d2`, `plan_expiring_d0`;
  - horário dos avisos: hora de São Paulo de 9 (inclusive) a 20 (exclusive);
  - `POST /api/renewals`: corpo máximo de 64 KB; o PlanA chama com tempo limite de 25 000 ms;
  - limite do envio do formulário: 5 por 600 000 ms por paciente;
  - `altura_cm` inteiro de 120 a 230; `peso_kg` e `meta_peso_30d` de 30 a 300.
- Nunca vão para log: respostas do formulário, links de pagamento, `JOBS_TOKEN`. CPF, e-mail e telefone saem mascarados (o logger já mascara pelas chaves `cpf`, `email`, `phone`).
- **Banco de teste.** Os testes de MySQL só rodam com `TEST_DATABASE_URL` apontando para o banco descartável `plana_test`; nunca o `DATABASE_URL` do `.env.local`. Os dois repositórios usam o mesmo banco: não rode as duas suítes ao mesmo tempo. Para montar a variável:

  ```bash
  export TEST_DATABASE_URL="$(node -e "const u=new URL(require('fs').readFileSync('../v0-tami-forms/.env.local','utf8').match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^[\"']|[\"']$/g,''));u.pathname='/plana_test';console.log(u.href)")"
  ```
- Os testes de MySQL do PlanA criam as tabelas com as migrations de `../v0-tami-forms`, que precisa estar na branch deste trabalho. Por isso as Tasks 1 a 5 vêm primeiro.
- Nenhum teste envia e-mail ou WhatsApp de verdade nem chama o Asaas ou a Anthropic.

## Review Focus

1. **Paciente sem telefone.** O admin pode cadastrar paciente com `phone` vazio. Ele deve renovar e receber os avisos só por e-mail: nenhuma mensagem de WhatsApp para o destinatário `55`, e nenhum `400` no envio do formulário. Testes nas Tasks 2 e 5.
2. **Formulário enviado duas vezes.** Duas abas, ou o botão "Atualizar Dados", geram dois envios com `submissionId` diferentes. O resultado deve ser uma cobrança só e o mesmo link. Teste na Task 5.
3. **Respostas antigas fora do formato.** `quiz_responses.answers` é JSON vindo da internet: pode trazer número onde se espera lista, objeto, opção que não existe mais. A tela deve abrir com o que der para aproveitar, sem erro. Teste na Task 7.
4. **Virada do dia.** Às 22h30 de São Paulo já é o dia seguinte em UTC. O plano que vence "hoje" não pode aparecer como vencido nem receber o aviso do estágio errado. Testes nas Tasks 1 e 6.
5. **Plano sem data de fim ou vencido há muito tempo.** `end_date` nulo: sem aviso e formulário fechado. Vencido há 40 dias: sem aviso, formulário aberto. Testes nas Tasks 1, 2 e 7.

---

# Parte A: `v0-tami-forms`

### Task 1: Regras de renovação e hora de São Paulo

**Files:**
- Create: `lib/renewal/rules.ts`, `tests/lib/renewal/rules.test.ts`
- Modify: `lib/time.ts`, `tests/lib/time.test.ts`

**Interfaces:**
- Produces (`lib/renewal/rules.ts`, sem nenhum `import`, porque o PlanA copia o arquivo):

  ```ts
  export type RenewalStatus = "none" | "awaiting_payment" | "payment_expired" | "paid"
  export type RenewalCharge = { id: string; status: string; dueDate: string | null; paymentUrl: string | null; paidAt: Date | null }
  export type RenewalState = { status: RenewalStatus; paymentId: string | null; dueDate: string | null; paymentUrl: string | null }
  export type ExpiryStage = "d5" | "d2" | "d0"
  export const WARN_DAYS = 5
  export const RENEWAL_OPEN_DAYS = 2
  /** `endDate` menos `today`, em dias; as duas datas são YYYY-MM-DD. */
  export function daysLeft(endDate: string | null, today: string): number | null
  export function expiryStage(days: number | null): ExpiryStage | "expired" | null
  export function isRenewalOpen(days: number | null): boolean
  export function renewalState(charge: RenewalCharge | null, today: string): RenewalState
  ```
- Produces (`lib/time.ts`): `hourInSaoPaulo(now: Date): number`, de 0 a 23.

- [ ] **Step 1: Testes que falham**

  `tests/lib/renewal/rules.test.ts`:
  - `daysLeft`: `("2026-10-17", "2026-10-12")` → `5`; `("2026-10-11", "2026-10-12")` → `-1`; `("2026-11-01", "2026-10-30")` → `2`; `(null, "2026-10-12")` → `null`.
  - `expiryStage`: `6` → `null`; `5` e `3` → `"d5"`; `2` e `1` → `"d2"`; `0` → `"d0"`; `-1` e `-40` → `"expired"`; `null` → `null`.
  - `isRenewalOpen`: `3` → `false`; `2`, `0` e `-40` → `true`; `null` → `false`.
  - `renewalState`, com `today = "2026-10-12"` e uma cobrança base `{ id: "p1", status, dueDate, paymentUrl: "https://a/i/1", paidAt: null }`:
    - `null` → `{ status: "none", paymentId: null, dueDate: null, paymentUrl: null }`;
    - `paidAt` preenchido, qualquer status → `{ status: "paid", paymentId: "p1", dueDate: null, paymentUrl: null }`;
    - `PENDING_ASAAS`, `dueDate` e `paymentUrl` nulos → `awaiting_payment` com os dois nulos;
    - `PENDING` com `dueDate` `"2026-10-12"` → `awaiting_payment`, com o `dueDate` e o link;
    - `PENDING` com `dueDate` nulo → `awaiting_payment`;
    - `PENDING` com `dueDate` `"2026-10-11"` → `{ status: "payment_expired", paymentId: "p1", dueDate: "2026-10-11", paymentUrl: null }`;
    - `OVERDUE` → `payment_expired`;
    - `DELETED` e `ASAAS_FAILED` → `none`, com `paymentId` nulo.

  `tests/lib/time.test.ts`: `hourInSaoPaulo(new Date("2026-10-12T12:00:00Z"))` → `9`; `("2026-10-13T01:30:00Z")` → `22`; `("2026-10-12T03:00:00Z")` → `0`. E `todayInSaoPaulo(new Date("2026-10-13T01:30:00Z"))` → `"2026-10-12"` (Review Focus 4).

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/renewal tests/lib/time.test.ts`
  Expected: FAIL (módulo e função inexistentes).

- [ ] **Step 3: Implementar**

  `lib/renewal/rules.ts` com o comentário no topo: `// Regras de vencimento e renovação (spec de vencimento e renovação, §4). Fonte: v0-tami-forms; o PlanA mantém uma cópia idêntica.` As linhas da tabela de §4 são avaliadas na ordem do spec. `daysLeft` faz a conta em UTC, como `addDaysISO`.

  `hourInSaoPaulo` usa `Intl.DateTimeFormat` com `timeZone: "America/Sao_Paulo"` e `hourCycle: "h23"`.

- [ ] **Step 4: Rodar e ver passar**

  Run: `corepack pnpm vitest run tests/lib/renewal tests/lib/time.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add lib/renewal lib/time.ts tests/lib/renewal tests/lib/time.test.ts
  git commit -m "feat: regras de vencimento e renovação e hora de São Paulo"
  ```

### Task 2: Migration `0003` e fila dos avisos de vencimento

**Files:**
- Modify: `lib/db/schema.ts`, `lib/db/repos/types.ts`, `lib/db/repos/mysql.ts`
- Create: `lib/db/migrations/0003_*.sql` e `meta/0003_snapshot.json` (gerados)
- Modify (testes): `tests/fakes/memory-repos.ts`, `tests/db/repos.contract.ts`, `tests/db/repos.mysql.test.ts`

**Interfaces:**
- Consumes: `daysLeft`, `expiryStage`, `renewalState`, `RenewalCharge` (Task 1).
- Produces (schema): em `notifications`, `mealPlanId`; em `mealPlans`, saem `dueDateNewMealPlan` e `paymentUrlNewMealPlan`.
- Produces (tipos, `lib/db/repos/types.ts`):

  ```ts
  export type NotificationKind =
    | "payment_link" | "plan_ready" | "password_reset"
    | "plan_expiring_d5" | "plan_expiring_d2" | "plan_expiring_d0"
  // em NotificationView:
  /** Plano do aviso de vencimento; nulo nas demais mensagens. */
  mealPlan: { id: string; endDate: string | null } | null
  // em NotificationRepo:
  /** Enfileira os avisos de vencimento do dia (§6.1). Devolve quantas linhas criou. */
  enqueuePlanExpiring(d: { today: string; channels: Channel[]; now: Date }): Promise<number>
  ```
- Produces (fake de teste): `seed.mealPlan(d: { patientId: string; endDate: string | null; status?: string }): string` cria um plano como o admin do PlanA cria (sem cobrança) e devolve o id.

- [ ] **Step 1: Testes que falham**

  Em `tests/db/repos.contract.ts`, com os helpers que já existem (`paidGeneration`, `done`, `syncedPayment`, `ev`, `sleep`) e um helper novo `expiringOf(repos, mealPlanId)`, que lista as notificações vencidas (`listDue(inMinutes(1), BIG)`), lê cada uma com `get` e devolve as que têm `mealPlan.id` igual. Todos usam `today = "2026-10-12"` e `channels = ["email", "whatsapp"]`, salvo indicação:
  - "36. aviso de vencimento: o estágio segue os dias restantes". Um plano concluído por `planGenerations.complete` para cada `endDate`: `2026-10-17` e `2026-10-15` → duas linhas `plan_expiring_d5`; `2026-10-14` e `2026-10-13` → `plan_expiring_d2`; `2026-10-12` → `plan_expiring_d0`; `2026-10-18` e `2026-10-11` → nenhuma. Em cada linha: `status: "pending"`, `quizResponseId: null`, `paymentId: null`, `paymentUrl: null`, `mealPlan: { id, endDate }`, `patientName` do paciente, e o destinatário de cada canal (e-mail; `55` + telefone).
  - "37. aviso de vencimento não se repete". Plano com `endDate` `2026-10-17`: a primeira chamada cria 2 linhas; a segunda, com o mesmo `today`, devolve `0` linhas novas para o plano; com `today = "2026-10-15"` o plano passa a ter também as 2 linhas de `d2`, e as de `d5` continuam 2.
  - "38. renovação já paga não recebe aviso". Plano com `endDate` `2026-10-13`; depois dele (`await sleep(5)`), novo envio do mesmo CPF, cobrança sincronizada e evento pago aplicado, sem concluir a geração → nenhuma linha para o plano.
  - "39. a cobrança de renovação entra no aviso só em d2 e d0, com link". Plano com `endDate` `2026-10-13`; depois dele, novo envio do mesmo CPF com a cobrança sincronizada como `PENDING` e `dueDate` `2026-10-14` → as linhas têm `paymentId` da cobrança nova e `paymentUrl` dela. Variações, cada uma num paciente novo: cobrança ainda `PENDING_ASAAS` → `paymentId: null`; `dueDate` `2026-10-11` → `null`; plano em `d5` (`endDate` `2026-10-16`) com cobrança válida → `null`.
  - "40. plano que deixou de ser ativo não recebe aviso". Segunda compra concluída: o plano anterior (`completed`), com `endDate` `2026-10-13`, não ganha linha; o novo, sim, conforme o `endDate` dele.
  - "41. canais e paciente sem telefone". `channels: ["email"]` → só a linha de e-mail. Paciente criado com `phone: ""` e os dois canais → só a linha de e-mail (Review Focus 1). No mesmo teste: `enqueuePaymentLink` para um envio desse paciente também cria só a linha de e-mail.

  Em `tests/db/repos.mysql.test.ts`:
  - `describe.skipIf(!url)("migration 0003 em banco com dados")`, no mesmo molde do `describe` da `0002`: aplica `0000` a `0002` à mão, insere um paciente, um plano com `due_date_new_meal_plan` preenchido e uma notificação, aplica a `0003` e afirma: `meal_plans` não tem mais as duas colunas; `notifications.meal_plan_id` existe com `IS_NULLABLE = 'YES'` e vale `NULL` na linha antiga; existem os índices `notifications_plan_channel_kind_unique` e `meal_plans_status_end_date_idx` (`information_schema.statistics`).
  - No teste das tabelas, a contagem de migrations passa a `4`.
  - "aviso de vencimento: plano do admin e plano sem data de fim". Insere com o Drizzle um paciente e dois planos `active` sem `paymentId`: um com `endDate` igual a `today`, outro com `endDate` nulo. `enqueuePlanExpiring` cria as linhas `plan_expiring_d0` do primeiro e nenhuma do segundo (Review Focus 5).

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/db` (com `TEST_DATABASE_URL`)
  Expected: FAIL (`enqueuePlanExpiring` e `mealPlan` inexistentes; coluna e índices ausentes).

- [ ] **Step 3: `lib/db/schema.ts`**

  - `notifications`: `mealPlanId: char("meal_plan_id", { length: 36 }).references(() => mealPlans.id)`, com o comentário `// Só nos avisos de vencimento (plan_expiring_*): um aviso por plano, canal e estágio.`; índice único `notifications_plan_channel_kind_unique` em `(mealPlanId, channel, kind)`.
  - `mealPlans`: remova `dueDateNewMealPlan` e `paymentUrlNewMealPlan`; acrescente o índice `meal_plans_status_end_date_idx` em `(status, endDate)`.

- [ ] **Step 4: Gerar a migration**

  Run: `corepack pnpm db:generate`

  O `.sql` gerado não precisa de ajuste à mão. Confira que ele tem: `ADD` de `meal_plan_id`, os dois `DROP COLUMN`, a chave estrangeira, o índice único e o índice de `meal_plans`. Se o gerador perguntar se uma coluna foi renomeada, responda que é coluna nova.

- [ ] **Step 5: Repositórios**

  - `lib/db/repos/types.ts`: tipos do bloco Interfaces.
  - `lib/db/repos/mysql.ts`:
    - `get` de notificações faz `leftJoin` em `mealPlans` por `notifications.mealPlanId` e devolve `mealPlan`.
    - `enqueuePlanExpiring`: lê os planos `active` com `end_date` entre `today` e `today + 5 dias`, com o paciente; para cada um calcula o estágio com `expiryStage(daysLeft(...))`, lê a cobrança mais recente do paciente com `created_at` maior que o do plano e aplica `renewalState`; pula o plano em `paid`; insere com `.ignore()` uma linha por canal, com `mealPlanId`, `quizResponseId: null`, `nextAttemptAt: d.now` e `paymentId` = `state.paymentId` só quando o estágio é `d2` ou `d0`, o estado é `awaiting_payment` e `paymentUrl` não é nulo. Devolve a soma das linhas afetadas.
    - `recipientFor` passa a devolver `null` para WhatsApp com telefone vazio; `enqueuePlanExpiring` e `enqueuePaymentLink` não criam essa linha.
  - `tests/fakes/memory-repos.ts`: acompanha o contrato. As linhas de cobrança e de plano do fake precisam de `createdAt` para a regra de §4; `MealPlanRow` perde os dois campos; `seed.mealPlan` do bloco Interfaces.

- [ ] **Step 6: Rodar e ver passar**

  Run: `corepack pnpm vitest run tests/db` (com `TEST_DATABASE_URL`) e `corepack pnpm typecheck`
  Expected: PASS nos dois.

- [ ] **Step 7: Commit**

  ```bash
  git add lib/db tests/db tests/fakes
  git commit -m "feat: migration 0003 e fila dos avisos de vencimento do plano"
  ```

### Task 3: Textos e envio das mensagens novas

**Files:**
- Modify: `lib/notify/templates.ts`, `lib/services/dispatch-notification.ts`
- Modify (testes): `tests/lib/notify/templates.test.ts`, `tests/lib/services/dispatch-notification.test.ts`

**Interfaces:**
- Consumes: `NotificationView.mealPlan`, `enqueuePlanExpiring`, `seed.mealPlan` (Task 2); `ExpiryStage` (Task 1).
- Produces (`lib/notify/templates.ts`):

  ```ts
  export const PLAN_EXPIRING_TITLES: Record<ExpiryStage, string>
  export const RENEWAL_PAYMENT_LINK_TITLE = "Recebemos sua atualização! Falta só o pagamento"
  /** `endDate` em YYYY-MM-DD. No estágio d5, `variant` e `link` são ignorados. */
  export function renderPlanExpiring(d: {
    stage: ExpiryStage; name: string; endDate: string; variant: "form" | "payment"; link: string
  }): { subject: string; html: string; text: string }
  export function renderRenewalPaymentLink(d: { name: string; link: string }): { subject: string; html: string; text: string }
  ```

- [ ] **Step 1: Testes que falham**

  `tests/lib/notify/templates.test.ts`:
  - títulos: `d5` → `"Seu plano alimentar está acabando"`; `d2` → `"Faltam poucos dias para o seu plano vencer"`; `d0` → `"Seu plano alimentar vence hoje"`.
  - `renderPlanExpiring({ stage: "d5", name: "Ana", endDate: "2026-10-17", variant: "form", link: "x" }).html` é exatamente:

    ```
    Olá Ana! 👋 <br>Seu <strong>Plano Alimentar</strong> vence em <strong>17/10/2026</strong>. <br><br>Em breve vamos liberar um formulário rápido de atualização para ajustar seu próximo plano. Avisaremos assim que ele estiver disponível. 💚
    ```
  - `d2` e `d0`, nas duas variantes: o html contém o link recebido; a variante `form` contém "leva menos de 3 minutos"; a variante `payment` contém "Você já preencheu o formulário de atualização"; `d2` contém `<strong>17/10/2026</strong>`; `d0` contém `vence <strong>hoje</strong>`.
  - `renderRenewalPaymentLink`: contém o link e "a senha que você já usa"; não contém "cadastro" nem "informações de acesso".
  - nos seis textos: nome `<b>Ana</b>` sai escapado; `text` não tem tag; `toWhatsAppParts` devolve 2 partes (3 no link de pagamento da renovação), a primeira começando pelo título em negrito.

  `tests/lib/services/dispatch-notification.test.ts` (o `setup` do arquivo já aceita `wrap`, que troca o repositório de notificações; use-o para devolver em `get` uma visão com `mealPlan: null` ou com `patientPasswordHash` preenchido):
  - "plan_expiring sem cobrança: envia a variante formulário com o link do PlanA". Plano por `seed.mealPlan` com `endDate` `"2026-10-08"` e `enqueuePlanExpiring` com `today` `"2026-10-07"`; o e-mail enviado tem o assunto de `d2` e contém `https://plana.nutritamilivalle.com.br/cliente/planos/<id do plano>/renovar`.
  - "plan_expiring com cobrança: envia a variante pagamento com o link da cobrança".
  - "plan_expiring sem plano ligado é falha definitiva na primeira tentativa" (resultado `"failed"`, admin alertado).
  - "payment_link para paciente com senha usa o texto de renovação" (assunto `RENEWAL_PAYMENT_LINK_TITLE`).
  - "payment_link para paciente sem senha mantém o texto atual" (assunto `PAYMENT_LINK_TITLE`).

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/notify/templates.test.ts tests/lib/services/dispatch-notification.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar**

  - Templates: os textos de §6.2 e §6.3, copiados sem alterar palavras, montados numa linha só como `renderFirstAccess` (os saltos de linha dos blocos do spec não entram no html). Nome e links passam por `escapeHtml`. A data sai de `endDate` como `dd/mm/aaaa`, por manipulação de texto, sem `Date`.
  - `dispatch-notification.ts`, em `renderMessage`:
    - `payment_link`: com `n.patientPasswordHash` preenchido, `renderRenewalPaymentLink`; senão, `renderPaymentLink`.
    - `plan_expiring_*`: sem `n.mealPlan` ou com `endDate` nulo, `PermanentNotificationError`; o estágio vem do sufixo do `kind`; com `n.paymentUrl`, variante `payment` e esse link; senão, variante `form` e `new URL(\`cliente/planos/${n.mealPlan.id}/renovar\`, d.appUrl).href`.
  - Atualize o comentário do cabeçalho do serviço com os tipos novos.

- [ ] **Step 4: Rodar e ver passar**

  Run: `corepack pnpm vitest run tests/lib/notify tests/lib/services/dispatch-notification.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add lib/notify lib/services/dispatch-notification.ts tests/lib/notify tests/lib/services/dispatch-notification.test.ts
  git commit -m "feat: mensagens de vencimento do plano e de pagamento da renovação"
  ```

### Task 4: Passo do job que enfileira os avisos

**Files:**
- Create: `lib/jobs/expiry-reminders.ts`, `tests/lib/jobs/expiry-reminders.test.ts`
- Modify: `lib/jobs/run-jobs.ts`, `lib/container.ts`, `tests/lib/jobs/run-jobs.test.ts`

**Interfaces:**
- Consumes: `NotificationRepo.enqueuePlanExpiring` (Task 2); `hourInSaoPaulo`, `todayInSaoPaulo` (Task 1).
- Produces:

  ```ts
  // lib/jobs/expiry-reminders.ts
  export const REMINDER_HOURS = { from: 9, to: 20 }
  /** Fora do horário devolve 0 sem tocar no banco. */
  export function createEnqueueExpiryReminders(d: {
    notifications: Pick<NotificationRepo, "enqueuePlanExpiring">
    channels: Channel[]
    now: () => Date
    log: Logger
  }): () => Promise<number>
  // lib/jobs/run-jobs.ts
  export type RunSummary = { payments: number; plans: number; reminders: number; notifications: number; errors: number }
  // createRunJobs ganha a dependência:
  enqueueExpiryReminders: () => Promise<number>
  ```

- [ ] **Step 1: Testes que falham**

  `tests/lib/jobs/expiry-reminders.test.ts`, com um `enqueuePlanExpiring` falso que devolve `2`:
  - `now` `2026-10-12T11:59:00Z` (8h59) → devolve `0` e não chama o repositório;
  - `2026-10-12T12:00:00Z` (9h00) → chama com `{ today: "2026-10-12", channels, now }` e devolve `2`;
  - `2026-10-12T22:59:00Z` (19h59) → chama; `2026-10-12T23:00:00Z` (20h00) → não chama;
  - registra `job.reminders.enqueued` com `{ count: 2 }` quando criou alguma linha, e nada quando o resultado é `0`.

  `tests/lib/jobs/run-jobs.test.ts`:
  - "o aviso enfileirado na rodada sai na mesma rodada": `enqueueExpiryReminders` roda antes de `notifications.listDue`; `summary.reminders` é o número devolvido.
  - "exceção ao enfileirar avisos não interrompe a rodada": conta em `errors`, registra `job.reminders.error`, e as notificações pendentes são enviadas.
  - Ajuste os testes existentes ao campo novo de `RunSummary`.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/jobs`
  Expected: FAIL.

- [ ] **Step 3: Implementar**

  O passo entra em `run-jobs` entre as gerações de plano e as notificações. Em `lib/container.ts`, monte `createEnqueueExpiryReminders` com `repos.notifications`, `channels`, `now` e `log` e passe a `createRunJobs`. Atualize o comentário de `createRunJobs` com a ordem nova.

- [ ] **Step 4: Rodar e ver passar**

  Run: `corepack pnpm vitest run tests/lib/jobs tests/lib/container.test.ts tests/lib/container.wiring.test.ts tests/lib/http`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add lib/jobs lib/container.ts tests/lib/jobs
  git commit -m "feat: job enfileira os avisos de vencimento entre 9h e 20h"
  ```

### Task 5: Endpoint `POST /api/renewals` e paciente sem telefone

**Files:**
- Create: `lib/http/handlers/renewals.ts`, `app/api/renewals/route.ts`, `tests/lib/http/renewals.test.ts`
- Modify: `lib/quiz/validation.ts`, `lib/asaas/client.ts`, `lib/services/sync-payment.ts`, `README.md`
- Modify (testes): `tests/lib/quiz/validation.test.ts`, `tests/lib/services/sync-payment.test.ts`

**Interfaces:**
- Consumes: `SubmitQuiz`, `isBearerAuthorized`, `readJsonBody`, `createMemoryRepos`.
- Produces:

  ```ts
  // lib/quiz/validation.ts
  export function parseSubmitRequest(body: unknown, opts?: { allowEmptyPhone?: boolean }): …  // mesmo retorno
  // lib/http/handlers/renewals.ts
  export const RENEWALS_MAX_BODY_BYTES = 64 * 1024
  export function createRenewalsHandler(d: {
    token: string
    submitQuiz: SubmitQuiz
    dispatchForQuizResponse: (quizResponseId: string) => Promise<void>
    defer: (fn: () => Promise<void>) => void
    log: Logger
  }): (req: Request) => Promise<Response>
  ```
- Produces (HTTP, usado pela Task 7): `POST /api/renewals`, `Authorization: Bearer <JOBS_TOKEN>`, corpo `{ submissionId, answers }` → `200 { ok: true, paymentUrl: string | null }`; `401`, `400`, `413` e `500` com `{ ok: false }`.

- [ ] **Step 1: Testes que falham**

  `tests/lib/quiz/validation.test.ts`: com `allowEmptyPhone`, `whatsapp: ""` é aceito e `patient.phone` é `""`; sem a opção, continua inválido; com a opção, um `whatsapp` preenchido e inválido (`"123"`) continua inválido.

  `tests/lib/services/sync-payment.test.ts`: paciente com `phone` `""` → o cliente criado no Asaas não tem a chave `mobilePhone`; com telefone, tem.

  `tests/lib/http/renewals.test.ts`:
  - sem `Authorization` e com token errado → `401`, e `submitQuiz` não é chamado;
  - corpo que não é JSON → `400`; `answers` sem `cpf` → `400`; corpo acima de 64 KB → `413`;
  - `submitQuiz` devolve `link` → `200 { ok: true, paymentUrl: "<link>" }` e `dispatchForQuizResponse` é adiado com o `quizResponseId`;
  - devolve `pending` → `200 { ok: true, paymentUrl: null }`;
  - devolve `db_error` → `500 { ok: false }`;
  - `whatsapp: ""` é aceito (Review Focus 1);
  - "dois envios com submissionId diferentes para o mesmo CPF devolvem a mesma cobrança" (Review Focus 2): com `createMemoryRepos`, o `createSubmitQuiz` de verdade e um `syncPayment` falso que chama `repos.payments.markSynced` e devolve o link. As duas respostas têm o mesmo `paymentUrl`, e `repos.state.payments` tem uma linha.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/http/renewals.test.ts tests/lib/quiz tests/lib/services/sync-payment.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar**

  - `parseSubmitRequest`: com `allowEmptyPhone`, `whatsapp` igual a `""` passa e vira `phone: ""`.
  - `lib/asaas/client.ts`: `mobilePhone` vira opcional na entrada de `createCustomer`. `sync-payment.ts` só o envia quando `patient.phone !== ""`.
  - `createRenewalsHandler`: token → corpo → `parseSubmitRequest(body, { allowEmptyPhone: true })` → `submitQuiz`. Sem limite por IP. Nada do corpo vai para o log. Erro inesperado → `500 { ok: false }` e log `renewals.unexpected_error`.
  - `app/api/renewals/route.ts`: no molde de `app/api/notifications/dispatch/route.ts`, com `c.submitQuiz` e `c.dispatchForQuizResponse`.
  - `README.md`: em "Integração com o PlanA", descreva o endpoint e os avisos de vencimento; em "O job de fundo", o passo novo e o horário; em "Deploy", que a `0003` remove duas colunas e o PlanA deve subir logo em seguida (§11).

- [ ] **Step 4: Suíte inteira do `v0-tami-forms`**

  Run: `corepack pnpm test` (com `TEST_DATABASE_URL`), `corepack pnpm typecheck` e `corepack pnpm build`
  Expected: tudo passa.

- [ ] **Step 5: Commit**

  ```bash
  git add app/api/renewals lib tests README.md
  git commit -m "feat: endpoint de renovação para o PlanA e paciente sem telefone"
  ```

---

# Parte B: `dieta-app`

### Task 6: Schema novo e estado da renovação nas rotas do cliente

**Files:**
- Modify: `lib/db/schema.ts` (via script), `lib/repos/types.ts`, `lib/repos/meal-plans.ts`, `lib/admin/record-format.ts`, `lib/container.ts`, `app/api/client/meal-plans/route.ts`, `app/api/client/meal-plans/[id]/route.ts`, `app/api/client/dashboard-stats/route.ts`
- Create: `lib/time.ts`, `lib/renewal/rules.ts`, `lib/repos/renewals.ts`, `lib/services/renewal.ts`
- Test: `tests/lib/time.test.ts`, `tests/lib/renewal/rules.test.ts`, `tests/repos/renewals.test.ts`, `tests/lib/services/renewal.test.ts`; modify `tests/repos/meal-plans.test.ts`, `tests/lib/admin/record-format.test.ts`

**Interfaces:**
- Consumes: `lib/renewal/rules.ts` e `lib/time.ts` do `v0-tami-forms` (Task 1), copiados byte a byte, com os dois arquivos de teste.
- Produces (`lib/repos/types.ts`):

  ```ts
  // MealPlanRow perde dueDateNewMealPlan e paymentUrlNewMealPlan.
  export type ClientMealPlan = MealPlanRow & {
    renewalStatus: RenewalStatus
    dueDateNewMealPlan: string | null
    paymentUrlNewMealPlan: string | null
  }
  export interface RenewalRepo {
    /** Cobrança mais recente do paciente com `created_at` maior que `after` (§4). */
    latestChargeAfter(patientId: string, after: Date): Promise<RenewalCharge | null>
    /** `answers` do envio mais recente do paciente em `quiz_responses`. */
    latestAnswers(patientId: string): Promise<Record<string, unknown> | null>
  }
  ```
- Produces (`lib/services/renewal.ts`):

  ```ts
  export function createRenewal(d: { renewals: RenewalRepo; now: () => Date }): Renewal
  export type Renewal = {
    /** Estado da renovação de um plano; `none` para plano que não está `active`. */
    stateFor(plan: MealPlanRow): Promise<RenewalState>
    decorate(plans: MealPlanRow[]): Promise<ClientMealPlan[]>
  }
  ```
- Produces (container): `c.repos.renewals`, `c.renewal`.

- [ ] **Step 1: Copiar schema, regras e relógio**

  Run: `corepack pnpm db:sync-schema`

  Copie `../v0-tami-forms/lib/renewal/rules.ts` → `lib/renewal/rules.ts`, `../v0-tami-forms/lib/time.ts` → `lib/time.ts` e os dois testes correspondentes para `tests/lib/renewal/rules.test.ts` e `tests/lib/time.test.ts`, sem alterar o conteúdo.

- [ ] **Step 2: Testes que falham**

  `tests/repos/renewals.test.ts` (MySQL, no molde de `tests/repos/meal-plans.test.ts`, com `seedQuizPatient` e inserções diretas):
  - `latestChargeAfter`: ignora a cobrança criada antes de `after`; entre duas posteriores, devolve a de `createdAt` maior; sem cobrança posterior → `null`; não devolve cobrança de outro paciente. O retorno tem `id`, `status`, `dueDate`, `paymentUrl` e `paidAt`.
  - `latestAnswers`: devolve as respostas do envio mais recente; paciente sem envio → `null`.

  `tests/repos/meal-plans.test.ts`: "excluir plano com aviso de vencimento ligado": plano do admin com uma linha `plan_expiring_d5` em `notifications` → `delete` devolve `"deleted"`, e a notificação some. O caso `in_use` continua valendo.

  `tests/lib/services/renewal.test.ts`, com um `RenewalRepo` falso e `now` `2026-10-13T01:30:00Z` (22h30 do dia 12 em São Paulo, Review Focus 4):
  - plano `completed` → `none`, e o repositório não é consultado;
  - plano `active` com cobrança `PENDING` e `dueDate` `"2026-10-12"` → `awaiting_payment` (com a data UTC seria `payment_expired`);
  - `decorate`: o plano ativo ganha `renewalStatus`, `dueDateNewMealPlan` e `paymentUrlNewMealPlan` do estado; os demais ganham `"none"`, `null`, `null`; a ordem da lista é mantida; `latestChargeAfter` recebe o `createdAt` do plano.

  `tests/lib/admin/record-format.test.ts`: `notificationKindLabel("plan_expiring_d5")` → `"Aviso de vencimento (5 dias)"`; `d2` → `"Aviso de vencimento (2 dias)"`; `d0` → `"Aviso de vencimento (vence hoje)"`.

- [ ] **Step 3: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/repos tests/lib/services/renewal.test.ts tests/lib/admin` (com `TEST_DATABASE_URL`)
  Expected: FAIL.

- [ ] **Step 4: Implementar**

  - `lib/repos/meal-plans.ts`: `planColumns` perde as duas colunas; `delete` vira uma transação que apaga as notificações com `mealPlanId` do plano e depois o plano (a checagem de `in_use` fica antes).
  - `lib/repos/renewals.ts`: `createRenewalRepo(db: Db): RenewalRepo`.
  - `lib/services/renewal.ts`: `stateFor` usa `renewalState(charge, todayInSaoPaulo(d.now()))`. Plano ativo é o de `status === "active"`.
  - As três rotas devolvem os planos por `c.renewal.decorate(...)`. Em `dashboard-stats`, `activePlan` e cada item de `allPlans` ganham `renewalStatus`; as demais chaves ficam como estão.
  - `lib/admin/record-format.ts`: os três nomes novos.

- [ ] **Step 5: Rodar e ver passar**

  Run: `corepack pnpm test` (com `TEST_DATABASE_URL`) e `corepack pnpm typecheck`
  Expected: PASS, incluindo `tests/db/schema-sync.test.ts`.

- [ ] **Step 6: Commit**

  ```bash
  git add lib app/api/client tests
  git commit -m "feat: estado da renovação calculado a partir das cobranças"
  ```

### Task 7: Perguntas, validação, serviço e rotas do formulário

**Files:**
- Create: `lib/renewal/questions.ts`, `lib/renewal/messages.ts`, `lib/validation/renewal.ts`, `app/api/client/meal-plans/[id]/renewal/route.ts`
- Modify: `lib/forms-client.ts`, `lib/services/renewal.ts`, `lib/container.ts`
- Test: `tests/lib/renewal/questions.test.ts`, `tests/lib/validation/renewal.test.ts`; modify `tests/lib/forms-client.test.ts`, `tests/lib/services/renewal.test.ts`

**Interfaces:**
- Consumes: `Renewal.stateFor` e `RenewalRepo.latestAnswers` (Task 6); `isRenewalOpen`, `daysLeft` (regras); `POST /api/renewals` (Task 5).
- Produces:

  ```ts
  // lib/renewal/questions.ts (sem import de servidor: a tela também usa)
  export type ChoiceQuestion = { key: string; label: string; type: "single" | "multi"; options: { value: string; label: string }[] }
  export type NumberQuestion = { key: string; label: string; type: "number"; min: number; max: number; step: number }
  export type Question = ChoiceQuestion | NumberQuestion
  export const RENEWAL_SECTIONS: { title: string; questions: Question[] }[]

  // lib/renewal/messages.ts
  export type RenewalBlock = "plan_not_active" | "renewal_not_open" | "renewal_paid"
  export const RENEWAL_BLOCK_MESSAGES: Record<RenewalBlock, string>   // textos de §8.1

  // lib/validation/renewal.ts
  export type RenewalAnswers = {
    faixa_etaria: string; sexo_biologico: string; tipo_fisico: string; peso_comportamento: string
    sobremesa: string; rotina_dia: string; sono: string; agua: string
    breakfast_foods: string[]; almoco: string[]; lanche_tarde: string[]; jantar: string[]; habitos: string[]
    altura_cm: number; peso_kg: number; meta_peso_30d: number
  }
  export function parseRenewalBody(body: unknown):
    { ok: true; value: { submissionId: string; answers: RenewalAnswers } } | { ok: false }
  /** O que dá para aproveitar de um envio antigo; nunca lança. */
  export function prefillAnswers(previous: Record<string, unknown> | null): Partial<RenewalAnswers>
  export function buildSubmissionAnswers(
    patient: { name: string; email: string; phone: string; cpf: string },
    answers: RenewalAnswers,
  ): Record<string, unknown>

  // lib/forms-client.ts
  submitRenewal(body: { submissionId: string; answers: Record<string, unknown> }):
    Promise<{ ok: true; paymentUrl: string | null } | { ok: false }>

  // lib/services/renewal.ts: createRenewal passa a receber também
  //   mealPlans: MealPlanRepo; patients: PatientRepo; forms: { submitRenewal: … }
  // e Renewal ganha:
  check(planId: string, patientId: string): Promise<"not_found" | { reason: RenewalBlock | null; state: RenewalState }>
  form(planId: string, patientId: string): Promise<"not_found" | {
    eligible: boolean; reason: RenewalBlock | null; answers: Partial<RenewalAnswers>
    renewal: { status: RenewalStatus; dueDate: string | null; paymentUrl: string | null }
  }>
  submit(d: { planId: string; patientId: string; submissionId: string; answers: RenewalAnswers }):
    Promise<"not_found" | { blocked: RenewalBlock } | "forms_unavailable" | { paymentUrl: string | null }>
  ```
- Produces (HTTP, usado pela Task 9): `GET` e `POST /api/client/meal-plans/[id]/renewal` (§8.2).

- [ ] **Step 1: Testes que falham**

  `tests/lib/renewal/questions.test.ts`:
  - as seções têm, nesta ordem, os títulos `"Sobre você"`, `"Peso"`, `"Refeições"`, `"Rotina"`, com as chaves de §8.1 na ordem do spec;
  - quantidade de opções: `faixa_etaria` 4, `sexo_biologico` 2, `tipo_fisico` 4, `peso_comportamento` 3, `breakfast_foods` 7, `almoco` 7, `lanche_tarde` 7, `jantar` 7, `sobremesa` 2, `rotina_dia` 3, `sono` 4, `agua` 4, `habitos` 5;
  - valores exatos: `faixa_etaria` = `["18-24 anos", "25-34 anos", "35-44 anos", "45-59 anos"]`; `sexo_biologico` = `["Masculino", "Feminino"]`; `sobremesa` = `["Sim", "Não"]`; `sono` inclui `"5–6 horas"` (com travessão); `almoco` inclui `"Sem Feijão"`;
  - múltipla escolha: `breakfast_foods`, `almoco`, `lanche_tarde`, `jantar`, `habitos`; as outras de escolha são `single`;
  - `altura_cm`: `min 120`, `max 230`, `step 1`; `peso_kg` e `meta_peso_30d`: `min 30`, `max 300`, `step 0.1`.

  `tests/lib/validation/renewal.test.ts`, a partir de um corpo válido completo:
  - o corpo válido passa e devolve os números como número;
  - recusados: `submissionId` que não é UUID; opção fora da lista numa `single`; item fora da lista numa `multi`; `multi` vazia; `altura_cm` `119`, `231` e `170.5`; `peso_kg` `29.9` e `300.1`; campo ausente; `answers` que não é objeto;
  - `buildSubmissionAnswers` com paciente `{ name: "Ana Souza", email: "ana@example.com", phone: "11987654321", cpf: "52998224725" }`, `altura_cm: 165`, `peso_kg: 75.5`: devolve as 16 respostas, com `altura_cm: "165"`, `peso_kg: "75.5"` e `meta_peso_30d` em texto; `imc: "27.73"`; `nome_completo`, `email`, `whatsapp: "11987654321"` e `cpf`;
  - `prefillAnswers` (Review Focus 3): `null` → `{}`; envio do quiz com tudo válido → todos os campos menos `peso_kg` e `meta_peso_30d`; `altura_cm: "165"` (texto) → `165`; `altura_cm: "abc"` e `altura_cm: 500` → ausente; `almoco: ["Carne de frango", "Opção antiga"]` → `["Carne de frango"]`; `almoco: "Carne de frango"` (texto no lugar da lista) → ausente; `jantar: 42`, `sono: { a: 1 }` e `habitos: [1, null]` → ausentes, sem lançar.

  `tests/lib/forms-client.test.ts`: `submitRenewal` faz `POST` em `/api/renewals` com o Bearer e o corpo; `200 { ok: true, paymentUrl: "https://a/i/1" }` → `{ ok: true, paymentUrl }`; `paymentUrl: null` → `{ ok: true, paymentUrl: null }`; status `500`, corpo que não é JSON e tempo esgotado → `{ ok: false }`, sem lançar.

  `tests/lib/services/renewal.test.ts`, com dublês e `now` no dia `2026-10-12`:
  - `check`: plano de outro paciente ou inexistente → `"not_found"`; plano `completed` → `plan_not_active`; `active` com `endDate` `"2026-10-15"` (3 dias) → `renewal_not_open`; `endDate` nulo → `renewal_not_open`; `endDate` `"2026-10-14"` com cobrança paga → `renewal_paid`; `endDate` `"2026-10-14"` sem cobrança → `reason: null`; `endDate` `"2026-09-02"` (vencido há 40 dias) → `reason: null` (Review Focus 5).
  - `form`: devolve `eligible`, `reason`, o estado e `prefillAnswers` do último envio.
  - `submit`: bloqueado → `{ blocked }`, sem chamar o `v0-tami-forms`; sucesso → chama `forms.submitRenewal` com o `submissionId` recebido e o resultado de `buildSubmissionAnswers` com os dados do paciente lidos do repositório, e devolve `{ paymentUrl }`; `paymentUrl` nulo → `{ paymentUrl: null }`; `forms` devolve `{ ok: false }` → `"forms_unavailable"`.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/renewal tests/lib/validation/renewal.test.ts tests/lib/forms-client.test.ts tests/lib/services/renewal.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar**

  - `lib/renewal/questions.ts`: copie `value` e `label` de cada opção de `../v0-tami-forms/app/page.tsx` (as opções estão junto de cada `handleOptionClick("<chave>", …)`; em `faixa_etaria` e `jantar` o `label` é o próprio `value`). O `label` da pergunta é o `title` do passo no quiz; em `faixa_etaria`, `"Qual é a sua faixa etária?"`.
  - `lib/validation/renewal.ts`: o schema zod é montado a partir de `RENEWAL_SECTIONS`, para que opções e validação não divirjam. `imc` = `peso / (altura / 100)²`, com `toFixed(2)`.
  - `lib/forms-client.ts`: `submitRenewal` com tempo limite de 25 000 ms; nunca lança e nunca registra o corpo.
  - `lib/services/renewal.ts`: `check` avalia na ordem `plan_not_active`, `renewal_not_open`, `renewal_paid`. `submit` refaz o `check`.
  - `lib/container.ts`: `renewalLimiter = createRateLimiter({ limit: 5, windowMs: 600_000 })`; `createRenewal` com as dependências novas.
  - Rota `GET`: `requirePatient()` → `c.renewal.form(id, userId)`; `"not_found"` → `404 { error: "Plano alimentar não encontrado" }`.
  - Rota `POST`, nesta ordem (§8.2): `requirePatient()`; `check` → `404`; `c.renewalLimiter.hit(userId)` → `429 { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }`; `reason` → `409 { error: RENEWAL_BLOCK_MESSAGES[reason], code: reason }`; `readJsonBody(req, 64 * 1024)` e `parseRenewalBody` → `400 { error: "Respostas inválidas. Confira os campos e tente novamente." }`; `submit` → `200 { success: true, paymentUrl }`, ou `502 { error: "Não foi possível enviar seus dados agora. Tente novamente em instantes." }` em `"forms_unavailable"`. Exceção → `500 { error: "Erro ao enviar o formulário" }` e log `client.renewal.error`.
  - As rotas não têm teste próprio, como as demais do PlanA: a guarda, o limitador, a validação e o serviço são testados cada um no seu arquivo.

- [ ] **Step 4: Rodar e ver passar**

  Run: `corepack pnpm vitest run tests/lib` e `corepack pnpm typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add lib app/api/client tests
  git commit -m "feat: formulário de renovação: perguntas, validação, serviço e rotas"
  ```

### Task 8: Alerta de vencimento

**Files:**
- Create: `lib/renewal/alert-state.ts`, `tests/lib/renewal/alert-state.test.ts`
- Modify: `components/plan-expiration-alert.tsx`, `app/cliente/dashboard/page.tsx`, `app/cliente/planos/page.tsx`, `app/cliente/planos/[id]/page.tsx`

**Interfaces:**
- Consumes: `renewalStatus`, `paymentUrlNewMealPlan` nas respostas das rotas (Task 6); `RenewalStatus` (regras).
- Produces:

  ```ts
  export type AlertStage = "d2" | "d0" | "expired"
  export type AlertView =
    | { kind: "d5" }
    | { kind: "form"; stage: AlertStage }
    | { kind: "pay"; stage: AlertStage; paymentUrl: string | null }
    | { kind: "payment_expired" }
    | { kind: "paid" }
  export function alertView(d: {
    variant: "list" | "detail"
    daysLeft: number | null
    renewalStatus: RenewalStatus
    paymentUrl: string | null
  }): AlertView | null
  ```

- [ ] **Step 1: Teste que falha**

  `tests/lib/renewal/alert-state.test.ts` cobre a tabela inteira. Ela reproduz o que o componente faz hoje, mais o estado `paid`:

  | Variante | Estágio | `none` | `awaiting_payment` | `payment_expired` | `paid` |
  |---|---|---|---|---|---|
  | `list` | mais de 5 dias, `d5`, `d2` | nada | nada | nada | nada |
  | `list` | `d0` | `form` | `pay` | `form` | `paid` |
  | `list` | vencido | `form` | `pay` | `payment_expired` | `paid` |
  | `detail` | mais de 5 dias | nada | nada | nada | nada |
  | `detail` | `d5` | `d5` | `d5` | `d5` | `paid` |
  | `detail` | `d2`, `d0` | `form` | `pay` | `form` | `paid` |
  | `detail` | vencido | `form` | `form` | `form` | `paid` |

  `daysLeft` nulo → nada. Em `pay`, o `paymentUrl` recebido é repassado, inclusive `null`.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/renewal/alert-state.test.ts`
  Expected: FAIL.

- [ ] **Step 3: `lib/renewal/alert-state.ts`**

  Função pura, sem import de React.

- [ ] **Step 4: Componente e páginas**

  Em `components/plan-expiration-alert.tsx`:
  - `MealPlanForAlert` passa a ser `{ id; endDate; status; renewalStatus: RenewalStatus; paymentUrlNewMealPlan: string | null }`; sai `dueDateNewMealPlan`. Sai a propriedade `planPrice`.
  - A escolha do plano (`getMostRecentPlan`, `hasOtherNonExpiredPlan`) e `calculateDaysRemaining` ficam como estão. O que decide o alerta passa a ser `alertView`; as contas com `dueDateNewMealPlan` saem.
  - Para cada `AlertView`, o JSX é o bloco que hoje atende àquela combinação, com as mesmas classes e textos. Os blocos repetidos podem virar um só por tipo, desde que o HTML resultante seja o mesmo.
  - Mudanças de §8.3: o botão "Efetuar Pagamento" do estágio `d2` vira o mesmo `Link` para `paymentUrlNewMealPlan`, em outra aba, dos outros estágios; em `pay` sem link, o parágrafo é "Você já preencheu o formulário. Seu link de pagamento está sendo gerado e chega por e-mail e WhatsApp em instantes." e o botão de pagamento não aparece; em `paid`, um `Alert` com as classes do `d5` (`border-blue-500 bg-blue-50 text-blue-900`, ícone `Clock`), título "Pagamento confirmado" e o texto "Recebemos seu pagamento. Seu novo plano alimentar está sendo preparado e aparece aqui em alguns minutos.", sem botão.
  - `PlanExpirationBadge` não muda de comportamento.

  Nas três páginas: as interfaces dos planos ganham `renewalStatus`, e o que é passado ao componente segue o `MealPlanForAlert` novo.

- [ ] **Step 5: Verificar**

  Run: `corepack pnpm vitest run tests/lib/renewal`, `corepack pnpm typecheck` e `corepack pnpm build`
  Expected: PASS; o build não acusa erro de tipo nas três páginas.

- [ ] **Step 6: Commit**

  ```bash
  git add lib/renewal components/plan-expiration-alert.tsx app/cliente tests/lib/renewal
  git commit -m "feat: alerta de vencimento decide pelo estado da renovação"
  ```

### Task 9: Tela do formulário de renovação

**Files:**
- Create: `app/cliente/planos/[id]/renovar/page.tsx`, `components/renewal-form.tsx`

**Interfaces:**
- Consumes: `GET` e `POST /api/client/meal-plans/[id]/renewal` (Task 7); `RENEWAL_SECTIONS`, `RENEWAL_BLOCK_MESSAGES`, `RenewalAnswers`.
- Produces: a página `/cliente/planos/[id]/renovar`, destino dos botões do alerta e do link dos avisos.

- [ ] **Step 1: `components/renewal-form.tsx`**

  Componente cliente: `RenewalForm({ initial, submitting, onSubmit })`, com `initial: Partial<RenewalAnswers>` e `onSubmit(answers: RenewalAnswers)`.
  - Um `Card` por seção de `RENEWAL_SECTIONS`, com o título da seção em `CardTitle`.
  - Pergunta de escolha: o `label` e um botão por opção (`Button`, `type="button"`, `variant` `"default"` quando selecionada e `"outline"` quando não, `aria-pressed`). Em `single`, escolher uma troca a seleção; em `multi`, alterna.
  - Pergunta numérica: `Label` e `Input type="number"` com `min`, `max` e `step` da pergunta.
  - Botão final "Enviar dados", desabilitado enquanto `submitting`. Com pergunta sem resposta ou número fora da faixa, não envia e mostra `toast.error("Responda todas as perguntas para continuar.")`.

- [ ] **Step 2: `app/cliente/planos/[id]/renovar/page.tsx`**

  Página cliente no molde de `app/cliente/planos/[id]/page.tsx` (`ClientNav`, mesma largura, botão "Voltar para o plano" no topo, `Loader2` enquanto carrega):
  - ao abrir, `GET` da rota; `404` → volta para `/cliente/planos`;
  - `eligible: false` → um `Card` com `RENEWAL_BLOCK_MESSAGES[reason]` e o botão de voltar;
  - `eligible: true` → título "Atualização do plano alimentar", o texto "Confira suas respostas e atualize o que mudou. Leva menos de 3 minutos." e o `RenewalForm` com `answers`;
  - o `submissionId` é gerado uma vez por abertura da página (`crypto.randomUUID()` em `useRef`) e reusado em toda nova tentativa;
  - no envio: `POST` com `{ submissionId, answers }`; erro → `toast.error` com o `error` da resposta, e o formulário continua preenchido;
  - sucesso → a página troca o formulário pela confirmação de §8.1: com `paymentUrl`, o texto e o botão "Efetuar Pagamento" (`target="_blank"`, classes do botão verde do alerta); sem `paymentUrl`, o texto do link em geração. Nas duas, o botão "Voltar para o plano".

- [ ] **Step 3: Verificar**

  Run: `corepack pnpm typecheck` e `corepack pnpm build`
  Expected: PASS, com `/cliente/planos/[id]/renovar` na lista de rotas do build.

  Com os dois apps rodando no mesmo banco e um plano ativo com `end_date` de amanhã, confira à mão: a tela abre preenchida, menos peso e meta; enviar sem responder tudo mostra o aviso; o envio mostra a confirmação com o botão de pagamento; um plano com `end_date` daqui a 10 dias mostra a mensagem de formulário indisponível.

- [ ] **Step 4: Commit**

  ```bash
  git add app/cliente/planos components/renewal-form.tsx
  git commit -m "feat: tela do formulário de renovação"
  ```

### Task 10: Volta ao destino depois do login

**Files:**
- Create: `lib/auth/next-path.ts`, `tests/lib/auth/next-path.test.ts`
- Modify: `middleware.ts`, `app/cliente/login/page.tsx`, `tests/lib/middleware.test.ts`

**Interfaces:**
- Produces: `safeNextPath(raw: string | null | undefined): string | null`, sem dependência de Node (o middleware roda no edge).

- [ ] **Step 1: Testes que falham**

  `tests/lib/auth/next-path.test.ts`:
  - aceitos, devolvidos como vieram: `"/cliente/planos/abc/renovar"`, `"/cliente/dashboard"`;
  - recusados (`null`): `null`, `""`, `"/admin/dashboard"`, `"https://evil.example/cliente/"`, `"//evil.example/cliente/"`, `"/cliente//evil.example"`, `"/cliente/\\evil"`, `"/cliente"` (sem a barra final), `"cliente/planos"`.

  `tests/lib/middleware.test.ts`:
  - `/cliente/planos/abc/renovar` sem sessão → redireciona para `/cliente/login` com `next` igual a `/cliente/planos/abc/renovar`;
  - `/admin/pacientes` sem sessão → `/admin/login`, sem `next`;
  - paciente com `mustChangePassword` → `/cliente/recuperar-senha`, sem `next`.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/auth/next-path.test.ts tests/lib/middleware.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar**

  - `safeNextPath`: aceita só texto que começa com `/cliente/` e não contém `//` nem `\`.
  - `middleware.ts`: ao barrar página de cliente sem sessão, o redirecionamento leva `next` com o `pathname`.
  - `app/cliente/login/page.tsx`: depois do login, lê `next` de `window.location.search` dentro de `handleSubmit` (sem `useSearchParams`, que exigiria `Suspense`) e, se `safeNextPath` o aceita, vai para ele; senão, o destino de hoje.

- [ ] **Step 4: Rodar e ver passar**

  Run: `corepack pnpm vitest run tests/lib/auth tests/lib/middleware.test.ts` e `corepack pnpm typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add lib/auth/next-path.ts middleware.ts app/cliente/login tests/lib
  git commit -m "feat: login volta para a página pedida dentro de /cliente"
  ```

### Task 11: README e verificação final

**Files:**
- Modify: `README.md` (`dieta-app`)

- [ ] **Step 1: README**

  - "O que é": o fluxo de vencimento e renovação em um parágrafo.
  - "Schema": o que acompanha o `v0-tami-forms` além do schema (`lib/renewal/rules.ts` e `lib/time.ts` são cópias).
  - "Deploy": a ordem e o aviso de §11.
  - "Documentos de design": o spec e este plano.

- [ ] **Step 2: Suítes inteiras**

  Em cada repositório, um de cada vez: `corepack pnpm test` (com `TEST_DATABASE_URL`), `corepack pnpm typecheck` e `corepack pnpm build`.
  Expected: tudo passa nos dois.

- [ ] **Step 3: Roteiro manual**

  Os sete passos do roteiro de §12 do spec, com os dois apps locais no mesmo banco e o Asaas em sandbox. Faça o roteiro entre 9h e 20h de São Paulo: fora desse horário nenhuma rodada do job enfileira aviso, nem a disparada à mão por `/api/jobs/run`. Anote o resultado de cada passo.

- [ ] **Step 4: Commit**

  ```bash
  git add README.md
  git commit -m "docs: README com o fluxo de vencimento e renovação"
  ```
