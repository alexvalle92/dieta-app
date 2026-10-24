# Painel de erros no admin do PlanA

**Data:** 2026-10-24
**Branch:** `feature/painel-erros` (só no `dieta-app`)
**Status:** design aprovado em conversa; aguardando revisão do spec

## 1. Contexto e objetivo

O `v0-tami-forms` já registra dois tipos de erro no MySQL que os dois apps compartilham:

| | Onde | Reexecutável? |
|---|---|---|
| **Itens em falha definitiva** | `payments` com `status = 'ASAAS_FAILED'`, `plan_generations` e `notifications` com `status = 'failed'`, cada um com `last_error` (`step`, `attempt`, `at`, `httpStatus?`, `responseBody?`, `message`) | Sim, por `POST /api/jobs/retry` do `v0-tami-forms` (`{ paymentId }`, `{ planGenerationId }` ou `{ notificationId }`), que reabre o item e dispara uma rodada do job |
| **Logs de erro** (spec `2026-10-24-observabilidade-funil-design.md` do `v0-tami-forms`) | `app_logs`: todo `warn`/`error` do servidor e quatro `info` de sucesso, já mascarados, guardados por 90 dias | Não; é só registro |

Hoje, para tratar uma falha, o admin recebe o e-mail de alerta, roda um `SELECT` no MySQL para ler o `last_error`, corrige a causa e chama o `/api/jobs/retry` com `curl` (README do `v0-tami-forms`, seção "Operação").

**Objetivo:** uma página no admin do PlanA, `/admin/erros`, em que o admin vê as falhas com o detalhe do erro e as reexecuta com um botão, e consulta os logs de erro do servidor sem precisar do MySQL nem do Metabase.

### Restrições

- Toda tabela é criada e alterada pelas migrations do `v0-tami-forms`. Este ciclo não tem migration nem mudança no `v0-tami-forms`.
- O PlanA nunca fala com Asaas, SMTP, Evolution ou Anthropic. Reexecutar é pedir ao `v0-tami-forms`, pelo endpoint que já existe.
- A tela nova usa os componentes que o PlanA já tem (`components/ui/*`, `AdminNav`, `Pagination`, `sonner`).

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| O que listar | Duas abas: **Falhas** (os três tipos reexecutáveis, com botão) e **Logs de erro** (`app_logs`, só leitura) |
| Leitura | O PlanA lê as tabelas direto no MySQL compartilhado, com um repositório novo |
| Reexecução | `forms.retry(target)` chama o `POST /api/jobs/retry` do `v0-tami-forms` com o `JOBS_TOKEN` que o PlanA já tem |
| Ações | Só "Reexecutar", item a item. Sem "reexecutar todas" (`allFailed` não é exposto) e sem seleção múltipla |
| Descarte | Nenhum. A lista mostra tudo o que está em falha |
| Alvo da reexecução | A rota recebe `{ type, id }` e monta o alvo; nunca repassa um corpo arbitrário |

### Fora de escopo

- Descartar ou esconder uma falha.
- Reexecutar em lote.
- Histórico de reexecuções e lista de itens "em reprocessamento".
- Ligar uma linha de `app_logs` a um item em falha.
- Busca por texto nos logs.

## 3. Arquitetura

```
/admin/erros (página client)
  ├─ aba "Falhas" ──────── GET  /api/admin/failures ─────────> FailuresRepo.listFailed()
  │     Reexecutar ─────── POST /api/admin/failures/retry ───> forms.retry(target)
  │                                                               └─> POST {FORMS_INTERNAL_URL}/api/jobs/retry
  │                                                                      (Bearer JOBS_TOKEN)
  └─ aba "Logs de erro" ── GET  /api/admin/app-logs ─────────> FailuresRepo.listAppLogs(filtro)
```

### Módulos novos

| Arquivo | Papel |
|---|---|
| `lib/repos/failures.ts` | `createFailuresRepo(db)`: `listFailed()` e `listAppLogs(filtro)` (seção 4) |
| `lib/validation/failures.ts` | `retryRequestSchema` e `toRetryTarget`; `parseAppLogsQuery(searchParams, now)` (seção 5) |
| `lib/admin/failures-format.ts` | Rótulos em português dos tipos e dos `kind` de mensagem, dica por tipo, data/hora em São Paulo (seção 6) |
| `app/api/admin/failures/route.ts` | `GET` |
| `app/api/admin/failures/retry/route.ts` | `POST` |
| `app/api/admin/app-logs/route.ts` | `GET` |
| `app/admin/erros/page.tsx` | A página com as duas abas |

### Módulos alterados

- `lib/db/schema.ts`: `pnpm db:sync-schema`, que traz `app_logs`, `funnel_sessions` e `funnel_events` do `v0-tami-forms`. Sem isso, `tests/db/schema-sync.test.ts` falha (a cópia está atrás da fonte desde a observabilidade).
- `lib/repos/types.ts`: `FailedItem`, `AppLogRow`, `AppLogFilter`, `AppLogPage` e `FailuresRepo`.
- `lib/forms-client.ts`: método `retry` (seção 5.3).
- `lib/container.ts`: `repos.failures`.
- `components/admin-nav.tsx`: item **"Erros"** (`/admin/erros`, ícone `AlertTriangle`), depois de "Receitas" e antes de "Configurações".
- `README.md`: a página nova e o efeito do `db:sync-schema` no boot (seção 8).

## 4. Dados

### 4.1 `FailedItem`

```ts
type FailedItemType = "payment" | "plan_generation" | "notification"

type FailedItem = {
  type: FailedItemType
  id: string
  patient: { id: string; name: string; email: string }
  /** Nulo só se a linha estiver em falha sem `last_error` (não deveria acontecer). */
  lastError: {
    step: string
    message: string
    attempt?: number
    at?: string
    httpStatus?: number
    responseBody?: string
  } | null
  /** `sync_attempts` na cobrança; `attempts` nas outras. */
  attempts: number
  createdAt: Date
  updatedAt: Date
  /** Só em `notification`. */
  channel?: "email" | "whatsapp"
  kind?: string
}
```

### 4.2 `listFailed()`

Três consultas, cada uma com `INNER JOIN patients` e `ORDER BY updated_at DESC LIMIT 200`:

- `payments WHERE status = 'ASAAS_FAILED'`;
- `plan_generations WHERE status = 'failed'`;
- `notifications WHERE status = 'failed'`.

As três listas são unidas e ordenadas por `updatedAt` decrescente. O `last_error` vem do JSON da coluna. O repositório só aproveita os campos da seção 4.1 com o tipo certo e ignora o resto (um `httpStatus` em texto, por exemplo, some); um `last_error` sem `step` ou sem `message` em texto vira `null`. Na tela, "tentativa N" e a data só aparecem quando vierem.

### 4.3 `listAppLogs(filtro)`

```ts
type AppLogFilter = { from: Date; to: Date; area?: string; levels: ("info" | "warn" | "error")[]; page: number }
type AppLogRow = { id: number; ts: Date; level: string; event: string; area: string; fields: Record<string, unknown> }
type AppLogPage = { rows: AppLogRow[]; total: number; areas: string[] }
```

- `rows`: `ts >= from AND ts < to`, `level IN (levels)` e, se houver, `area = ?`; `ORDER BY ts DESC, id DESC`, 50 por página (`OFFSET (page - 1) * 50`).
- `total`: `COUNT(*)` com o mesmo filtro.
- `areas`: `SELECT DISTINCT area` com o filtro de período e de nível, mas sem o de área, em ordem alfabética (é a lista do seletor de área).

## 5. Rotas

Todas com `runtime = 'nodejs'`, `dynamic = 'force-dynamic'` e começando por `requireAdmin()` (sem sessão de admin → 401, como as outras rotas do admin). Erro inesperado → `c.log.error("<evento>", { message: error.name })` e 500 com `{ error: "<texto em português>" }`, no padrão de `dashboard-stats`.

### 5.1 `GET /api/admin/failures`

200 `{ items: FailedItem[] }` (datas em ISO). Erro → `admin.failures.error`, 500 `{ error: "Erro ao carregar as falhas" }`.

### 5.2 `POST /api/admin/failures/retry`

1. Corpo pelo `readJsonBody` que já existe, com teto de 4 KB (o mesmo do `/api/jobs/retry`). Falha → o status que ele devolve (400 para corpo ilegível, 413 acima do teto) com `{ error: "Pedido inválido" }`.
2. `retryRequestSchema` = `z.object({ type: z.enum(["payment", "plan_generation", "notification"]), id: z.string().min(1).max(64) }).strict()`. Inválido → 400 `{ error: "Pedido inválido" }`.
3. `toRetryTarget`: `payment` → `{ paymentId }`, `plan_generation` → `{ planGenerationId }`, `notification` → `{ notificationId }`.
4. `forms.retry(target)`:
   - `{ ok: false }` → 502 `{ error: "Não foi possível reexecutar agora" }`;
   - `{ ok: true, reopened }` → `c.log.info("admin.failures.retry", { type, reopened, adminId })` e 200 `{ ok: true, reopened }`.

O id do item não vai para o log do PlanA.

### 5.3 `forms.retry(target)`

```ts
type RetryTarget = { paymentId: string } | { planGenerationId: string } | { notificationId: string }
retry(target: RetryTarget): Promise<{ ok: true; reopened: number } | { ok: false }>
```

- `POST {base}/api/jobs/retry`, cabeçalhos `authorization: Bearer <token>` e `content-type: application/json`, corpo `JSON.stringify(target)`, timeout de 5 s (`timeoutMs`, o mesmo do dispatch), com o corpo da resposta lido dentro do prazo.
- Resposta 2xx com `{ ok: true, reopened: <inteiro >= 0> }` → `{ ok: true, reopened }`.
- Status diferente de 2xx → `warn("forms.retry.failed", { status })`; 2xx com corpo inesperado → `warn("forms.retry.failed", { status, reason: "unexpected_body" })`; exceção (rede, timeout) → `warn("forms.retry.failed", { error: err.name })`. Os três devolvem `{ ok: false }`.
- Nunca lança e nunca registra o token, o endereço, o corpo nem o id.

### 5.4 `GET /api/admin/app-logs`

`parseAppLogsQuery(searchParams, now)`:

| Parâmetro | Regra | Padrão |
|---|---|---|
| `from`, `to` | Data ISO; `from < to`; `to - from <= 90 dias` | `to = now`, `from = now - 7 dias` |
| `area` | Texto de 1 a 40 caracteres | sem filtro |
| `level` | Lista separada por vírgula com valores de `info`, `warn` e `error`, sem repetição | `warn,error` |
| `page` | Inteiro de 1 a 10.000 | `1` |

Inválido → 400 `{ error: "Filtro inválido" }`. Sucesso → 200 `{ rows, total, areas, page, pageSize: 50 }`. Erro → `admin.app_logs.error`, 500 `{ error: "Erro ao carregar os logs" }`.

## 6. Página `/admin/erros`

Página client no padrão de `/admin/pacientes`: `AdminNav`, `Toaster`, `fetch` nas rotas, `toast.error` quando a resposta não é ok. Sessão expirada (401) → `/admin/login`, como no dashboard.

Duas abas por botões (`Button` com `variant` ativo/inativo; não há componente de abas no projeto e não entra dependência nova). A aba aberta fica no parâmetro `?aba=falhas|logs`; o padrão é `falhas`.

### 6.1 Aba "Falhas"

Um `Card` por item, na ordem da API:

- **Selo do tipo:** `Cobrança`, `Geração de plano` ou `Mensagem · <canal> · <kind>`. Canal: `E-mail` ou `WhatsApp`. `kind`: `payment_link` → "link de pagamento", `plan_ready` → "plano pronto", `password_reset` → "redefinição de senha", `plan_expiring_d5` / `_d2` / `_d0` → "aviso de vencimento (5 dias / 2 dias / no dia)"; outro valor aparece como veio.
- **Paciente:** nome e e-mail, com link para `/admin/pacientes/[id]`.
- **Erro:** `step`, `message`, `HTTP <httpStatus>` quando houver, "tentativa <attempt>", e o `at` em data e hora de São Paulo (`dd/mm/aaaa hh:mm`). Sem `last_error`: "Sem detalhe do erro".
- **"Ver resposta"** (recolhido, só se houver `responseBody`): o texto num `<pre>` com quebra de linha e rolagem. Fica recolhido porque pode ter dados pessoais.
- **Dica por tipo** (texto fixo):
  - Cobrança: "Confira a chave do Asaas e os dados do paciente (CPF, e-mail, telefone)."
  - Geração de plano: "Confira a chave e o limite da Anthropic."
  - Mensagem: "Confira o SMTP (e-mail) ou a Evolution API (WhatsApp) e o contato do paciente."
- **Botão "Reexecutar"**, que abre um `AlertDialog`: "Reexecutar <tipo em minúsculas> de <nome>?" com o texto "O item volta para a fila e o processamento roda em seguida." Ao confirmar, o botão fica desabilitado com `Loader2` até a resposta:
  - 200 com `reopened: 1` → `toast.success("Reaberto. O processamento roda em seguida; se falhar de novo, o item volta para esta lista.")` e a lista recarrega;
  - 200 com `reopened: 0` → `toast.info("Este item já não está em falha.")` e a lista recarrega;
  - outra resposta ou erro de rede → `toast.error` com o `error` da resposta (ou "Não foi possível reexecutar agora") e o item continua na lista.
- Lista vazia: "Nenhuma falha pendente."
- Botão "Atualizar" no topo da aba, que recarrega a lista.

### 6.2 Aba "Logs de erro"

- **Filtros:** "De" e "Até" (`Input type="date"`, interpretados como o dia inteiro em São Paulo: `De` às 00:00 e `Até` às 23:59:59.999, convertidos para ISO antes da chamada), "Área" (`Select` com "Todas" + `areas` da resposta) e "Nível" (três `Switch`: `error`, `warn` e `info`; os dois primeiros ligados por padrão; pelo menos um tem que ficar ligado). Mudar um filtro volta para a página 1.
- **Linhas**, a mais recente primeiro: data e hora em São Paulo (com segundos), selo do nível (`error` em `destructive`, `warn` em `secondary`, `info` em `outline`), área e evento. **"Ver campos"** (recolhido) mostra o `fields` num `<pre>` com `JSON.stringify(fields, null, 2)`.
- `Pagination` que já existe, com `total` e 50 por página.
- Sem resultado: "Nenhum log no período."

### 6.3 `lib/admin/failures-format.ts`

Funções puras, usadas pela página: `failureTypeLabel(type)`, `notificationLabel(channel, kind)`, `failureHint(type)` e `formatSaoPauloDateTime(iso, { seconds })`. Esta última usa `Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ... })`. Ela não vai em `lib/time.ts`, que é cópia do `v0-tami-forms` conferida pelo `schema-sync`.

## 7. Segurança e privacidade

- O `responseBody`, o `fields` dos logs e o nome e e-mail do paciente só aparecem atrás do login de admin. Nenhuma rota nova grava esses dados nos logs do PlanA.
- O PlanA não ganha permissão nova: usa o mesmo usuário do MySQL e o `JOBS_TOKEN` que já tem.
- A rota de reexecução só aceita os três tipos e um id de até 64 caracteres. O `v0-tami-forms` continua sendo quem decide se o item pode ser reaberto (só reabre o que está em falha).

## 8. Deploy

Depois do `db:sync-schema`, o `checkDatabase` do boot passa a exigir `app_logs`, `funnel_sessions` e `funnel_events`. Elas vêm das migrations `0004`/`0005` do `v0-tami-forms`; por isso o `v0-tami-forms` com a observabilidade sobe antes deste deploy, a mesma regra de ordem que já existe. O README ganha essa nota na seção de deploy e a página nova na descrição do admin.

## 9. Testes (Vitest)

- `tests/repos/failures.test.ts` (MySQL real, `describe.skipIf(!mysqlTestsEnabled)`, como os outros repositórios):
  - `listFailed` traz as cobranças `ASAAS_FAILED`, as gerações `failed` e as mensagens `failed`, cada uma com o paciente certo, em `updatedAt` decrescente;
  - ignora cobranças `PENDING_ASAAS`/`PENDING`/`RECEIVED`/`CONFIRMED`, gerações `pending`/`done` e mensagens `pending`/`sent`;
  - o `last_error` vem com os campos da seção 4.1, e um `last_error` malformado vira `null`;
  - o teto de 200 por tipo;
  - `listAppLogs` filtra por período (limite inferior incluído, superior excluído), área e nível; pagina com 50; `total` conta tudo; `areas` ignora o filtro de área.
- `tests/lib/forms-client.test.ts`, casos novos de `retry`:
  - POST em `/api/jobs/retry` com o Bearer e o corpo de cada um dos três alvos;
  - `200 { ok: true, reopened: 1 }` → `{ ok: true, reopened: 1 }`;
  - 401, 500, corpo sem `ok`, `reopened` que não é inteiro, exceção de rede e timeout → `{ ok: false }` com `warn`;
  - nenhum `warn` contém o token, a URL nem o id.
- `tests/lib/validation/failures.test.ts`:
  - `retryRequestSchema` aceita os três tipos e recusa outro tipo, id vazio, id com 65 caracteres e chave extra;
  - `toRetryTarget` monta o alvo certo para cada tipo;
  - `parseAppLogsQuery` aplica os padrões; recusa `from >= to`, período maior que 90 dias, data inválida, nível desconhecido ou repetido, área com 41 caracteres, `page` 0, não inteiro ou maior que 10.000.
- `tests/lib/admin/failures-format.test.ts`: os rótulos de cada tipo e `kind` (e o `kind` desconhecido aparece como veio); as dicas; a data em São Paulo (UTC−3, sem horário de verão), por exemplo `2026-10-24T13:05:00.000Z` → `24/10/2026 10:05`, `2026-10-25T02:30:00.000Z` → `24/10/2026 23:30` (virada de dia) e, com `seconds`, `24/10/2026 10:05:00`.
- `tests/db/schema-sync.test.ts` volta a passar.

## 10. Critérios de sucesso

- No sandbox, com uma chave do Asaas inválida, um envio do quiz deixa a cobrança `ASAAS_FAILED`, que aparece na aba **Falhas** com o `step`, o `httpStatus` e o paciente.
- Depois de corrigir a chave e reiniciar o `v0-tami-forms`, **Reexecutar** mostra "Reaberto", o item some da lista, a cobrança é criada e o paciente recebe o link.
- Clicar em **Reexecutar** num item que outra aba já reabriu mostra "Este item já não está em falha".
- Com o `v0-tami-forms` fora do ar, **Reexecutar** mostra o erro e o item continua na lista.
- O erro do Asaas aparece na aba **Logs de erro** filtrando pela área `payment`.
- Sem sessão de admin, as três rotas novas respondem 401.
- `pnpm test`, `pnpm typecheck` e `pnpm build` passam no `dieta-app`.
