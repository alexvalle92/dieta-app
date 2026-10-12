# PlanA sobre MySQL: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o PlanA (`dieta-app`) funcionar sobre o MySQL do `v0-tami-forms`, com todas as tabelas criadas pelas migrations do `v0-tami-forms`, senha em scrypt, troca obrigatória no primeiro acesso, recuperação de senha sem n8n e o código do PlanA refatorado em camadas, sem mudar o layout.

**Architecture:**
- O `v0-tami-forms` é dono das migrations e de todo envio de e-mail e WhatsApp. A migration `0002` cria as tabelas do admin e faz `notifications` aceitar mensagem sem quiz.
- O PlanA lê e grava no mesmo banco com Drizzle e uma cópia idêntica do `schema.ts`, sem migrations. No boot ele confere o banco e cria o primeiro admin.
- No PlanA: rota fina → guarda → validação → serviço ou repositório. Só `lib/repos/` importa o Drizzle.
- A recuperação de senha grava as mensagens em `notifications` e pede o envio ao `v0-tami-forms` por `POST /api/notifications/dispatch`; o job de 2 minutos é a rede de segurança.

**Tech Stack:** Next.js 16 (route handlers, `after()`, `middleware.ts`), TypeScript, Drizzle ORM 0.45 + `mysql2`, zod 3, `jose`, `node:crypto` (scrypt, SHA-256), Vitest 5.

**Spec:** [docs/superpowers/specs/2026-10-12-plana-mysql-design.md](../specs/2026-10-12-plana-mysql-design.md). Leia o spec inteiro antes de qualquer tarefa. Este plano cita as seções dele (§N) e não repete o que já está lá.

## Global Constraints

- **Dois repositórios.** Tasks 1 a 3 rodam em `C:\Users\Tâmili\repo\v0-tami-forms`; Tasks 4 a 14 em `C:\Users\Tâmili\repo\dieta-app`. Os dois estão na branch `feature/refatoracao`. Commits locais, **sem `push`**.
- Gerenciador: **pnpm 9.15.0**, sempre como `corepack pnpm …`. Node 24. Um teste: `corepack pnpm vitest run <arquivo>`.
- Toda mensagem de commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Layout intocado.** Em telas existentes só mudam os pontos listados em §9.1. Não altere `className`, estrutura de JSX nem textos fora desses pontos.
- **URLs e formato das respostas das rotas não mudam**, salvo §9. Ao reescrever uma rota, leia a versão atual e preserve chaves do JSON, códigos de status e mensagens de erro, trocando só guarda, validação, hash e acesso a dados.
- Código novo segue o estilo do `v0-tami-forms`: fábricas `createX(d)` com dependências por parâmetro, comentários em português, sem ponto e vírgula, aspas duplas, relógio da aplicação (`now`) em vez do relógio do banco, ids com `randomUUID()`, todo `UPDATE` define `updatedAt`.
- Rotas de API: `export const runtime = "nodejs"` e `export const dynamic = "force-dynamic"`. Leitura de env sempre lazy (`getEnv()` na hora do uso): o `next build` roda sem env e sem banco.
- Valores fixos (§2, §6, §7):
  - scrypt `N` 16384, `r` 8, `p` 1, salt 16 bytes, hash 32 bytes;
  - senha nova: mínimo **8**, máximo **200** caracteres; `ADMIN_PASSWORD`: mínimo 12;
  - sessão: cookie `plana_session`, 7 dias (604 800 s), JWT HS256, `SESSION_SECRET` com 32+ caracteres;
  - limite de login: 10 por 600 000 ms por IP; de recuperação: 5 por 900 000 ms por IP;
  - token de redefinição: 32 bytes em base64url; validade 3 600 000 ms; no banco, SHA-256 em hexadecimal;
  - endpoint de envio: 1 a 10 ids, corpo máximo de 4 KB, resposta `202`; o PlanA chama com tempo limite de 5000 ms.
- Nunca vão para log: senha, hash, token e link de redefinição, `SESSION_SECRET`, `JOBS_TOKEN`. CPF, e-mail e telefone saem mascarados (o logger já mascara pelas chaves `cpf`, `email`, `phone`).
- **Banco de teste.** Os testes de MySQL só rodam com `TEST_DATABASE_URL` apontando para um banco descartável. Use o banco `plana_test` no MySQL local e **nunca** o `DATABASE_URL` do `.env.local`: esses testes apagam as tabelas. Não grave a senha do banco em arquivo versionado. Para montar a variável a partir do `.env.local` do `v0-tami-forms` (rode na raiz de qualquer um dos dois repositórios):

  ```bash
  export TEST_DATABASE_URL="$(node -e "const u=new URL(require('fs').readFileSync('../v0-tami-forms/.env.local','utf8').match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^[\"']|[\"']$/g,''));u.pathname='/plana_test';console.log(u.href)")"
  ```

  Crie o banco uma vez: `CREATE DATABASE IF NOT EXISTS plana_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`
- Os dois repositórios usam o mesmo `plana_test`. Não rode as duas suítes ao mesmo tempo.
- Os testes de MySQL do PlanA criam as tabelas com as migrations de `../v0-tami-forms/lib/db/migrations`. Por isso as Tasks 1 a 3 vêm primeiro.
- Nenhum teste envia e-mail ou WhatsApp de verdade nem chama o Asaas ou a Anthropic.

## Review Focus

1. **Excluir um plano gerado por pagamento.** `plan_generations.meal_plan_id` aponta para o plano e não tem cascata. O admin que tenta excluir esse plano deve receber `409` com mensagem clara, não um `500`. Teste na Task 10.
2. **Identificador digitado de outro jeito.** E-mail com maiúsculas ou espaços (`" Ana@Gmail.com "`) e CPF com pontuação (`529.982.247-25`) devem funcionar no login e na recuperação. Teste na Task 7.
3. **Paciente sem telefone.** O admin pode cadastrar paciente sem telefone. A recuperação de senha não deve enfileirar WhatsApp para o destinatário `55`: só o e-mail. Teste na Task 7.
4. **Senha gigante.** Um corpo com senha de 1 MB não pode chegar ao scrypt. Senha com mais de 200 caracteres é recusada como credencial inválida (login) ou `400` (senha nova). Teste nas Tasks 5 e 7.
5. **Sessão de paciente que não existe mais.** O admin exclui o paciente e o cookie dele continua válido por até 7 dias. As rotas devem responder vazio ou `404`, e `/cliente/meus-dados` deve mandar para o login, sem `500`. Teste na Task 7 (`not_found` na troca de senha); o redirecionamento de `/cliente/meus-dados` é da Task 9.

---

# Parte A: `v0-tami-forms`

### Task 1: Schema, migration `0002` e repositório de notificações

**Files:**
- Modify: `lib/db/schema.ts`, `lib/db/repos/types.ts`, `lib/db/repos/mysql.ts`
- Create: `lib/db/migrations/0002_*.sql` e `meta/0002_snapshot.json` (gerados), `meta/_journal.json` (atualizado pelo gerador)
- Modify (testes): `tests/fakes/memory-repos.ts`, `tests/db/repos.contract.ts`, `tests/db/repos.mysql.test.ts`

**Interfaces:**
- Produces (schema, usado pelo PlanA): exports `admins`, `passwordResetTokens`, `recipes`, `mealCategories`, `allowedMealItems`, `appSettings`; em `notifications`, as propriedades `patientId` e `payload`. Propriedades em camelCase das colunas de §4.1 (`passwordHash`, `tokenHash`, `expiresAt`, `prepTime`, `imageUrl`, `portionQuantity`, `activeCustomer`, `mealCategoryId`, `itemType`, `foodName`, `recipeId`, `dietTechnicalDefinition`).
- Produces (tipos): `NotificationKind = "payment_link" | "plan_ready" | "password_reset"`; em `NotificationView`, `quizResponseId: string | null`, `paymentId: string | null` e `payload: { link?: string } | null`.
- Produces (fake de teste): `createMemoryRepos()` devolve também `seed.passwordReset(d: { patientId: string; channel: Channel; link?: string }): string` (id da notificação criada, `pending`, `nextAttemptAt` = agora).

- [ ] **Step 1: Testes que falham**

  Em `tests/db/repos.contract.ts`, no teste 8, acrescente ao `toMatchObject` de cada notificação `payload: null`. No teste 9, depois de `markSent`, afirme `payload: null`.

  Em `tests/db/repos.mysql.test.ts`:
  - `describe.skipIf(!url)("migration 0002 em banco com mensagens")`, **antes** do `describe` principal. Ele apaga todas as tabelas do banco de teste, aplica à mão `0000` e `0001` (lê os arquivos, divide em `--> statement-breakpoint`, executa), insere um paciente, uma cobrança, um `quiz_response` e uma notificação, aplica `0002` do mesmo jeito e afirma: `notifications.patient_id` da linha é o id do paciente; `information_schema.columns` mostra `patient_id` com `IS_NULLABLE = 'NO'` e `quiz_response_id` e `payment_id` com `'YES'`. No fim apaga todas as tabelas, inclusive `__drizzle_migrations`.
  - No reset do `beforeEach`, acrescente as tabelas `allowed_meal_items`, `meal_categories`, `recipes`, `app_settings`, `password_reset_tokens` e `admins`.
  - No teste das tabelas: a lista passa a ter as 13 tabelas mais `__drizzle_migrations`, e a contagem de migrations passa a `3`. Renomeie o teste.
  - Teste novo "password_reset: mensagem sem quiz nem cobrança": insere com o Drizzle uma linha `kind = 'password_reset'`, `quizResponseId` e `paymentId` nulos, `patientId` de um paciente criado por `submissions.create`, `payload = { link: "https://x/y" }`. Afirma que `notifications.get(id)` devolve `quizResponseId: null`, `paymentId: null`, `paymentUrl: null`, `payload: { link: "https://x/y" }`, `patientName` e `patientId` do paciente; e que depois de `markSent(id)` o `payload` é `null`.
  - Teste novo "duas mensagens password_reset do mesmo paciente e canal coexistem" (a chave única não as barra).

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/db` (com `TEST_DATABASE_URL`)
  Expected: FAIL (`payload` inexistente; tabelas e colunas ausentes).

- [ ] **Step 3: `lib/db/schema.ts`**

  - Primeira linha do arquivo, comentário: `// Fonte única do schema. O PlanA (dieta-app) mantém uma cópia idêntica em lib/db/schema.ts, atualizada com "pnpm db:sync-schema".`
  - Tabelas de §4.1, todas com `createdAt()` e `updatedAt()`. Índices: `admins_email_unique`, `password_reset_tokens_token_hash_unique`, `password_reset_tokens_patient_id_idx`, `recipes_category_idx`, `meal_categories_name_unique`.
  - Colunas decimais de `recipes`: `decimal(nome, { precision: 10, scale: 2, mode: "number" })`.
  - `allowed_meal_items`: as duas referências com `{ onDelete: "cascade" }`.
  - `notifications`: `quizResponseId` e `paymentId` sem `.notNull()`; `patientId: char("patient_id", { length: 36 }).notNull().references(() => patients.id)`; `payload: json("payload").$type<{ link?: string }>()`; índice `notifications_patient_id_idx`.

- [ ] **Step 4: Gerar e ajustar a migration**

  Run: `corepack pnpm db:generate`

  No `.sql` gerado, troque a instrução que adiciona `patient_id` como `NOT NULL` por estas três, nesta ordem, cada uma seguida de `--> statement-breakpoint`:

  ```sql
  ALTER TABLE `notifications` ADD `patient_id` char(36);
  UPDATE `notifications` n JOIN `quiz_responses` q ON q.`id` = n.`quiz_response_id` SET n.`patient_id` = q.`patient_id`;
  ALTER TABLE `notifications` MODIFY COLUMN `patient_id` char(36) NOT NULL;
  ```

  As três precisam vir antes das instruções que tornam `quiz_response_id` nulo e que criam a chave estrangeira de `patient_id`; reordene se o gerador as puser depois. Toda tabela nova precisa terminar com `CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`, como nas migrations anteriores. Não edite o snapshot.

- [ ] **Step 5: Repositórios**

  - `lib/db/repos/types.ts`: tipos do bloco Interfaces. Atualize o comentário de `NotificationView`.
  - `lib/db/repos/mysql.ts`: as duas inserções em `notifications` (`enqueuePaymentLink` e `complete`) gravam `patientId`; `get` junta `patients` por `notifications.patientId`, usa `leftJoin` em `payments` e não junta mais `quizResponses`; `get` devolve `payload`; `markSent` grava `payload: null`.
  - `tests/fakes/memory-repos.ts`: `NotificationRow` ganha `patientId` e `payload`, e `quizResponseId`/`paymentId` aceitam nulo; `get` busca o paciente por `patientId`; `markSent` zera `payload`; `seed.passwordReset` do bloco Interfaces.

- [ ] **Step 6: Rodar tudo**

  Run: `corepack pnpm test && corepack pnpm typecheck`
  Expected: PASS, incluindo os testes de MySQL.

- [ ] **Step 7: Commit**

  `feat: migration 0002 com tabelas do PlanA e notificações sem quiz`

### Task 2: Mensagem `password_reset`

**Files:**
- Modify: `lib/notify/templates.ts`, `lib/services/dispatch-notification.ts`
- Modify (testes): `tests/lib/notify/templates.test.ts`, `tests/lib/services/dispatch-notification.test.ts`

**Interfaces:**
- Consumes: `seed.passwordReset` e `NotificationView.payload` (Task 1).
- Produces: `PASSWORD_RESET_TITLE = "Redefinição de senha do PlanA"`; `renderPasswordReset(d: { name: string; link: string }): { subject: string; html: string; text: string }`.

- [ ] **Step 1: Testes que falham**

  `templates.test.ts`:
  - "renderPasswordReset: texto de §7.3": `subject` é o título; `html` é exatamente
    ``"Olá Ana! 👋 <br>Recebemos um pedido para redefinir a senha do seu acesso ao <strong>PlanA</strong>. <br><br>Para criar uma nova senha, acesse o link abaixo. Ele vale por 1 hora e só pode ser usado uma vez: <br>https://plana.test/cliente/redefinir-senha/abc <br><br>Se você não fez esse pedido, ignore esta mensagem. Sua senha continua a mesma."``
  - "escapa o nome" (`<b>Ana</b>` vira `&lt;b&gt;Ana&lt;/b&gt;`).
  - "vira 3 partes de WhatsApp, a primeira com o título em negrito".

  `dispatch-notification.test.ts`:
  - "password_reset por e-mail: envia o texto com o link do payload e apaga o payload": `email.send` chamado com o `subject` e o `html` de `renderPasswordReset`; resultado `"sent"`; a linha fica `sent` e com `payload` nulo.
  - "password_reset por WhatsApp: envia as 3 partes".
  - "password_reset sem link: falha definitiva na primeira tentativa": resultado `"failed"`, nada enviado, `alertAdmin` chamado uma vez, `attempts` 1.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/notify/templates.test.ts tests/lib/services/dispatch-notification.test.ts`
  Expected: FAIL (`renderPasswordReset` não existe).

- [ ] **Step 3: Implementar**

  - `renderPasswordReset` em `templates.ts`, com `escapeHtml` no nome e no link, como nos outros textos.
  - Em `dispatch-notification.ts`: `renderMessage` trata `password_reset` antes do ramo de `plan_ready`. Sem `payload.link`, lança `PermanentNotificationError` (classe nova, no mesmo arquivo); `recordFailure` trata essa classe como falha definitiva, junto com `HttpError` não temporário. Atualize o comentário do topo da função.

- [ ] **Step 4: Rodar e ver passar**

  Run: `corepack pnpm test && corepack pnpm typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit**

  `feat: mensagem de redefinição de senha na fila de notificações`

### Task 3: Endpoint de envio e README

**Files:**
- Create: `lib/http/handlers/notifications-dispatch.ts`, `app/api/notifications/dispatch/route.ts`
- Modify: `README.md`
- Test: `tests/lib/http/notifications-dispatch.test.ts`

**Interfaces:**
- Consumes: `DispatchNotification` (`lib/services/dispatch-notification.ts`), `isBearerAuthorized`, `readJsonBody`, `getContainer().dispatchNotification`.
- Produces: `createNotificationsDispatchHandler(d: { token: string; dispatchNotification: DispatchNotification; defer: (fn: () => Promise<void>) => void; log: Logger }): (req: Request) => Promise<Response>`. Contrato HTTP de §7.4.

- [ ] **Step 1: Testes que falham** (`defer` guarda a função para o teste executar depois)

  - sem `Authorization` → 401; token errado → 401; nos dois casos nada é adiado.
  - corpo ilegível, `{}`, `{ notificationIds: [] }`, 11 ids, id que não é texto, chave extra → 400.
  - `{ notificationIds: ["a", "b"] }` → 202 `{ ok: true }`; `dispatchNotification` só é chamado depois que a função adiada roda, com `"a"` e depois `"b"`.
  - se `dispatchNotification("a")` lançar, `"b"` ainda é enviado e o erro vira log `notifications.dispatch.error` com `notificationId`, sem lançar.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/http/notifications-dispatch.test.ts`
  Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar** o handler (corpo máximo de 4096 bytes, zod estrito) e a rota, no molde de `app/api/jobs/run/route.ts`, com `defer: (fn) => after(fn)`.

- [ ] **Step 4: Rodar e ver passar**

  Run: `corepack pnpm test && corepack pnpm typecheck && corepack pnpm build`
  Expected: PASS.

- [ ] **Step 5: README**

  - Seção "Integração com o PlanA": troque a tabela "Hoje no PlanA / O que passa a valer" por um texto dizendo que o PlanA já lê este MySQL; que **todas** as tabelas, inclusive as do admin (`admins`, `recipes`, `meal_categories`, `allowed_meal_items`, `app_settings`, `password_reset_tokens`), são criadas aqui; que o schema tem uma cópia no PlanA (`pnpm db:sync-schema` lá); e que a ordem de deploy é este app primeiro.
  - Documente `POST /api/notifications/dispatch` na seção de operação, com um exemplo de `curl`.
  - Na lista de tabelas a apagar ao reaproveitar um banco de teste (seção 9), inclua as tabelas novas, antes de `patients`.

- [ ] **Step 6: Commit**

  `feat: endpoint de envio de notificações para o PlanA e README`

---

# Parte B: `dieta-app`

### Task 4: Fundação

**Files:**
- Modify: `package.json`, `.gitignore`, `pnpm-lock.yaml`
- Delete: `package-lock.json`
- Create: `vitest.config.ts`, `.env.example`, `scripts/sync-schema.mjs`, `lib/env.ts`, `lib/log.ts`, `lib/db/client.ts`, `lib/db/schema.ts`
- Test: `tests/lib/env.test.ts`, `tests/lib/log.test.ts`, `tests/db/schema-sync.test.ts`

**Interfaces:**
- Produces:
  - `parseEnv(raw: Record<string, string | undefined>): Env` e `getEnv(): Env`. `Env` tem `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `FORMS_INTERNAL_URL`, `JOBS_TOKEN`, `ADMIN_EMAIL?`, `ADMIN_PASSWORD?`, `ADMIN_NAME` (padrão `"Administrador"`), `NOTIFY_EMAIL_ENABLED` e `NOTIFY_WHATSAPP_ENABLED` (booleanos, padrão `true`). Erro: `Variáveis de ambiente inválidas ou ausentes: A, B`.
  - `createLogger(write?)`, `Logger`, `maskEmail`, `maskCpf`, `maskPhone` (`lib/log.ts`).
  - `createDb(url): { db: Db; pool }`, `getDb(): Db`, tipo `Db` (`lib/db/client.ts`).

- [ ] **Step 1: Dependências e scripts**

  - `package.json`: `"packageManager": "pnpm@9.15.0"`; scripts `test` (`vitest run`), `test:watch` (`vitest`), `typecheck` (`tsc --noEmit`), `db:sync-schema` (`node scripts/sync-schema.mjs`); dependência `mysql2` `^3.24.5`; `drizzle-orm` `^0.45.3`; devDependency `vitest` `^5.0.3`. Não remova nada ainda (a remoção é da Task 13).
  - Apague `package-lock.json`. Em `.gitignore`, depois de `.env*`, acrescente `!.env.example`.
  - Run: `corepack pnpm install`

- [ ] **Step 2: Cópias do `v0-tami-forms`**

  - `vitest.config.ts`: cópia, com `fileParallelism: false` em `test` (os testes de MySQL dividem um banco).
  - `lib/log.ts` e `tests/lib/log.test.ts`: cópias sem mudança.
  - `lib/db/client.ts`: cópia; troque o nome do global para `__planaDb`.
  - `scripts/sync-schema.mjs`: copia `../v0-tami-forms/lib/db/schema.ts` para `lib/db/schema.ts` e encerra com erro se a origem não existir. Rode `corepack pnpm db:sync-schema`.

- [ ] **Step 3: Testes que falham**

  - `tests/db/schema-sync.test.ts`: `it.skipIf(!existsSync(vizinho))("schema.ts é idêntico ao do v0-tami-forms")`, comparando os dois arquivos depois de trocar `\r\n` por `\n`.
  - `tests/lib/env.test.ts`: aceita o conjunto mínimo e aplica os padrões; `SESSION_SECRET` com 31 caracteres, `JOBS_TOKEN` com 31, `APP_URL` sem esquema, `ADMIN_PASSWORD` com 11, `ADMIN_EMAIL` inválido e `NOTIFY_EMAIL_ENABLED="sim"` falham citando o nome da variável; `DATABASE_URL=""` falha; `ADMIN_EMAIL` e `ADMIN_PASSWORD` ausentes são aceitos.

- [ ] **Step 4: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/env.test.ts`
  Expected: FAIL (`lib/env.ts` não existe).

- [ ] **Step 5: Implementar `lib/env.ts`** no molde do `v0-tami-forms`, e `.env.example` com todas as variáveis de §8.2 comentadas em português.

- [ ] **Step 6: Rodar e ver passar**

  Run: `corepack pnpm test`
  Expected: PASS.

- [ ] **Step 7: Commit**

  `chore: fundação do PlanA sobre MySQL (pnpm, vitest, env, log, cliente e schema)`

### Task 5: Primitivas de autenticação e validação

**Files:**
- Create: `lib/auth/password-hash.ts`, `lib/auth/session-token.ts`, `lib/auth/reset-token.ts`, `lib/validation/cpf.ts`, `lib/validation/password.ts`, `lib/validation/contact.ts`, `lib/http/rate-limit.ts`, `lib/http/client-ip.ts`, `lib/http/read-json.ts`
- Test: `tests/lib/auth/password-hash.test.ts`, `tests/lib/auth/session-token.test.ts`, `tests/lib/auth/reset-token.test.ts`, `tests/lib/validation/validation.test.ts`, `tests/lib/http/rate-limit.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(password: string): Promise<string>`, `verifyPassword(password: string, stored: string): Promise<boolean>`
  - `type Session = { userId: string; userType: "patient" | "admin"; name: string; email: string; mustChangePassword: boolean }`
  - `SESSION_COOKIE = "plana_session"`, `SESSION_MAX_AGE_S = 604800`
  - `signSession(s: Session, secret: string): Promise<string>`, `verifySessionToken(token: string | undefined, secret: string): Promise<Session | null>` (só `jose`; sem `next/headers`, para o `middleware.ts` poder importar)
  - `newResetToken(): { token: string; hash: string }`, `hashResetToken(token: string): string`
  - `isValidCpf(raw: string): boolean`, `onlyDigits(raw: string): string`
  - `MIN_PASSWORD_LENGTH = 8`, `MAX_PASSWORD_LENGTH = 200`, `isAcceptablePassword(p: unknown): p is string`
  - `normalizeEmail(raw: string): string | null` (trim, minúsculas, formato de e-mail, até 254), `normalizePhone(raw: string | undefined): string` (só dígitos; `""` se vazio ou com mais de 13)
  - `createRateLimiter(opts)`, `RateLimiter`; `clientIp(req: Request): string`; `readJsonBody(req, maxBytes)`

- [ ] **Step 1: Cópias com teste**

  Copie do `v0-tami-forms`, com os testes correspondentes ajustados só nos caminhos: `lib/access/password-hash.ts` → `lib/auth/password-hash.ts`; `lib/http/rate-limit.ts`; `lib/http/read-json.ts`. `isValidCpf` vem de `lib/quiz/validation.ts`; `clientIp`, de `lib/http/handlers/submit-quiz.ts`. No comentário do formato do hash, troque "§8" por "§6.1 do spec do PlanA".

- [ ] **Step 2: Testes que falham**

  - `password-hash.test.ts` (além dos copiados): um SHA-512 em base64 de `"senha123"` como valor gravado → `verifyPassword` devolve `false`.
  - `session-token.test.ts`: assina e lê de volta os cinco campos; token `undefined`, vazio ou adulterado → `null`; segredo diferente → `null`; token vencido → `null`; token sem `userType` → `null`; segredo vazio → `null` na leitura.
  - `reset-token.test.ts`: `token` tem 43 caracteres do alfabeto base64url; `hash` tem 64 caracteres hexadecimais e é igual a `hashResetToken(token)`; duas chamadas dão tokens diferentes.
  - `validation.test.ts`: `isValidCpf("529.982.247-25")` verdadeiro, `"111.111.111-11"` falso; `isAcceptablePassword` aceita 8 e 200 caracteres e recusa 7, 201 e valor que não é texto; `normalizeEmail(" Ana@Gmail.com ")` é `"ana@gmail.com"`, `"sem-arroba"` é `null`; `normalizePhone("(11) 98765-4321")` é `"11987654321"`, `undefined` é `""`, 14 dígitos é `""`.

- [ ] **Step 3: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/auth tests/lib/validation`
  Expected: FAIL (módulos inexistentes).

- [ ] **Step 4: Implementar** os módulos do bloco Interfaces. Claims do JWT: `sub` (id), `type`, `name`, `email`, `mcp` (booleano).

- [ ] **Step 5: Rodar e ver passar**

  Run: `corepack pnpm test`
  Expected: PASS.

- [ ] **Step 6: Commit**

  `feat: hash scrypt, token de sessão, token de redefinição e validações`

### Task 6: Repositórios de identidade

**Files:**
- Create: `lib/repos/types.ts`, `lib/repos/patients.ts`, `lib/repos/admins.ts`, `lib/repos/reset-tokens.ts`, `tests/helpers/test-db.ts`, `tests/helpers/seed.ts`
- Test: `tests/repos/patients.test.ts`, `tests/repos/admins.test.ts`, `tests/repos/reset-tokens.test.ts`

**Interfaces:**
- Consumes: `Db`, schema.
- Produces (`lib/repos/types.ts`):

  ```ts
  export type Channel = "email" | "whatsapp"
  export type PatientRow = {
    id: string; name: string; cpf: string; email: string; phone: string
    passwordHash: string | null; mustChangePassword: boolean; createdAt: Date
  }
  export interface PatientRepo {
    findByCpf(cpf: string): Promise<PatientRow | null>
    /** No máximo 2 linhas: quem chama só precisa saber se há exatamente uma. */
    findByEmail(email: string): Promise<PatientRow[]>
    getById(id: string): Promise<PatientRow | null>
    /** `created_at` decrescente; `search` vazio lista todos; senão LIKE em nome, e-mail e CPF. */
    list(search: string): Promise<PatientRow[]>
    /** Grava `must_change_password = true` e `password_set_at`. */
    create(d: { name: string; cpf: string; email: string; phone: string; passwordHash: string }): Promise<PatientRow | "cpf_taken">
    update(id: string, d: { name: string; email: string; phone: string }): Promise<PatientRow | null>
    setPassword(id: string, d: { passwordHash: string; mustChangePassword: boolean }): Promise<boolean>
    /** `has_history`: existe cobrança ou envio do quiz. Senão apaga tokens, mensagens e planos, e o paciente (§9.1). */
    delete(id: string): Promise<"deleted" | "not_found" | "has_history">
  }
  export type AdminRow = { id: string; name: string; email: string; passwordHash: string }
  export interface AdminRepo {
    findByEmail(email: string): Promise<AdminRow | null>
    getById(id: string): Promise<AdminRow | null>
    count(): Promise<number>
    create(d: { name: string; email: string; passwordHash: string }): Promise<"created" | "email_taken">
    setPassword(id: string, passwordHash: string): Promise<boolean>
  }
  export interface ResetTokenRepo {
    /** Uma transação: o token e uma mensagem `password_reset` por destinatário (§7.1, passo 4). */
    createRequest(d: {
      patientId: string; tokenHash: string; expiresAt: Date; link: string
      recipients: { channel: Channel; recipient: string }[]; now: Date
    }): Promise<{ notificationIds: string[] }>
    /** Uma transação (§7.2, passo 3). `invalid`: inexistente ou usado. `expired`: `expires_at <= now`. */
    redeem(d: { tokenHash: string; passwordHash: string; now: Date }): Promise<"ok" | "invalid" | "expired">
  }
  ```

  Fábricas: `createPatientRepo(db)`, `createAdminRepo(db)`, `createResetTokenRepo(db)`.
- Produces (helpers de teste):
  - `mysqlTestsEnabled: boolean` (há `TEST_DATABASE_URL` e existe `../v0-tami-forms/lib/db/migrations`)
  - `openTestDb(): Promise<{ db: Db; pool: mysql.Pool }>` (aplica as migrations do vizinho com `drizzle-orm/mysql2/migrator`)
  - `truncateAll(pool): Promise<void>` (todas as tabelas menos `__drizzle_migrations`, com `FOREIGN_KEY_CHECKS=0` numa conexão só)
  - `seedQuizPatient(db, over?: { cpf?: string; email?: string; phone?: string }): Promise<{ patientId: string; paymentId: string; quizResponseId: string }>` (paciente sem senha, cobrança `PENDING` e um envio, como o quiz grava)
  - `seedGeneratedPlan(db, ids): Promise<{ mealPlanId: string }>` (plano `active` com `payment_id` e a linha `done` em `plan_generations` apontando para ele)

- [ ] **Step 1: Helpers de teste** (`tests/helpers/`).

- [ ] **Step 2: Testes que falham** (todos em `describe.skipIf(!mysqlTestsEnabled)`, com `truncateAll` no `beforeEach`)

  `patients.test.ts`:
  - `create` devolve a linha com `mustChangePassword: true`; segundo `create` com o mesmo CPF → `"cpf_taken"`; mesmo e-mail com outro CPF é aceito.
  - `findByEmail` com dois pacientes de mesmo e-mail devolve 2; com três, ainda 2.
  - `list("")` vem do mais novo ao mais antigo; `list("ANA")` acha "Ana Souza"; `list("529982")` acha pelo CPF.
  - `update` de id inexistente → `null`.
  - `setPassword` grava hash e a marca; id inexistente → `false`.
  - `delete`: paciente do quiz (`seedQuizPatient`) → `"has_history"` e a linha continua; paciente criado pelo admin com um token, uma mensagem `password_reset` e um plano manual → `"deleted"` e nenhuma linha dele sobra em `password_reset_tokens`, `notifications`, `meal_plans` e `patients`; id inexistente → `"not_found"`.

  `admins.test.ts`: `count` 0 e depois 1; `create` repetido → `"email_taken"`; `findByEmail` acha; `setPassword` troca o hash.

  `reset-tokens.test.ts`:
  - `createRequest` com dois destinatários grava um token e duas linhas em `notifications` com `kind = 'password_reset'`, `status = 'pending'`, `quiz_response_id` e `payment_id` nulos, `patient_id`, `payload.link` e `next_attempt_at` = `now`; devolve os dois ids.
  - `createRequest` sem destinatários grava só o token.
  - `redeem` com hash desconhecido → `"invalid"`; com token vencido (`expiresAt` = `now`) → `"expired"` e a senha não muda.
  - `redeem` válido → `"ok"`: `password_hash` novo, `must_change_password = false`, `password_set_at` = `now`, e **todos** os tokens do paciente ficam `used`; repetir → `"invalid"`.
  - dois tokens do mesmo paciente: resgatar o segundo invalida o primeiro.

- [ ] **Step 3: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/repos` (com `TEST_DATABASE_URL`)
  Expected: FAIL (módulos inexistentes).

- [ ] **Step 4: Implementar** os três repositórios. `cpf_taken` e `email_taken` vêm do erro `ER_DUP_ENTRY` da chave única. `redeem` lê o token com `FOR UPDATE` dentro da transação.

- [ ] **Step 5: Rodar e ver passar**

  Run: `corepack pnpm vitest run tests/repos`
  Expected: PASS.

- [ ] **Step 6: Commit**

  `feat: repositórios de pacientes, admins e tokens de redefinição`

### Task 7: Serviços de autenticação

**Files:**
- Create: `lib/services/login.ts`, `lib/services/change-password.ts`, `lib/services/password-reset.ts`, `lib/services/seed-admin.ts`, `lib/forms-client.ts`
- Test: `tests/lib/services/login.test.ts`, `change-password.test.ts`, `password-reset.test.ts`, `seed-admin.test.ts`, `tests/lib/forms-client.test.ts`

**Interfaces:**
- Consumes: tipos da Task 6; `Session`, `verifyPassword`, `hashPassword`, `newResetToken`, `hashResetToken`, `isValidCpf`, `onlyDigits`, `normalizeEmail`, `isAcceptablePassword`, `maskEmail`, `Logger`.
- Produces:

  ```ts
  // login.ts
  export type LoginResult = { ok: true; session: Session } | { ok: false }
  export function createLoginPatient(d: {
    patients: Pick<PatientRepo, "findByCpf" | "findByEmail">
    verifyPassword: (password: string, stored: string) => Promise<boolean>
    /** Hash scrypt fixo, verificado quando não há paciente, para igualar o tempo de resposta. */
    dummyHash: string
  }): (input: { cpf?: unknown; email?: unknown; password?: unknown }) => Promise<LoginResult>
  export function createLoginAdmin(d: {
    admins: Pick<AdminRepo, "findByEmail">; verifyPassword: …; dummyHash: string
  }): (input: { email?: unknown; password?: unknown }) => Promise<LoginResult>

  // change-password.ts
  export type ChangePasswordResult = "ok" | "wrong_current" | "invalid_new" | "not_found"
  export function createChangePatientPassword(d: {
    patients: Pick<PatientRepo, "getById" | "setPassword">; hashPassword: …; verifyPassword: …
  }): (patientId: string, input: { currentPassword?: unknown; newPassword?: unknown }) => Promise<ChangePasswordResult>
  export function createChangeAdminPassword(d: {
    admins: Pick<AdminRepo, "getById" | "setPassword">; hashPassword: …; verifyPassword: …
  }): (adminId: string, input: { currentPassword?: unknown; newPassword?: unknown }) => Promise<ChangePasswordResult>

  // password-reset.ts
  export const RESET_TOKEN_TTL_MS = 3_600_000
  export type ResetRequestResult =
    | { kind: "invalid_cpf" } | { kind: "not_found" }
    | { kind: "sent"; maskedEmail: string; notificationIds: string[] }
  export function createRequestPasswordReset(d: {
    patients: Pick<PatientRepo, "findByCpf">; resetTokens: Pick<ResetTokenRepo, "createRequest">
    newToken: () => { token: string; hash: string }; now: () => Date
    appUrl: string; channels: Channel[]
  }): (cpf: unknown) => Promise<ResetRequestResult>
  export function createRedeemPasswordReset(d: {
    resetTokens: Pick<ResetTokenRepo, "redeem">; hashPassword: …
    hashToken: (token: string) => string; now: () => Date
  }): (input: { token?: unknown; newPassword?: unknown }) => Promise<"ok" | "invalid_new" | "invalid" | "expired">

  // seed-admin.ts
  export function createSeedAdmin(d: {
    admins: Pick<AdminRepo, "count" | "create">; hashPassword: …; log: Logger
  }): (cfg: { email?: string; password?: string; name: string }) => Promise<"created" | "skipped_existing" | "skipped_missing_env">

  // forms-client.ts
  export function createFormsClient(d: {
    baseUrl: string; token: string; fetchImpl?: typeof fetch; timeoutMs?: number; log: Logger
  }): { dispatchNotifications(ids: string[]): Promise<boolean> }
  ```

- [ ] **Step 1: Testes que falham** (dublês simples com `vi.fn`, sem banco)

  `login.test.ts`:
  - CPF `"529.982.247-25"` com a senha certa → `ok`, e `findByCpf` foi chamado com `"52998224725"`; a sessão traz `userType: "patient"` e o `mustChangePassword` do paciente.
  - senha errada, CPF inexistente e paciente com `passwordHash` nulo → `{ ok: false }`; nos dois últimos, `verifyPassword` ainda é chamado uma vez, com `dummyHash`.
  - e-mail `" Ana@Gmail.com "` → `findByEmail("ana@gmail.com")`; uma linha e senha certa → `ok`; duas linhas → `{ ok: false }`.
  - senha com 201 caracteres → `{ ok: false }` sem chamar repositório nem `verifyPassword`.
  - sem `cpf` e sem `email`, ou `password` que não é texto → `{ ok: false }`.
  - admin: senha certa → sessão `userType: "admin"`, `mustChangePassword: false`; e-mail desconhecido ou senha errada → `{ ok: false }`.

  `change-password.test.ts`:
  - paciente inexistente (sessão de quem foi excluído) → `"not_found"`.
  - senha atual errada → `"wrong_current"`, sem `setPassword`.
  - senha nova com 7 ou com 201 caracteres → `"invalid_new"`.
  - sucesso → `setPassword(id, { passwordHash: <hash novo>, mustChangePassword: false })`.
  - admin: os mesmos quatro casos.

  `password-reset.test.ts`:
  - CPF `"123"` → `invalid_cpf`; CPF válido sem paciente → `not_found`.
  - sucesso com os dois canais e telefone `"11987654321"`: `createRequest` recebe `tokenHash` do token novo, `expiresAt` = `now` + 3 600 000 ms, `link` = `"https://plana.test/cliente/redefinir-senha/" + token` e os destinatários `email` (o e-mail) e `whatsapp` (`"5511987654321"`); resultado traz `maskedEmail: "a***@gmail.com"` e os ids.
  - `appUrl` terminado em `/` não gera `//` no link.
  - canais `["email"]` → só o destinatário de e-mail.
  - paciente com `phone: ""` → só o destinatário de e-mail, mesmo com o WhatsApp ativo.
  - resgate: `token` ausente → `"invalid"`; senha nova com 7 caracteres → `"invalid_new"` sem tocar no repositório; `redeem` é chamado com o SHA-256 do token; os retornos `"invalid"`, `"expired"` e `"ok"` do repositório são repassados.

  `seed-admin.test.ts`: `count` 1 → `"skipped_existing"`, sem `create`; `count` 0 sem e-mail ou sem senha → `"skipped_missing_env"` e um `log.warn("boot.admin.missing")`; `count` 0 com as duas → `create` com o e-mail em minúsculas e um hash que confere com a senha; `create` devolvendo `"email_taken"` (outra instância criou) → `"skipped_existing"`.

  `forms-client.test.ts`: faz `POST <baseUrl>/api/notifications/dispatch` com `Authorization: Bearer <token>` e o corpo `{ notificationIds }`; `baseUrl` com `/` no fim não duplica a barra; resposta 202 → `true`; 401, erro de rede e tempo esgotado → `false` com `log.warn("forms.dispatch.failed")`, sem lançar; lista vazia → `true` sem chamar `fetch`.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/services tests/lib/forms-client.test.ts`
  Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar** os cinco módulos.

- [ ] **Step 4: Rodar e ver passar**

  Run: `corepack pnpm test`
  Expected: PASS.

- [ ] **Step 5: Commit**

  `feat: serviços de login, troca e recuperação de senha e primeiro admin`

### Task 8: Container, guardas, boot e rotas de autenticação

**Files:**
- Create: `lib/container.ts`, `lib/auth/session.ts`, `lib/auth/guards.ts`, `lib/db/check.ts`, `lib/boot.ts`, `instrumentation.ts`, `app/api/health/route.ts`
- Rewrite: `middleware.ts`, `app/api/auth/login-cliente/route.ts`, `login-admin/route.ts`, `logout/route.ts`, `session/route.ts`, `reset-password/route.ts`, `verify-reset-token/route.ts`, `forgot-password/route.ts`, `app/api/admin/change-password/route.ts`
- Modify: `app/cliente/recuperar-senha/page.tsx`, `app/cliente/redefinir-senha/[token]/page.tsx`, `components/change-password-dialog.tsx`
- Delete: `app/setup/page.tsx`, `app/api/setup/` (as três rotas), `app/api/patients/create/route.ts`
- Test: `tests/lib/auth/guards.test.ts`, `tests/lib/db/check.test.ts`, `tests/lib/middleware.test.ts`

**Interfaces:**
- Consumes: tudo das Tasks 4 a 7.
- Produces:

  ```ts
  // lib/auth/session.ts (usa next/headers e getEnv().SESSION_SECRET)
  export function createSession(s: Session): Promise<void>
  export function getSession(): Promise<Session | null>
  export function destroySession(): Promise<void>

  // lib/auth/guards.ts
  export type GuardResult = { ok: true; session: Session } | { ok: false; response: Response }
  export function checkSession(
    session: Session | null, want: "admin" | "patient", opts?: { allowPendingPasswordChange?: boolean },
  ): GuardResult
  export function requireAdmin(): Promise<GuardResult>
  export function requirePatient(opts?: { allowPendingPasswordChange?: boolean }): Promise<GuardResult>

  // lib/db/check.ts
  export type ColumnRef = { table: string; column: string }
  export function expectedColumns(): ColumnRef[]                    // de todas as tabelas do schema, via getTableConfig
  export function findSchemaGaps(expected: ColumnRef[], actual: ColumnRef[]): string[]
  export function checkDatabase(db: Db): Promise<string[]>

  // lib/container.ts
  export function getContainer(): Container
  ```

  `Container` expõe: `env`, `log`, `repos` (um campo por repositório; começa com `patients`, `admins`, `resetTokens` e cresce nas Tasks 9 a 12), `loginPatient`, `loginAdmin`, `changePatientPassword`, `changeAdminPassword`, `requestPasswordReset`, `redeemPasswordReset`, `seedAdmin`, `forms`, `loginLimiter`, `forgotLimiter`, `ping`. Guardado em `globalThis.__planaContainer`.

- [ ] **Step 1: Testes que falham**

  `guards.test.ts` (sobre `checkSession`):
  - sem sessão → `401` com `{ error: "Acesso não autorizado" }`, para `admin` e para `patient`.
  - sessão de paciente pedindo `admin`, e de admin pedindo `patient` → `401`.
  - paciente com `mustChangePassword` → `403` com `{ error: "Troque sua senha para continuar", code: "password_change_required" }`; com `allowPendingPasswordChange` → `ok`.

  `check.test.ts`:
  - `expectedColumns()` contém `{ table: "notifications", column: "patient_id" }` e `{ table: "admins", column: "password_hash" }`.
  - `findSchemaGaps`: tudo presente → `[]`; tabela inteira ausente → `["admins"]` (uma entrada, não uma por coluna); coluna ausente → `["notifications.patient_id"]`.

  `middleware.test.ts` (chama `middleware` com `NextRequest` e `SESSION_SECRET` em `process.env`):
  - `/cliente/dashboard` sem cookie → redireciona para `/cliente/login`; `/admin/dashboard` sem cookie → `/admin/login`.
  - `/cliente/login`, `/cliente/esqueci-senha`, `/cliente/redefinir-senha/abc` e `/admin/login` sem cookie → seguem.
  - paciente com `mustChangePassword` em `/cliente/planos` → redireciona para `/cliente/recuperar-senha`; em `/cliente/recuperar-senha` → segue.
  - paciente em `/admin/dashboard` → `/admin/login`; admin em `/cliente/dashboard` → `/cliente/login`.
  - `SESSION_SECRET` ausente → trata como sem sessão.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/auth/guards.test.ts tests/lib/db/check.test.ts tests/lib/middleware.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar a infraestrutura**

  - `lib/auth/session.ts`: cookie `httpOnly`, `sameSite: "lax"`, `secure` em produção, `maxAge` 604 800, `path: "/"`.
  - `lib/auth/guards.ts`, `lib/db/check.ts` (consulta `information_schema.columns` com `table_schema = DATABASE()`), `lib/container.ts` (`dummyHash` calculado uma vez com `hashPassword` de um valor aleatório, de forma lazy).
  - `lib/boot.ts` no molde do `v0-tami-forms`, na ordem de §8.1: `getEnv()`; `checkDatabase` → se houver lacunas, `log.error("boot.schema_missing", { missing, hint: "Suba o v0-tami-forms antes: é ele que cria as tabelas." })` e `process.exit(1)`; `seedAdmin`; `log.info("boot.done", { admin })`. Qualquer exceção → `boot.failed` e `process.exit(1)`.
  - `instrumentation.ts`: cópia do `v0-tami-forms`.
  - `app/api/health/route.ts`: `SELECT 1` → 200 `{ ok: true }`, senão 503 `{ ok: false }`.
  - `middleware.ts`: importa só `lib/auth/session-token.ts`; lê `process.env.SESSION_SECRET`; mesmo `matcher` de hoje.

- [ ] **Step 4: Reescrever as rotas**

  | Rota | Fluxo | Respostas |
  |---|---|---|
  | `POST /api/auth/login-cliente` | `loginLimiter.hit(clientIp)` → `loginPatient(body)` → `createSession` | 429 `{ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }`; sem (`cpf` ou `email`) ou sem `password` → 400 `{ error: "CPF ou e-mail e senha são obrigatórios" }`; `ok: false` → 401 `{ error: "CPF/E-mail ou senha inválidos" }`; sucesso → `{ success: true, user: { id, name, email } }` |
  | `POST /api/auth/login-admin` | igual, com `loginAdmin` | 400 `{ error: "E-mail e senha são obrigatórios" }`; 401 `{ error: "E-mail ou senha inválidos" }`; sucesso igual |
  | `POST /api/auth/logout` | `destroySession` | `{ success: true }` |
  | `GET /api/auth/session` | `getSession` | 401 `{ error: "Não autenticado" }`; `{ user: { userId, userType, email, name } }` |
  | `POST /api/auth/reset-password` | `requirePatient({ allowPendingPasswordChange: true })` → `changePatientPassword` → `createSession({ ...session, mustChangePassword: false })` | campos ausentes → 400 `{ error: "Senha atual e nova senha são obrigatórias" }`; `invalid_new` → 400 `{ error: "A nova senha deve ter entre 8 e 200 caracteres" }`; `wrong_current` → 401 `{ error: "Senha atual incorreta" }`; `not_found` → 404 `{ error: "Paciente não encontrado" }`; sucesso → `{ success: true, message: "Senha atualizada com sucesso" }` |
  | `POST /api/admin/change-password` | `requireAdmin` → `changeAdminPassword` | as mesmas, com `{ error: "Administrador não encontrado" }` no 404 |
  | `POST /api/auth/forgot-password` | `forgotLimiter.hit(clientIp)` → `requestPasswordReset(body.cpf)` → `after(() => forms.dispatchNotifications(ids))` | 429 (mesma mensagem do login); sem `cpf` → 400 `{ error: "CPF é obrigatório" }`; `invalid_cpf` → 400 `{ error: "CPF inválido" }`; `not_found` → 404 `{ error: "CPF não encontrado no sistema" }`; sucesso → `{ success: true, email: maskedEmail }` |
  | `POST /api/auth/verify-reset-token` | `redeemPasswordReset(body)` | campos ausentes → 400 `{ error: "Token e nova senha são obrigatórios" }`; `invalid_new` → 400 (mesma mensagem de senha); `invalid` → 400 `{ error: "Token inválido ou já utilizado" }`; `expired` → 400 `{ error: "Token expirado. Solicite um novo link de recuperação" }`; sucesso → `{ success: true, message: "Senha redefinida com sucesso!" }` |

  Toda rota lê o corpo com `readJsonBody(req, 4096)`; corpo ilegível → 400 com a mensagem de campos obrigatórios da rota. Exceção inesperada → `log.error` com mensagem segura e 500 com a mensagem genérica que a rota já usa hoje.

- [ ] **Step 5: Telas de senha e remoções**

  - Em `recuperar-senha/page.tsx`, `redefinir-senha/[token]/page.tsx` e `change-password-dialog.tsx`: troque o mínimo de 6 por 8 nas validações (`length < 6`, `minLength={6}`) e nos textos ("pelo menos 6 caracteres", "Mínimo de 6 caracteres"). Nada mais.
  - Apague `app/setup/`, `app/api/setup/` e `app/api/patients/create/`.

- [ ] **Step 6: Rodar e ver passar**

  Run: `corepack pnpm test`
  Expected: PASS.
  Run: `corepack pnpm typecheck 2>&1 | grep -E "^(lib|tests|middleware|instrumentation|app/api/(auth|health|admin/change-password))"`
  Expected: nenhuma linha.

- [ ] **Step 7: Commit**

  `feat: sessão, guardas, boot com conferência do banco e rotas de autenticação`

### Task 9: Pacientes pelo admin

**Files:**
- Create: `lib/services/patient-admin.ts`
- Rewrite: `app/api/admin/patients/route.ts`, `app/api/admin/patients/[id]/route.ts`, `app/api/admin/reset-patient-password/route.ts`
- Modify: `app/admin/pacientes/novo/page.tsx`, `app/admin/pacientes/[id]/editar/page.tsx`, `app/cliente/meus-dados/page.tsx`, `components/patient-form.tsx`, `components/delete-patient-button.tsx`, `lib/container.ts`
- Test: `tests/lib/services/patient-admin.test.ts`

**Interfaces:**
- Consumes: `PatientRepo`, `hashPassword`, validações da Task 5, guardas.
- Produces:

  ```ts
  export type CreatePatientResult =
    | { ok: true; patient: PatientRow }
    | { ok: false; reason: "missing_fields" | "invalid_cpf" | "invalid_email" | "invalid_password" | "cpf_taken" }
  export function createPatientAdmin(d: { patients: PatientRepo; hashPassword: (p: string) => Promise<string> }): {
    create(input: { name?: unknown; cpf?: unknown; email?: unknown; phone?: unknown; password?: unknown }): Promise<CreatePatientResult>
    update(id: string, input: { name?: unknown; email?: unknown; phone?: unknown }): Promise<PatientRow | "not_found" | "missing_fields" | "invalid_email">
    remove(id: string): Promise<"deleted" | "not_found" | "has_history">
    /** Grava a senha e põe `mustChangePassword: true` (§6.5). */
    resetPassword(id: string, newPassword: unknown): Promise<"ok" | "invalid_password" | "not_found">
  }
  ```

  No container: `patientAdmin`.

- [ ] **Step 1: Testes que falham**

  - `create`: sem nome → `missing_fields`; CPF `"111.111.111-11"` → `invalid_cpf`; e-mail `"x"` → `invalid_email`; senha de 7 caracteres → `invalid_password`; repositório devolve `"cpf_taken"` → `cpf_taken`; sucesso chama `patients.create` com CPF só de dígitos, e-mail em minúsculas, telefone só de dígitos (`""` quando ausente) e um hash que confere com a senha.
  - `update`: id inexistente → `not_found`; sucesso normaliza e-mail e telefone.
  - `remove`: repassa os três retornos do repositório.
  - `resetPassword`: senha curta → `invalid_password`; id inexistente → `not_found`; sucesso chama `setPassword(id, { passwordHash, mustChangePassword: true })`.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/lib/services/patient-admin.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar o serviço e ligá-lo no container.**

- [ ] **Step 4: Reescrever as rotas** (todas com `requireAdmin`)

  | Rota | Chama | Respostas novas ou alteradas |
  |---|---|---|
  | `GET /api/admin/patients?search=` | `repos.patients.list` | `{ patients: [{ id, name, email, cpf, phone, createdAt }] }` |
  | `POST /api/admin/patients` | `patientAdmin.create` | `missing_fields` → 400 `{ error: "Nome, email, CPF e senha são obrigatórios" }`; `invalid_cpf` → 400 `{ error: "CPF inválido" }`; `invalid_email` → 400 `{ error: "E-mail inválido" }`; `invalid_password` → 400 `{ error: "A senha deve ter entre 8 e 200 caracteres" }`; `cpf_taken` → 409 `{ error: "CPF já cadastrado" }`; sucesso → 201 `{ success: true, patient }` |
  | `GET /api/admin/patients/[id]` | `repos.patients.getById` | como hoje |
  | `PUT /api/admin/patients/[id]` | `patientAdmin.update` | como hoje, mais `invalid_email` → 400 |
  | `DELETE /api/admin/patients/[id]` | `patientAdmin.remove` | `not_found` → 404 `{ error: "Paciente não encontrado" }`; `has_history` → 409 `{ error: "Paciente com pagamentos não pode ser excluído" }`; sucesso → `{ success: true }` |
  | `POST /api/admin/reset-patient-password` | `patientAdmin.resetPassword` | `invalid_password` → 400 `{ error: "A nova senha deve ter entre 8 e 200 caracteres" }`; demais como hoje |

  As respostas nunca incluem `passwordHash`.

- [ ] **Step 5: Páginas de servidor e componentes**

  - `admin/pacientes/novo/page.tsx` e `[id]/editar/page.tsx`: trocam `getSession` de `@/lib/auth` por `@/lib/auth/session` e a consulta direta por `getContainer().repos.patients.getById`.
  - `cliente/meus-dados/page.tsx`: idem; paciente não encontrado → `redirect("/cliente/login")` (hoje manda para o dashboard). Como o schema não tem mais `birth_date`, remova a leitura desse campo se a página o usa, mantendo o bloco visual com "Não informado".
  - `components/patient-form.tsx`: mínimo de senha de 6 para 8, se houver essa validação. `components/delete-patient-button.tsx`: confira que a mensagem de erro vinda da API (`data.error`) aparece no aviso; se hoje ele mostra texto fixo, passe a mostrar `data.error`.

- [ ] **Step 6: Rodar e ver passar**

  Run: `corepack pnpm test`
  Expected: PASS.

- [ ] **Step 7: Commit**

  `feat: cadastro de pacientes do admin sobre MySQL com as regras novas`

### Task 10: Planos alimentares e painéis

**Files:**
- Create: `lib/repos/meal-plans.ts`, `lib/repos/stats.ts`, `lib/services/growth.ts`
- Modify: `lib/repos/types.ts`, `lib/container.ts`
- Rewrite: `app/api/client/meal-plans/route.ts`, `app/api/client/meal-plans/[id]/route.ts`, `app/api/client/dashboard-stats/route.ts`, `app/api/admin/meal-plans/route.ts`, `app/api/admin/meal-plans/[id]/route.ts`, `app/api/admin/dashboard-stats/route.ts`
- Test: `tests/repos/meal-plans.test.ts`, `tests/repos/stats.test.ts`, `tests/lib/services/growth.test.ts`

**Interfaces:**
- Produces (em `lib/repos/types.ts`):

  ```ts
  export type MealPlanRow = {
    id: string; patientId: string; title: string; description: string | null
    startDate: string; endDate: string | null
    dueDateNewMealPlan: string | null; paymentUrlNewMealPlan: string | null
    status: string; planData: unknown; createdAt: Date; updatedAt: Date
  }
  export type MealPlanWithPatient = MealPlanRow & { patient: { id: string; name: string; email: string; cpf: string } | null }
  export type MealPlanInput = {
    patientId: string; title: string; description: string | null
    startDate: string; endDate: string | null; status: string; planData: unknown
  }
  export interface MealPlanRepo {
    listByPatient(patientId: string): Promise<MealPlanRow[]>            // created_at decrescente
    getForPatient(id: string, patientId: string): Promise<MealPlanRow | null>
    listAll(): Promise<MealPlanWithPatient[]>                           // created_at decrescente
    get(id: string): Promise<MealPlanWithPatient | null>
    /** Com `status` "active", os outros planos `active` do paciente viram `completed`, na mesma transação (§9.1). */
    create(d: MealPlanInput, now: Date): Promise<MealPlanWithPatient | "patient_not_found">
    update(id: string, d: Partial<MealPlanInput>, now: Date): Promise<MealPlanWithPatient | "not_found" | "patient_not_found">
    /** `in_use`: há linha em `plan_generations` apontando para o plano. */
    delete(id: string): Promise<"deleted" | "not_found" | "in_use">
  }
  export interface StatsRepo {
    admin(range: { monthStart: Date; lastMonthStart: Date }): Promise<{
      totalPatients: number; activePlans: number; totalRecipes: number; newThisMonth: number; newLastMonth: number
    }>
    recipesCount(): Promise<number>
  }
  ```

  `growthPercentage(thisMonth: number, lastMonth: number): number` em `lib/services/growth.ts` (a regra que hoje está na rota do painel do admin). No container: `repos.mealPlans`, `repos.stats`.

- [ ] **Step 1: Testes que falham**

  `meal-plans.test.ts` (MySQL):
  - `create` com paciente inexistente → `"patient_not_found"`.
  - plano `active` A; depois `create` de B `active` para o mesmo paciente → A fica `completed`, B `active`; plano `active` de **outro** paciente não muda.
  - `create` de C com `status: "completed"` não altera B.
  - `update` de C para `active` → B vira `completed`.
  - `update` só do título não mexe no status dos outros planos.
  - `getForPatient` com o id certo e o paciente errado → `null`.
  - `delete` de plano manual → `"deleted"`; de plano com `plan_generations` (`seedGeneratedPlan`) → `"in_use"` e a linha continua; id inexistente → `"not_found"`.
  - `planData` volta como o objeto gravado.

  `stats.test.ts` (MySQL): conta pacientes, planos `active` e receitas; `newThisMonth` e `newLastMonth` respeitam os limites recebidos.

  `growth.test.ts`: `(10, 5)` → `100`; `(5, 10)` → `-50`; `(3, 0)` → `100`; `(0, 0)` → `0`.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/repos/meal-plans.test.ts tests/repos/stats.test.ts tests/lib/services/growth.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar** os repositórios, `growthPercentage`, e ligar no container.

- [ ] **Step 4: Reescrever as rotas**

  - Cliente (`requirePatient()`): lista, detalhe (404 se não é do paciente; 403 `{ error: "Este plano alimentar não está mais ativo" }` se o status não é `active`) e painel, com as mesmas chaves de hoje.
  - Admin (`requireAdmin()`): lista com busca em memória por título e nome do paciente, criação, detalhe, alteração e exclusão, com as validações e mensagens de hoje.
  - Exclusão: `in_use` → 409 `{ error: "Plano gerado a partir de um pagamento não pode ser excluído" }`.
  - Painel do admin: os limites de mês são calculados na rota como hoje e passados a `repos.stats.admin`; o percentual vem de `growthPercentage`.

- [ ] **Step 5: Rodar e ver passar**

  Run: `corepack pnpm test`
  Expected: PASS.

- [ ] **Step 6: Commit**

  `feat: planos alimentares e painéis sobre MySQL, com um único plano ativo por paciente`

### Task 11: Receitas e configurações

**Files:**
- Create: `lib/repos/recipes.ts`, `lib/repos/meal-config.ts`
- Modify: `lib/repos/types.ts`, `lib/container.ts`
- Rewrite: `app/api/admin/recipes/route.ts`, `app/api/admin/recipes/[id]/route.ts`, `app/api/client/recipes/route.ts`, `app/api/client/recipes/[id]/route.ts`, `app/api/admin/meal-categories/route.ts`, `app/api/admin/meal-categories/[id]/route.ts`, `app/api/admin/allowed-items/route.ts`, `app/api/admin/allowed-items/[id]/route.ts`, `app/api/admin/settings/route.ts`
- Test: `tests/repos/recipes.test.ts`, `tests/repos/meal-config.test.ts`

**Interfaces:**
- Produces (em `lib/repos/types.ts`):

  ```ts
  export type RecipeRow = {
    id: string; title: string; description: string | null; ingredients: string[]
    preparation: string; tips: string | null; prepTime: number | null; servings: number | null
    calories: number | null; category: string | null; imageUrl: string | null
    portionQuantity: number | null; proteins: number | null; lipids: number | null
    carbohydrates: number | null; fiber: number | null; activeCustomer: boolean
    createdAt: Date; updatedAt: Date
  }
  export type RecipeInput = Omit<RecipeRow, "id" | "createdAt" | "updatedAt">
  export interface RecipeRepo {
    /** `created_at` decrescente. `onlyActive` filtra `active_customer`; `search` faz LIKE em título e categoria. */
    list(opts: { onlyActive: boolean; search: string }): Promise<RecipeRow[]>
    get(id: string): Promise<RecipeRow | null>
    create(d: RecipeInput, now: Date): Promise<RecipeRow>
    update(id: string, d: Partial<RecipeInput>, now: Date): Promise<RecipeRow | null>
    delete(id: string): Promise<boolean>
  }
  export type MealCategoryRow = { id: string; name: string; createdAt: Date }
  export type AllowedItemRow = {
    id: string; itemType: string; foodName: string | null; createdAt: Date
    category: { id: string; name: string }; recipe: { id: string; title: string } | null
  }
  export interface MealConfigRepo {
    listCategories(): Promise<MealCategoryRow[]>                       // por nome
    createCategory(name: string, now: Date): Promise<MealCategoryRow | "name_taken">
    deleteCategory(id: string): Promise<void>                          // apaga os itens ligados (cascata)
    listAllowedItems(): Promise<AllowedItemRow[]>                      // created_at decrescente
    createAllowedItem(d: { mealCategoryId: string; itemType: string; foodName: string | null; recipeId: string | null }, now: Date): Promise<{ id: string }>
    deleteAllowedItem(id: string): Promise<void>
    getDietDefinition(): Promise<string>                               // "" quando não há linha
    setDietDefinition(text: string, now: Date): Promise<void>          // upsert da linha "global"
  }
  ```

  No container: `repos.recipes`, `repos.mealConfig`.

- [ ] **Step 1: Testes que falham** (MySQL)

  `recipes.test.ts`:
  - `create` e `get` devolvem `ingredients` como lista e `proteins: 12.5` como **número**.
  - `list({ onlyActive: true })` não traz receita com `activeCustomer: false`.
  - `list` com `search: "FRANGO"` acha "Frango grelhado"; com `search: "sobremesa"` acha pela categoria.
  - `update` de id inexistente → `null`; `delete` devolve `true` e depois `false`.

  `meal-config.test.ts`:
  - `createCategory` repetido → `"name_taken"`.
  - `deleteCategory` apaga os itens permitidos da categoria; apagar uma receita apaga os itens ligados a ela.
  - `listAllowedItems` traz `category` e, no item de receita, `recipe`; no item de alimento, `recipe: null`.
  - `getDietDefinition()` em banco vazio → `""`; `setDietDefinition` duas vezes mantém uma linha só e o último texto.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/repos/recipes.test.ts tests/repos/meal-config.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar** os repositórios (`setDietDefinition` com `onDuplicateKeyUpdate`) e ligar no container.

- [ ] **Step 4: Reescrever as nove rotas** com `requireAdmin()` ou `requirePatient()`, preservando chaves e mensagens. A busca de receitas passa a ser feita no banco, pelo repositório. `name_taken` → 409 `{ error: "Categoria já cadastrada" }`. `GET /api/admin/settings` devolve `{ settings: { dietTechnicalDefinition } }`.

- [ ] **Step 5: Rodar e ver passar**

  Run: `corepack pnpm test`
  Expected: PASS.

- [ ] **Step 6: Commit**

  `feat: receitas e configurações de refeição sobre MySQL`

### Task 12: Cadastro completo do paciente

**Files:**
- Create: `lib/repos/patient-record.ts`, `lib/admin/record-format.ts`, `app/api/admin/patients/[id]/record/route.ts`, `app/admin/pacientes/[id]/page.tsx`
- Modify: `lib/repos/types.ts`, `lib/container.ts`, `app/admin/pacientes/page.tsx`
- Test: `tests/repos/patient-record.test.ts`, `tests/lib/admin/record-format.test.ts`

**Interfaces:**
- Produces:

  ```ts
  export type PatientRecord = {
    patient: { id: string; name: string; cpf: string; email: string; phone: string; createdAt: Date; hasPassword: boolean; mustChangePassword: boolean }
    quizResponses: { id: string; createdAt: Date; answers: Record<string, unknown> }[]
    payments: { id: string; amount: string; status: string; dueDate: string | null; paidAt: Date | null; billingType: string | null; paymentUrl: string | null; createdAt: Date }[]
    mealPlans: { id: string; title: string; startDate: string; endDate: string | null; status: string; origin: "ai" | "admin"; createdAt: Date }[]
    notifications: { id: string; channel: string; kind: string; status: string; attempts: number; sentAt: Date | null; createdAt: Date }[]
  }
  export interface PatientRecordRepo { get(patientId: string): Promise<PatientRecord | null> }

  // lib/admin/record-format.ts
  export function formatAnswer(value: unknown): string
  export function notificationKindLabel(kind: string): string
  export function channelLabel(channel: string): string
  export function planOriginLabel(origin: "ai" | "admin"): string
  ```

  Todas as listas vêm do mais novo ao mais antigo. `origin` é `"ai"` quando o plano tem `payment_id`.

- [ ] **Step 1: Testes que falham**

  `patient-record.test.ts` (MySQL): id inexistente → `null`; paciente do quiz com plano gerado traz um envio com as respostas, uma cobrança, um plano `origin: "ai"`; um plano manual vem `origin: "admin"`; `hasPassword` reflete `password_hash`; o objeto serializado em JSON não contém as chaves `passwordHash`, `payload`, `lastError` nem `asaasCustomerId`; as mensagens de outro paciente não aparecem.

  `record-format.test.ts`: `formatAnswer(["Pão", "Café"])` → `"Pão, Café"`; `formatAnswer(75)` → `"75"`; `formatAnswer(null)` e `formatAnswer("")` → `"Não informado"`; `formatAnswer({ a: 1 })` → `'{"a":1}'`; texto com 600 caracteres é cortado em 500 e termina com `"…"`. `notificationKindLabel`: `payment_link` → `"Link de pagamento"`, `plan_ready` → `"Plano pronto"`, `password_reset` → `"Redefinição de senha"`, valor desconhecido → o próprio valor. `channelLabel`: `"E-mail"` e `"WhatsApp"`. `planOriginLabel`: `"Gerado pela IA"` e `"Criado pelo admin"`.

- [ ] **Step 2: Rodar e ver falhar**

  Run: `corepack pnpm vitest run tests/repos/patient-record.test.ts tests/lib/admin/record-format.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar** o repositório, as funções de formato e a rota `GET /api/admin/patients/[id]/record` (`requireAdmin()`; 404 `{ error: "Paciente não encontrado" }`; sucesso `{ record }`).

- [ ] **Step 4: Tela** `app/admin/pacientes/[id]/page.tsx`

  Componente cliente que busca a rota. Use só o que as telas do admin já usam: `AdminNav`, `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Badge`, `Button`, o link "Voltar para Pacientes" e o indicador de carregamento de `app/admin/pacientes/page.tsx`. Um `Card` por bloco de §9.2, na ordem de lá. Bloco vazio mostra "Nenhum registro.". CPF, telefone e datas com os mesmos formatadores da lista de pacientes. Valor da cobrança em reais (`R$ 39,90`). O link da cobrança abre em outra aba. As respostas do quiz são texto simples vindo de `formatAnswer`, nunca HTML.

- [ ] **Step 5: Botão na lista**

  Em `app/admin/pacientes/page.tsx`, antes do botão "Editar", um link para `/admin/pacientes/${paciente.id}` com o mesmo `Button variant="outline" size="sm"` e as mesmas classes do "Editar", ícone `Eye` do `lucide-react` e o texto "Ver cadastro".

- [ ] **Step 6: Rodar e ver passar**

  Run: `corepack pnpm test`
  Expected: PASS.

- [ ] **Step 7: Commit**

  `feat: tela de cadastro completo do paciente para o admin`

### Task 13: Limpeza, README e build

**Files:**
- Delete: os arquivos de §11 ("Apagados"), incluindo `lib/auth.ts`
- Modify: `package.json`, `pnpm-lock.yaml`, `next.config.mjs`, `tsconfig.json`, `.gitignore`, `README.md`

- [ ] **Step 1: Apagar** tudo o que §11 lista. Antes, confirme que nada mais importa esses módulos:

  Run: `grep -rnE "@/server/db|@/shared/schema|@shared/|@/lib/auth['\"]|crypto-utils|aws-config" app components lib middleware.ts`
  Expected: nenhuma linha. Se houver, migre o arquivo para `getContainer()` e `@/lib/auth/session` antes de apagar.

- [ ] **Step 2: Dependências e configuração**

  - `package.json`: remova `pg`, `@types/pg`, `@aws-sdk/client-ssm`, `drizzle-kit`, `bcryptjs`, `@types/bcryptjs` e os scripts `db:push` e `db:studio`. Run: `corepack pnpm install`.
  - `next.config.mjs`: remova `output: "standalone"` e o bloco `typescript: { ignoreBuildErrors: true }`. O resto fica.
  - `tsconfig.json`: remova o alias `@shared/*`.
  - `.gitignore`: acrescente `/public/sw.js`, `/public/workbox-*.js` e `/public/fallback-*.js` (gerados pelo PWA no build).

- [ ] **Step 3: Corrigir os erros de tipo**

  Run: `corepack pnpm typecheck`
  Expected: sem erros. Como o build ignorava tipos, podem aparecer erros antigos nas telas. Corrija com a menor mudança de tipo possível (anotações, checagem de nulo), sem alterar JSX, classes ou textos. Não use `any` novo nem `@ts-ignore`.

- [ ] **Step 4: README.md** reescrito, em português, com estas seções:

  1. O que é, e a relação com o `v0-tami-forms` (quem cria as tabelas, quem envia as mensagens).
  2. Requisitos (Node 24, pnpm pelo corepack, MySQL 8 já criado pelo `v0-tami-forms`).
  3. Rodar localmente, incluindo `corepack pnpm exec next dev -p 5001` quando o `v0-tami-forms` já usa a porta 5000.
  4. Variáveis de ambiente (tabela de §8.2) e como gerar `SESSION_SECRET`.
  5. Primeiro admin (§8.1, passo 3) e o aviso de que mudar `ADMIN_PASSWORD` depois não troca a senha.
  6. Deploy no Easypanel (§12), com a ordem dos dois apps.
  7. Schema: `pnpm db:sync-schema` e quando rodar.
  8. Segurança: o app só atrás do proxy; trocar as senhas do Supabase que ficaram no histórico do Git (§10).
  9. Testes, com `TEST_DATABASE_URL` e o aviso de banco descartável.

- [ ] **Step 5: Verificação completa**

  Run: `corepack pnpm test && corepack pnpm typecheck && corepack pnpm build`
  Expected: tudo passa; o build não pede variável de ambiente nem banco.

  Run: `grep -rIlE "supabase|aws-sdk|n8n-n8n|nutriplan_session|CkA9c3Q0|hashSHA512" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=docs --exclude-dir=attached_assets .`
  Expected: nenhuma linha além de `README.md` (que cita o Supabase na seção de segurança).

- [ ] **Step 6: Commit**

  `chore: remove Supabase, AWS e Docker; README novo e build com checagem de tipos`

### Task 14: Verificação local de ponta a ponta

Roteiro manual de §13, com os dois apps no banco local `plana`. Nenhum e-mail ou WhatsApp real é enviado: o `v0-tami-forms` roda com o job desligado e o PlanA aponta o envio para uma porta sem serviço. O envio real fica para o teste no sandbox do Easypanel.

**Files:**
- Modify (fora do Git): `../v0-tami-forms/.env.local`, `.env.local` do `dieta-app`

- [ ] **Step 1: Ambiente do `v0-tami-forms`**

  Em `../v0-tami-forms/.env.local`, acrescente só o que faltar: `ASAAS_WEBHOOK_TOKEN` e `ACCESS_PASSWORD_SECRET` (cada um com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Se `ANTHROPIC_API_KEY` não existir, acrescente `ANTHROPIC_API_KEY=trocar-pela-chave-real` e registre no relatório final que a chave é provisória.

- [ ] **Step 2: Ambiente do PlanA**

  Renomeie o `.env.local` atual para `.env.local.supabase.bak` (continua fora do Git) e crie um novo com: `DATABASE_URL` e `JOBS_TOKEN` copiados do `.env.local` do `v0-tami-forms`; `SESSION_SECRET` gerado; `APP_URL=http://localhost:5001`; `FORMS_INTERNAL_URL=http://localhost:5999`; `ADMIN_EMAIL=admin@plana.local`; `ADMIN_PASSWORD` gerado (anote para o relatório); `NOTIFY_WHATSAPP_ENABLED=false`.

- [ ] **Step 3: Migrations**

  Run (no `v0-tami-forms`): `JOBS_ENABLED=false corepack pnpm dev`
  Expected: log `boot.done`. No banco `plana`: as 13 tabelas e 3 linhas em `__drizzle_migrations`. Deixe rodando.

- [ ] **Step 4: Boot do PlanA**

  Run (no `dieta-app`): `corepack pnpm exec next dev -p 5001`
  Expected: log `boot.done` com `admin: "created"`; `GET http://localhost:5001/api/health` → 200.

- [ ] **Step 5: Roteiro** (com `curl` guardando cookies, ou no navegador)

  1. Login do admin com as variáveis → 200; `GET /api/admin/dashboard-stats` → 200.
  2. `POST /api/admin/patients` com um CPF válido de teste → 201. Login desse paciente → 200; `GET /api/client/meal-plans` → 403 com `code: "password_change_required"`; a página `/cliente/dashboard` redireciona para `/cliente/recuperar-senha`.
  3. `POST /api/auth/reset-password` → 200; `GET /api/client/meal-plans` → 200 com lista vazia.
  4. Admin cria um plano `active` para o paciente; o cliente o vê na lista e no detalhe. Um segundo plano `active` deixa o primeiro `completed`.
  5. `POST /api/auth/forgot-password` com o CPF → 200 com o e-mail mascarado; em `notifications` há uma linha `password_reset` `pending` de e-mail e nenhuma de WhatsApp; em `password_reset_tokens`, um hash. Leia o token em `payload.link`, redefina por `POST /api/auth/verify-reset-token` → 200; repetir → 400. Depois **apague essa linha de `notifications`**, para nenhum job futuro enviá-la.
  6. `GET /api/admin/patients/<id>/record` do paciente que já existia no banco (veio do quiz) → traz respostas e cobrança; excluir esse paciente → 409.
  7. Sem cookie: `GET /api/admin/patients` → 401; `/setup` → 404.
  8. Pare o PlanA, crie um banco vazio `plana_empty`, aponte `DATABASE_URL` para ele e suba de novo → o processo encerra com `boot.schema_missing` listando as tabelas. Restaure o `DATABASE_URL` e apague o banco `plana_empty`. Não use nenhum outro banco existente para este passo.

- [ ] **Step 6: Relatório**

  Registre o resultado de cada item, com a saída observada, e o que não pôde ser verificado. Pare os dois servidores. Nada desta tarefa entra em commit.
