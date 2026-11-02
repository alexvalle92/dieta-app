# Navegação para celular e opções de substituição — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menu inferior com o plano alimentar a 1 toque para o paciente, e refeições com uma substituta gerada pela IA (menos o almoço), exibidas em abas no card.

**Architecture:** Dois repositórios. No PlanA (`dieta-app`), a lógica nova fica em funções puras testadas (`mealOptions`, `activeTab`, `expiryLabel`, `readSubstitutes`/`toMealPayload`) e as telas usam um `ClientShell` (topo + barra inferior) e um `MealPlanView` compartilhado. No `v0-tami-forms`, o schema da IA ganha `substitutes`, a validação ganha duas regras e o prompt ganha uma seção. `plan_data.meals[].substitutes` é opcional: nada antigo quebra.

**Tech Stack:** Next.js 16 (App Router, páginas client), React 18, Tailwind, `lucide-react`, Vitest (ambiente `node`), zod v4 e SDK da Anthropic no `v0-tami-forms`. Comandos com `corepack pnpm`.

**Spec:** `docs/superpowers/specs/2026-11-02-navegacao-mobile-substituicoes-design.md` (leia antes de começar; as seções citadas abaixo são dele).

## Global Constraints

- Branch `feature/navegacao-mobile-substituicoes` nos dois repositórios (no `dieta-app` já existe; no `v0-tami-forms`, criar a partir de `develop` na Task 7).
- Tasks 1–6 são no `dieta-app` (`C:/Users/Tâmili/repo/dieta-app`); Tasks 7–8 no `v0-tami-forms` (`C:/Users/Tâmili/repo/v0-tami-forms`). O PlanA sobe antes em produção.
- Sem migration, sem variável de ambiente nova, sem dependência nova.
- Regra de substitutas: **almoço (nome sem acento e minúsculo contém `almoco`): 0; toda outra refeição: exatamente 1.**
- Calorias da substituta: no máximo 10% de diferença em relação à principal (`|sub − principal| · 10 > principal` é erro).
- `substitutes` ausente equivale a lista vazia; `toPlanData` e o editor do admin **omitem** a chave quando vazia.
- `calories` do plano continua sendo a soma só das principais.
- Textos de tela em português, como no resto do app: "Início", "Meu Plano", "Receitas", "Opção 1", "Opção 2", "Abrir meu plano", "Vence em X dias" / "Vence em 1 dia", "Vence hoje", "Vencido", "Planos anteriores", "Ver todos", "Substituição (gerada pela IA)", "Você ainda não tem um plano ativo", "Tentar de novo".
- Barra inferior só abaixo de `md`; no `md+` as 3 opções ficam no topo. Topo e barra inferior com `no-print`.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Plano antigo, sem `substitutes` (ou com `substitutes: []`):** a tela mostra exatamente o que mostra hoje, sem botões de opção. Teste em Task 1.
- **`plan_data` malformado (`meals` que não é lista, refeição `null`, `substitutes` com lixo):** a tela não quebra; a refeição inválida some e a substituta inválida é ignorada. Testes em Task 1; `MealPlanView` filtra em Task 3.
- **Nome de almoço com variações ("ALMOÇO", "Almoco", "Almoço pós-treino"):** conta como almoço (0 substitutas); "Café da manhã", "Ceia", "Pré-treino" não. Teste em Task 7.
- **Plano ativo vencido:** o Início mostra "Vencido" e "Meu Plano" continua abrindo o plano. Teste de `expiryLabel` em Task 4; conferência no app em Task 6.
- **Admin salva um plano com substitutas, ou adiciona uma refeição nova:** as substitutas existentes voltam intactas no `PUT`, e a refeição nova vai sem a chave. Testes em Task 5.

---

### Task 1: Opções da refeição (`mealOptions`)

**Files:**
- Create: `lib/meal-plan/options.ts`
- Test: `tests/lib/meal-plan/options.test.ts`

**Interfaces:**
- Produces: `export type MealOption = { foods: string[]; calories: string | null }` e `export function mealOptions(meal: unknown): MealOption[]` (spec §6.1). Usados pela Task 3.

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from "vitest"
import { mealOptions } from "@/lib/meal-plan/options"

const base = { name: "Jantar", time: "19:00", foods: "Arroz — 100 g\n\n  Frango — 120 g  ", calories: "450" }

describe("mealOptions", () => {
  it("sem substitutes devolve só a principal, com linhas limpas", () => {
    expect(mealOptions(base)).toEqual([{ foods: ["Arroz — 100 g", "Frango — 120 g"], calories: "450" }])
  })
  it("substitutes vazio equivale a ausente", () => {
    expect(mealOptions({ ...base, substitutes: [] })).toHaveLength(1)
  })
  it("principal primeiro, depois a substituta", () => {
    const opts = mealOptions({ ...base, substitutes: [{ foods: "Rap10 — 1 un\nCarne — 100 g", calories: "430" }] })
    expect(opts).toEqual([
      { foods: ["Arroz — 100 g", "Frango — 120 g"], calories: "450" },
      { foods: ["Rap10 — 1 un", "Carne — 100 g"], calories: "430" },
    ])
  })
  it("ignora substitutas malformadas", () => {
    const opts = mealOptions({ ...base, substitutes: [null, "x", { foods: 3 }, { foods: "  \n " }, { foods: "Ovo — 1 un" }] })
    expect(opts).toEqual([opts[0], { foods: ["Ovo — 1 un"], calories: null }])
  })
  it("substitutes que não é lista vira vazio", () => {
    expect(mealOptions({ ...base, substitutes: { foods: "Ovo — 1 un" } })).toHaveLength(1)
  })
  it("calorias numéricas viram texto; vazias ou de outro tipo viram null", () => {
    expect(mealOptions({ ...base, calories: 300 })[0].calories).toBe("300")
    expect(mealOptions({ ...base, calories: "" })[0].calories).toBeNull()
    expect(mealOptions({ ...base, calories: true })[0].calories).toBeNull()
  })
  it("principal sem foods vira lista vazia, mas continua sendo uma opção", () => {
    expect(mealOptions({ name: "Ceia" })).toEqual([{ foods: [], calories: null }])
  })
  it("refeição que não é objeto devolve []", () => {
    expect(mealOptions(null)).toEqual([])
    expect(mealOptions("Almoço")).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm exec vitest run tests/lib/meal-plan/options.test.ts`
Expected: FAIL (módulo `@/lib/meal-plan/options` não existe).

- [ ] **Step 3: Implementar `mealOptions` em `lib/meal-plan/options.ts`**

Comentário de cabeçalho curto (o `plan_data` vem do `v0-tami-forms`, então tudo é lido como `unknown`). Linhas: `split(/\r?\n/)`, `trim`, sem vazias. Calorias: texto não vazio após `trim` fica; número finito vira `String(n)`; resto `null`.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm exec vitest run tests/lib/meal-plan/options.test.ts`
Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/meal-plan/options.ts tests/lib/meal-plan/options.test.ts
git commit -m "feat: opções da refeição (principal e substitutas) lidas do plan_data"
```

---

### Task 2: Navegação do paciente (`activeTab` + `ClientShell`)

**Files:**
- Create: `lib/client/nav.ts`, `components/client-shell.tsx`
- Test: `tests/lib/client/nav.test.ts`
- Modify: `app/layout.tsx` (`viewport`), `app/cliente/dashboard/page.tsx`, `app/cliente/planos/page.tsx`, `app/cliente/planos/[id]/page.tsx`, `app/cliente/planos/[id]/renovar/page.tsx`, `app/cliente/receitas/page.tsx`, `app/cliente/receitas/[id]/page.tsx`, `app/cliente/meus-dados/page.tsx`
- Delete: `components/client-nav.tsx`

**Interfaces:**
- Produces: `export type ClientTab = "inicio" | "plano" | "receitas"`, `export function activeTab(pathname: string): ClientTab | null` (spec §5.2); `export function ClientShell({ children }: { children: React.ReactNode })`. As Tasks 3 e 4 usam `ClientShell`.

- [ ] **Step 1: Escrever os testes de `activeTab`**

```ts
import { describe, expect, it } from "vitest"
import { activeTab } from "@/lib/client/nav"

describe("activeTab", () => {
  it.each([
    ["/cliente/dashboard", "inicio"],
    ["/cliente/meu-plano", "plano"],
    ["/cliente/planos", "plano"],
    ["/cliente/planos/abc", "plano"],
    ["/cliente/planos/abc/renovar", "plano"],
    ["/cliente/receitas", "receitas"],
    ["/cliente/receitas/42", "receitas"],
    ["/cliente/meus-dados", null],
    ["/cliente/planosx", null],
    ["/cliente/receitas-antigas", null],
  ])("%s → %s", (path, tab) => {
    expect(activeTab(path)).toBe(tab)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm exec vitest run tests/lib/client/nav.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `activeTab` em `lib/client/nav.ts`**

Casa o caminho exato ou o prefixo seguido de `/` (por isso `/cliente/planosx` dá `null`).

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm exec vitest run tests/lib/client/nav.test.ts`
Expected: PASS (10 casos).

- [ ] **Step 5: Criar `components/client-shell.tsx`** (spec §5.1)

- `"use client"`. Busca `/api/auth/session` para o `UserMenu`, como o `ClientNav` faz hoje, agora com `showMyDataLink`.
- Itens: `{ tab: "inicio", href: "/cliente/dashboard", label: "Início", icon: Home }`, `{ tab: "plano", href: "/cliente/meu-plano", label: "Meu Plano", icon: UtensilsCrossed }`, `{ tab: "receitas", href: "/cliente/receitas", label: "Receitas", icon: BookOpen }`; ativo por `activeTab(usePathname())`.
- Wrapper: `<div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">`.
- Topo (`no-print`): logo (link para `/cliente/dashboard`) e avatar; os 3 itens no topo só com `hidden md:flex`. Altura menor no celular (`h-14 md:h-16`).
- Barra inferior (`no-print md:hidden`): `fixed inset-x-0 bottom-0 z-40 border-t bg-card`, `paddingBottom: env(safe-area-inset-bottom)`, grade de 3 colunas. Início e Receitas: ícone + rótulo, área de toque `min-h-11`. Meu Plano: círculo `h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg -mt-6` com o ícone, rótulo abaixo. Item ativo em `text-primary`, demais em `text-muted-foreground`; `aria-current="page"` no ativo; `<nav aria-label="Navegação principal">`.
- Em `app/layout.tsx`, `viewport` ganha `viewportFit: "cover"`.

- [ ] **Step 6: Trocar `ClientNav` por `ClientShell` nas 7 telas e apagar `components/client-nav.tsx`**

Em cada tela, o par `<div className="min-h-screen bg-background">` + `<ClientNav />` vira `<ClientShell>` (todas as ocorrências, inclusive os retornos de carregamento e de erro). O resto da tela não muda nesta task.

Run: `grep -rn "client-nav\|ClientNav" app components` 
Expected: nenhuma linha.

- [ ] **Step 7: Verificar tipos e build**

Run: `corepack pnpm typecheck && corepack pnpm build`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add lib/client/nav.ts tests/lib/client/nav.test.ts components/client-shell.tsx app/layout.tsx app/cliente components/client-nav.tsx
git commit -m "feat: menu inferior do paciente com Início, Meu Plano e Receitas"
```

---

### Task 3: Tela do plano com abas de opção e rota `/cliente/meu-plano`

**Files:**
- Create: `components/meal-plan-view.tsx`, `app/cliente/meu-plano/page.tsx`
- Modify: `app/cliente/planos/[id]/page.tsx`

**Interfaces:**
- Consumes: `mealOptions`, `MealOption` (Task 1); `ClientShell` (Task 2); `PlanExpirationAlert` (existente).
- Produces: `export type ClientMealPlan` (o tipo `MealPlan` que hoje está em `planos/[id]/page.tsx`, com `planData: { calories?: number; meals?: unknown; observations?: string }`) e `export function MealPlanView({ plan, backHref }: { plan: ClientMealPlan; backHref?: string })`.

- [ ] **Step 1: Criar `components/meal-plan-view.tsx`** (spec §6.2)

- Move para cá o corpo da tela de hoje: alerta (`variant="detail"`), card do cabeçalho, refeições, observações, "Baixar PDF" e o `<style jsx global>` de impressão. `backHref` presente: botão "Voltar" (`no-print`) para ele.
- Refeições: `Array.isArray(plan.planData?.meals) ? meals : []`; refeições com `mealOptions(meal).length === 0` não aparecem.
- `MealCard({ name, time, options })` no mesmo arquivo:
  - Cabeçalho "nome · horário" (sem " · " se `time` vazio).
  - `options.length > 1`: grupo `role="tablist"` (`no-print`) com botões `role="tab"`, `aria-selected`, rótulo `Opção ${i + 1}`, estilo de segmento (fundo `muted`, selecionado `bg-card shadow-sm text-foreground`). Estado local `useState(0)`, não salvo.
  - Na tela: só a opção selecionada (lista com o marcador de hoje) e, se `calories`, `~{calories} kcal` no rodapé do card (`text-sm text-muted-foreground`, alinhado à direita).
  - Na impressão: um bloco `hidden print:block` com todas as opções, cada uma com o título "Opção N" quando `options.length > 1`; o bloco de tela leva `print:hidden`.

- [ ] **Step 2: `app/cliente/planos/[id]/page.tsx` passa a usar `MealPlanView`**

Mantém a busca e os estados de carregamento e "não encontrado"; renderiza `<ClientShell><main …><MealPlanView plan={mealPlan} backHref="/cliente/dashboard" /></main></ClientShell>`. O link do "não encontrado" passa a ser "Voltar para o Início" (`/cliente/dashboard`).

- [ ] **Step 3: Criar `app/cliente/meu-plano/page.tsx`** (spec §6.3)

- `GET /api/client/meal-plans`; plano = `mealPlans.find(p => p.status === "active")`.
- Carregando: `Loader2` centralizado, como as outras telas.
- Com plano: `<MealPlanView plan={plano} />` (sem `backHref`: é aba).
- Sem plano: card com `FileText`, título "Você ainda não tem um plano ativo" e, se `mealPlans.length > 0`, `<PlanExpirationAlert plans={…} variant="list" />` com o mesmo mapeamento de `app/cliente/planos/page.tsx`.
- Erro (`!response.ok` ou exceção): card "Não foi possível carregar seu plano." com botão "Tentar de novo" que refaz a busca.

- [ ] **Step 4: Verificar tipos e build**

Run: `corepack pnpm typecheck && corepack pnpm build`
Expected: sem erros; `/cliente/meu-plano` aparece na lista de rotas do build.

- [ ] **Step 5: Commit**

```bash
git add components/meal-plan-view.tsx app/cliente/meu-plano/page.tsx "app/cliente/planos/[id]/page.tsx"
git commit -m "feat: Meu Plano abre o plano ativo e mostra as opções de cada refeição em abas"
```

---

### Task 4: Início refeito

**Files:**
- Create: `lib/client/expiry-label.ts`
- Test: `tests/lib/client/expiry-label.test.ts`
- Modify: `app/cliente/dashboard/page.tsx`

**Interfaces:**
- Consumes: `daysLeft(endDate, today)` de `lib/renewal/rules.ts`, `todayInSaoPaulo(now)` de `lib/time.ts`, `ClientShell` (Task 2).
- Produces: `export function expiryLabel(days: number | null): string | null`.

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from "vitest"
import { expiryLabel } from "@/lib/client/expiry-label"

describe("expiryLabel", () => {
  it.each([
    [12, "Vence em 12 dias"],
    [2, "Vence em 2 dias"],
    [1, "Vence em 1 dia"],
    [0, "Vence hoje"],
    [-1, "Vencido"],
    [-30, "Vencido"],
  ])("%d → %s", (days, label) => {
    expect(expiryLabel(days)).toBe(label)
  })
  it("sem data de fim → null", () => {
    expect(expiryLabel(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm exec vitest run tests/lib/client/expiry-label.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `expiryLabel` em `lib/client/expiry-label.ts`**

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm exec vitest run tests/lib/client/expiry-label.test.ts`
Expected: PASS (7 casos).

- [ ] **Step 5: Refazer `app/cliente/dashboard/page.tsx`** (spec §6.5)

Ordem: saudação → card do plano ativo → `PlanExpirationAlert` → atalho Receitas → Planos anteriores.
- Card do plano: aparece sempre que `activePlan` existe (sai o `hasActivePlanNotExpired`). Título, datas, `Badge` com `expiryLabel(daysLeft(activePlan.endDate, todayInSaoPaulo(new Date())))` quando não `null` (variante `destructive` para "Vencido" e "Vence hoje", `secondary` para as demais) e botão `w-full` "Abrir meu plano" → `/cliente/meu-plano`.
- Sem `activePlan`: o card vazio de hoje. `PlanExpirationAlert` (`variant="list"`) com `allPlans` sempre que `allPlans.length > 0`.
- Atalho: card-link para `/cliente/receitas` com `BookOpen`, "Receitas" e "Ver receitas".
- Planos anteriores: `recentPlans.filter(p => p.id !== activePlan?.id)`; se sobrar algum, card "Planos anteriores" com status (rótulos de `getStatusLabel`) e data de `created_at` em `dd/MM/yyyy`, e link "Ver todos" → `/cliente/planos`.
- Saem os 3 cards de estatística e o estado `stats` deixa de ser usado na tela (a API não muda). Imports que sobrarem saem.

- [ ] **Step 6: Verificar**

Run: `corepack pnpm typecheck && corepack pnpm test`
Expected: sem erros; todos os testes passam (os de MySQL podem aparecer como pulados).

- [ ] **Step 7: Commit**

```bash
git add lib/client/expiry-label.ts tests/lib/client/expiry-label.test.ts app/cliente/dashboard/page.tsx
git commit -m "feat: Início com o card do plano, receitas e planos anteriores no lugar das estatísticas"
```

---

### Task 5: Editor do admin preserva as substitutas

**Files:**
- Create: `lib/admin/meal-substitutes.ts`
- Test: `tests/lib/admin/meal-substitutes.test.ts`
- Modify: `app/admin/planos/[id]/editar/page.tsx`, `README.md`

**Interfaces:**
- Produces: `export type MealSubstitute = { foods: string; calories: string }`, `export function readSubstitutes(meal: unknown): MealSubstitute[]`, `export function toMealPayload(meal: { name: string; time: string; calories: string; foods: string; substitutes: MealSubstitute[] }): Record<string, unknown>`.

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from "vitest"
import { readSubstitutes, toMealPayload } from "@/lib/admin/meal-substitutes"

describe("readSubstitutes", () => {
  it("mantém as entradas com foods em texto não vazio, calorias como texto", () => {
    const meal = { substitutes: [{ foods: "Ovo — 1 un", calories: "300" }, { foods: "Pão — 50 g", calories: 280 }, { foods: " " }, null] }
    expect(readSubstitutes(meal)).toEqual([
      { foods: "Ovo — 1 un", calories: "300" },
      { foods: "Pão — 50 g", calories: "280" },
    ])
  })
  it("sem substitutes, ou não lista, ou refeição inválida → []", () => {
    expect(readSubstitutes({})).toEqual([])
    expect(readSubstitutes({ substitutes: "x" })).toEqual([])
    expect(readSubstitutes(null)).toEqual([])
  })
})

describe("toMealPayload", () => {
  const meal = { name: "Jantar", time: "19:00", calories: "450", foods: "Arroz — 100 g" }
  it("com substitutas, envia a chave intacta", () => {
    const substitutes = [{ foods: "Rap10 — 1 un", calories: "430" }]
    expect(toMealPayload({ ...meal, substitutes })).toEqual({ ...meal, substitutes })
  })
  it("sem substitutas, omite a chave", () => {
    expect(toMealPayload({ ...meal, substitutes: [] })).toEqual(meal)
    expect("substitutes" in toMealPayload({ ...meal, substitutes: [] })).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm exec vitest run tests/lib/admin/meal-substitutes.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `readSubstitutes` e `toMealPayload` em `lib/admin/meal-substitutes.ts`**

Calorias: texto fica como está; número finito vira `String(n)`; resto `""`.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm exec vitest run tests/lib/admin/meal-substitutes.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Usar no editor** (spec §7)

- `interface Meal` ganha `substitutes: MealSubstitute[]`; ao carregar, `substitutes: readSubstitutes(meal)`; `addMeal` e o fallback de refeição vazia usam `substitutes: []`; `updateMeal` aceita só os campos de texto (`field: "name" | "time" | "calories" | "foods"`).
- No `handleSubmit`, `meals: meals.map(toMealPayload)` (o `id` local não vai, como hoje).
- No card da refeição, abaixo de "Alimentos", quando `meal.substitutes.length > 0`: bloco `rounded-md border border-dashed bg-muted/40 p-3` com o rótulo "Substituição (gerada pela IA)", a lista de alimentos (uma linha por item) e `~{calories} kcal` quando houver. Sem campos de edição.

- [ ] **Step 6: README do PlanA**

- Seção 1, item **Cliente**: a navegação do paciente (Início, Meu Plano, Receitas no rodapé do celular) e as refeições com até uma substituta, exibidas em "Opção 1 | Opção 2".
- Seção 6, subseção nova **"Deploy das opções de substituição"**: o PlanA sobe **antes** do `v0-tami-forms` (o motivo da spec §9); sem migration nem variável nova; planos antigos ficam sem substitutas.
- Seção 10: links para o spec e para este plano.

- [ ] **Step 7: Verificar**

Run: `corepack pnpm typecheck && corepack pnpm test`
Expected: sem erros; testes passam.

- [ ] **Step 8: Commit**

```bash
git add lib/admin/meal-substitutes.ts tests/lib/admin/meal-substitutes.test.ts "app/admin/planos/[id]/editar/page.tsx" README.md
git commit -m "feat: editor do plano preserva e mostra as substituições geradas pela IA"
```

---

### Task 6: Conferência do PlanA no app

**Files:** nenhum, a não ser correções do que a conferência achar (cada correção no arquivo da task dona, com commit `fix: …`).

- [ ] **Step 1: Build de produção e testes**

Run: `corepack pnpm typecheck && corepack pnpm test && corepack pnpm build`
Expected: tudo verde.

- [ ] **Step 2: Rodar o app numa janela de celular (390 × 844) e conferir**

Com `corepack pnpm dev` e um paciente de teste no banco local, gravar no `plan_data` do plano ativo uma refeição com `substitutes` (um `UPDATE meal_plans SET plan_data = JSON_SET(...)` no banco de desenvolvimento) e conferir:
- barra inferior com 3 itens, "Meu Plano" central elevado, aba ativa correta em cada tela, conteúdo do fim da página não fica escondido atrás da barra;
- `md+` (1280 px): sem barra inferior, 3 itens no topo;
- Meu Plano: almoço sem botões; jantar com "Opção 1 | Opção 2", troca alimentos e kcal;
- impressão (pré-visualização do navegador): sem topo, sem barra, sem botões de opção, as duas opções do jantar listadas;
- Início: card com "Vence em …" e "Abrir meu plano"; com `end_date` no passado, "Vencido" e Meu Plano continua abrindo;
- avatar com "Meus dados" funcionando;
- admin: abrir o editor do plano, ver "Substituição (gerada pela IA)", salvar, recarregar e conferir no banco que `substitutes` continua lá.

Expected: todos os itens conferem.

---

### Task 7: `v0-tami-forms` — schema, validação e `toPlanData`

Trabalhar em `C:/Users/Tâmili/repo/v0-tami-forms`.

**Files:**
- Modify: `lib/meal-plan/plan.ts`, `lib/db/repos/types.ts` (`PlanData`, linha ~373)
- Test: `tests/lib/meal-plan/plan.test.ts`; fixtures de `GeneratedPlan` em outros testes (ver Step 1)

**Interfaces:**
- Produces: `GeneratedPlan` com `substitutes: { foods: string; calories: number }[]` em cada refeição (spec §4.1); `export function isLunch(name: string): boolean`; `PlanIssue` com `"substitutes_count" | "substitute_calories_mismatch"`; `PlanData.meals[]` com `substitutes?: { foods: string; calories: string }[]`.

- [ ] **Step 1: Criar a branch e atualizar as fixtures**

```bash
git checkout develop && git checkout -b feature/navegacao-mobile-substituicoes
```

Em `tests/lib/meal-plan/plan.test.ts`, o `valid` ganha substitutas válidas: Café (400) `[{ foods: "Crepioca — 1 ovo + 20 g de tapioca\nQueijo — 30 g (1 fatia)", calories: 390 }]`, Almoço `[]`, Lanche (250) `[{ foods: "Leite — 200 ml (1 copo)\nWhey — 30 g (1 scoop)", calories: 240 }]`, Jantar (400) `[{ foods: "Rap10 — 1 un\nCarne moída — 100 g", calories: 410 }]`. Os testes que montam refeições do zero (`meals_count`, "2 e 6 refeições") passam a usar nomes que não são almoço e `substitutes: [{ foods: "Ovo — 50 g (1 un)", calories }]` com a mesma caloria da refeição.

Run: `grep -rln "observations:" tests`
Nos arquivos listados fora de `plan.test.ts` (`anthropic-generator.test.ts`, `generate-plan.test.ts`, `run-jobs.test.ts` e os demais), todo plano gerado (`GeneratedPlan`, saída do gerador falso) que precisa **passar** na validação ganha as substitutas pela mesma regra. Fixtures de `PlanData` (repos, fakes, notificações) não mudam: a chave é opcional. O `pnpm test` completo do Step 5 é quem confirma que nenhuma ficou para trás.

- [ ] **Step 2: Escrever os testes novos**

```ts
describe("isLunch", () => {
  it.each(["Almoço", "ALMOÇO", "Almoco", "Almoço pós-treino"])("%s é almoço", (n) => expect(isLunch(n)).toBe(true))
  it.each(["Café da manhã", "Lanche da tarde", "Jantar", "Ceia", "Pré-treino"])("%s não é almoço", (n) => expect(isLunch(n)).toBe(false))
})

describe("validatePlan — substitutas", () => {
  const sub = (foods: string, calories: number) => [{ foods, calories }]
  it("almoço com substituta → substitutes_count", () => {
    expect(validatePlan(withMeal(1, { substitutes: sub("Arroz — 100 g", 600) }), targets)).toEqual(["substitutes_count"])
  })
  it("jantar sem substituta → substitutes_count", () => {
    expect(validatePlan(withMeal(3, { substitutes: [] }), targets)).toEqual(["substitutes_count"])
  })
  it("duas substitutas → substitutes_count", () => {
    const two = [...sub("Ovo — 1 un", 400), ...sub("Pão — 50 g", 400)]
    expect(validatePlan(withMeal(0, { substitutes: two }), targets)).toEqual(["substitutes_count"])
  })
  it("10% de diferença passa; 11% → substitute_calories_mismatch", () => {
    expect(validatePlan(withMeal(0, { substitutes: sub("Ovo — 1 un", 440) }), targets)).toEqual([])
    expect(validatePlan(withMeal(0, { substitutes: sub("Ovo — 1 un", 444) }), targets)).toEqual(["substitute_calories_mismatch"])
    expect(validatePlan(withMeal(0, { substitutes: sub("Ovo — 1 un", 356) }), targets)).toEqual(["substitute_calories_mismatch"])
  })
  it("linha da substituta sem quantidade → food_without_quantity", () => {
    expect(validatePlan(withMeal(0, { substitutes: sub("Ovo — 1 un\nQueijo", 400) }), targets)).toEqual(["food_without_quantity"])
  })
  it("substituta vazia ou com 0 kcal → meal_fields", () => {
    expect(validatePlan(withMeal(0, { substitutes: sub("  ", 400) }), targets)).toContain("meal_fields")
    expect(validatePlan(withMeal(0, { substitutes: sub("Ovo — 1 un", 0) }), targets)).toContain("meal_fields")
  })
  it("a soma do dia ignora as substitutas", () => {
    expect(validatePlan(withMeal(0, { substitutes: sub("Ovo — 1 un", 360) }), targets)).toEqual([])
  })
})

describe("toPlanData — substitutas", () => {
  it("normaliza a substituta e omite a chave no almoço", () => {
    const data = toPlanData(withMeal(0, { substitutes: [{ foods: " Ovo — 1 un \n\nPão — 50 g ", calories: 389.6 }] }))
    expect(data.meals[0].substitutes).toEqual([{ foods: "Ovo — 1 un\nPão — 50 g", calories: "390" }])
    expect("substitutes" in data.meals[1]).toBe(false)
  })
})
```

Ajustar também o teste existente de `toPlanData` (se compara o objeto inteiro) para incluir as substitutas do `valid`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm exec vitest run tests/lib/meal-plan/plan.test.ts`
Expected: FAIL (`isLunch` não existe; `substitutes` não é validado).

- [ ] **Step 4: Implementar em `lib/meal-plan/plan.ts` e `lib/db/repos/types.ts`**

- `generatedPlanSchema`: `substitutes: z.array(z.object({ foods: z.string(), calories: z.number() }))` em cada refeição (só tipos simples, como o comentário do arquivo pede).
- `isLunch`: `name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes("almoco")`.
- `validatePlan`, para cada refeição: quantidade esperada `isLunch(name) ? 0 : 1` (`substitutes_count`); cada substituta entra em `meal_fields` (foods não vazio, calories finito > 0), em `food_without_quantity` (mesmo `foodLines`/`hasQuantity`) e em `substitute_calories_mismatch` com a aritmética da spec §4.3 (negada, como `meals_sum_mismatch`, para pegar `NaN`). A soma do dia não muda.
- `toPlanData`: `substitutes` normalizadas como a principal; chave só quando a lista não está vazia.
- `PlanData`: `substitutes?: { foods: string; calories: string }[]` em cada refeição.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm exec vitest run tests/lib/meal-plan && corepack pnpm typecheck && corepack pnpm test`
Expected: PASS em tudo; sem erro de tipo.

- [ ] **Step 6: Commit**

```bash
git add lib/meal-plan/plan.ts lib/db/repos/types.ts tests
git commit -m "feat: plano da IA com uma substituta por refeição, menos no almoço, validada em código"
```

---

### Task 8: `v0-tami-forms` — prompt e README

**Files:**
- Modify: `lib/meal-plan/prompt.ts`, `tests/lib/meal-plan/prompt.test.ts`, `README.md`

**Interfaces:**
- Consumes: a regra da Task 7 (o texto do prompt tem que bater com `validatePlan`).

- [ ] **Step 1: Escrever o teste**

Em `prompt.test.ts`, dentro de `describe("SYSTEM_PROMPT")`:

```ts
it("pede uma substituta por refeição, menos no almoço", () => {
  expect(SYSTEM_PROMPT).toContain("# Opções de substituição")
  expect(SYSTEM_PROMPT).toContain("exatamente 1 opção de substituição")
  expect(SYSTEM_PROMPT).toContain("O almoço não tem substituição")
  expect(SYSTEM_PROMPT).toContain("no máximo 10%")
  expect(SYSTEM_PROMPT.indexOf("# Opções de substituição")).toBeLessThan(SYSTEM_PROMPT.indexOf("# Formato obrigatório de saída"))
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm exec vitest run tests/lib/meal-plan/prompt.test.ts`
Expected: FAIL no teste novo.

- [ ] **Step 3: Acrescentar a seção ao `SYSTEM_PROMPT`**

Logo antes de `# Formato obrigatório de saída`, separada por `---` como as outras:

```
# Opções de substituição

Toda refeição tem uma opção principal e exatamente 1 opção de substituição, no campo substitutes. O almoço não tem substituição: nele, substitutes fica vazio.

- A substituição é uma refeição completa e diferente da principal, que o paciente come no lugar dela.
- Os alimentos da substituição seguem as mesmas regras do campo foods: nome, quantidade em gramas (g) ou unidades (un), medida caseira e um alimento por linha.
- Priorize os alimentos da seção "Priorização de alimentos por refeição".
- As calorias da substituição ficam próximas das da principal, com no máximo 10% de diferença.
- O total de calorias do plano é a soma das opções principais; as substituições não entram na soma.
```

O comentário do topo do arquivo passa a dizer que o texto parte do fluxo n8n "Criar Dieta", com a seção "Opções de substituição" acrescentada neste repositório. Os testes existentes do prompt (início, fim com "Café sem açúcar — 200 ml") continuam passando sem mudança.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm exec vitest run tests/lib/meal-plan/prompt.test.ts && corepack pnpm typecheck && corepack pnpm test`
Expected: PASS.

- [ ] **Step 5: README do `v0-tami-forms`**

Na seção "Integração com o PlanA": `plan_data.meals[].substitutes` (opcional; uma substituta em toda refeição menos o almoço; calorias a até 10% da principal; validado em `validatePlan`) e a ordem de deploy: **PlanA antes**, com o motivo da spec §9.

- [ ] **Step 6: Commit**

```bash
git add lib/meal-plan/prompt.ts tests/lib/meal-plan/prompt.test.ts README.md
git commit -m "feat: prompt pede uma substituta por refeição, menos no almoço"
```
