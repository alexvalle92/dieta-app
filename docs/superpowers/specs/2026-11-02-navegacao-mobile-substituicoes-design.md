# Navegação para celular e opções de substituição nas refeições

**Data:** 2026-11-02
**Branch:** `feature/navegacao-mobile-substituicoes` (no `dieta-app` e no `v0-tami-forms`)
**Status:** design aprovado em conversa; aguardando revisão do spec

## 1. Contexto e objetivo

O paciente usa o PlanA quase sempre pelo celular, como PWA instalado (`display: standalone`). Hoje:

- A navegação é uma barra no topo com **Início**, **Meus Planos** e **Receitas**. O avatar abre Alterar senha e Sair; "Meus dados" existe, mas está escondido (`showMyDataLink={false}`).
- Ver o plano do dia, a tarefa mais frequente, leva 2 a 3 toques (Meus Planos → card → "Ver detalhes do plano").
- "Meus Planos" lista planos anteriores que não abrem (botão "Plano Inativo" desabilitado). O repositório garante um único plano `active` por paciente.
- O Início mostra três cards de estatística (total de planos, última atualização, receitas disponíveis) que não ajudam o paciente a decidir nada.
- Cada refeição de `plan_data.meals` é `{ name, time, foods, calories }`, com `foods` em texto, um alimento por linha. Não há como oferecer uma alternativa à refeição.
- O `plan_data` é gerado pela IA no `v0-tami-forms` (`lib/meal-plan/plan.ts`) e só exibido e editado no PlanA.

**Objetivo:**

1. Uma navegação pensada para o celular, com o plano alimentar a 1 toque.
2. Refeições com uma opção principal e, conforme o tipo de refeição, uma substituta, geradas pela IA e exibidas ao paciente.

### Restrições

- Não há migration: `plan_data` já é JSON. O formato novo é aditivo e planos antigos continuam válidos.
- Só a IA gera substitutas. O admin não as edita neste ciclo, mas o editor não pode apagá-las.
- A tela usa os componentes que o PlanA já tem (`components/ui/*`, `lucide-react`, `sonner`).

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Menu | 3 abas no rodapé (celular): **Início**, **Meu Plano** (central, destacado), **Receitas**. Topo fino com logo e avatar |
| Avatar | Meus dados (passa a aparecer), Alterar senha, Sair |
| Meu Plano | Rota nova `/cliente/meu-plano`, que abre direto o plano ativo |
| Meus Planos | Sai do menu. A lista `/cliente/planos` continua, acessada por "Ver todos" no Início |
| Computador (`md+`) | As mesmas 3 opções no topo; sem barra inferior |
| Quem gera substitutas | Só a IA (`v0-tami-forms`) |
| Regra de substitutas | **Almoço: 0. Toda outra refeição (café da manhã, lanches, jantar, ceia etc.): exatamente 1** |
| Calorias da substituta | No máximo 10% de diferença em relação à principal |
| Exibição | Botões "Opção 1 \| Opção 2" dentro do card da refeição, uma opção por vez. Refeição sem substituta não mostra os botões. No PDF, as opções saem uma abaixo da outra |
| Início | Sai o bloco de estatísticas. Entram card do plano com "Abrir meu plano", alerta de renovação, atalho para Receitas e "Planos anteriores" |
| Admin | O editor preserva as substitutas e as mostra só para leitura |

### Fora de escopo

- Editar, criar ou remover substitutas no admin.
- Substitutas em planos criados à mão em `/admin/planos/novo`.
- Mais de uma substituta por refeição.
- Abrir planos anteriores (continuam como hoje).
- Mudanças nas telas de receitas, renovação e Meus dados além da navegação nova.
- Regerar com substitutas os planos que já existem.

## 3. Formato de `plan_data`

```json
{
  "calories": 1600,
  "observations": "…",
  "meals": [
    {
      "name": "Café da manhã",
      "time": "07:00",
      "foods": "Pão francês — 25 g (1/2 unidade)\nOvos mexidos — 100 g (2 unidades)",
      "calories": "350",
      "substitutes": [
        { "foods": "Crepioca — 1 ovo + 20 g de tapioca\nMussarela — 20 g (1 fatia)", "calories": "340" }
      ]
    },
    { "name": "Almoço", "time": "12:00", "foods": "…", "calories": "500" }
  ]
}
```

- A opção principal continua em `foods` e `calories`, como hoje. Quem ignora `substitutes` vê exatamente o plano de hoje.
- `name` e `time` valem para a principal e para as substitutas.
- `substitutes` é **opcional**. Ausente equivale a lista vazia. `toPlanData` omite a chave quando a refeição não tem substituta.
- Cada substituta tem `foods` (um alimento por linha, mesmas regras da principal) e `calories` (texto inteiro, como na principal).
- `calories` do plano continua sendo a soma das **principais**.

## 4. `v0-tami-forms`: geração e validação

### 4.1 Schema da saída estruturada (`lib/meal-plan/plan.ts`)

```ts
export type GeneratedPlan = {
  meals: {
    name: string
    time: string
    foods: string
    calories: number
    substitutes: { foods: string; calories: number }[]
  }[]
  calories: number
  observations: string
}
```

`substitutes` é obrigatório no schema da saída (a IA sempre o envia; vazio no almoço). O schema segue só com tipos simples; as faixas ficam em `validatePlan`.

`PlanData` (`lib/db/repos/types.ts`) ganha `substitutes?: { foods: string; calories: string }[]` em cada refeição.

### 4.2 Classificação da refeição

`isLunch(name)`: o nome, sem acentos e em minúsculas, contém `almoco`. Exemplos: "Almoço" e "ALMOÇO" são almoço; "Café da manhã", "Lanche da tarde", "Jantar", "Ceia" e "Pré-treino" não são.

Quantidade esperada de substitutas: `isLunch(name) ? 0 : 1`.

### 4.3 `validatePlan`

Issues novas:

| Issue | Quando |
|---|---|
| `substitutes_count` | A refeição não tem a quantidade esperada de substitutas (seção 4.2) |
| `substitute_calories_mismatch` | Alguma substituta tem calorias com mais de 10% de diferença em relação à principal (aritmética inteira: `|sub − principal| · 10 > principal`; valor não finito também conta) |

Issues que passam a valer também para as substitutas:

- `meal_fields`: `foods` da substituta não vazio e `calories` finito e maior que zero.
- `food_without_quantity`: toda linha de `foods` da substituta com número ou "à vontade".

Inalterado: `meals_sum_mismatch` e `calories_out_of_range` usam só as principais. Um plano com issue continua sendo `PlanGenerationError` temporário e é gerado de novo até `MAX_PLAN_ATTEMPTS`.

### 4.4 `toPlanData`

Cada substituta é normalizada como a principal: `foodLines(foods).join("\n")` e `String(Math.round(calories))`. Lista vazia resulta na chave omitida.

### 4.5 Prompt (`lib/meal-plan/prompt.ts`)

Uma seção nova, **"Opções de substituição"**, antes de "Formato obrigatório de saída":

- Toda refeição tem uma opção principal e **exatamente 1 opção de substituição**, **menos o almoço, que não tem substituição** (`substitutes` vazio).
- A substituta deve ser uma refeição completa e diferente da principal, que o paciente come **no lugar** dela.
- A substituta segue as mesmas regras de `foods` (nome, quantidade, medida caseira, um alimento por linha) e prioriza os alimentos da seção "Priorização de alimentos por refeição".
- As calorias da substituta ficam próximas das da principal (no máximo 10% de diferença).
- O total de calorias do plano é a soma das opções principais.

O comentário do topo do arquivo deixa de dizer "sem alterações": passa a registrar que o texto parte do fluxo n8n "Criar Dieta" com a seção de substituições acrescentada.

`MAX_TOKENS` do gerador é 16000, o que comporta a saída maior; não muda.

## 5. PlanA: navegação

### 5.1 `ClientShell` (`components/client-shell.tsx`)

Substitui o `<ClientNav />` nas telas do paciente que o usam hoje (`dashboard`, `planos`, `planos/[id]`, `planos/[id]/renovar`, `receitas`, `receitas/[id]`, `meus-dados`) e é usado pela tela nova `meu-plano`. Envolve o conteúdo da página:

```tsx
<ClientShell>
  <main>…</main>
</ClientShell>
```

- **Topo:** logo (link para Início) e `UserMenu` com `showMyDataLink`. No `md+`, as 3 opções de navegação também ficam no topo, como hoje.
- **Barra inferior (só `< md`):** fixa no rodapé, 3 itens. "Meu Plano" é um botão circular central, elevado acima da barra, na cor primária. Início e Receitas são ícone e rótulo. O item ativo usa a cor primária; os outros, `muted-foreground`. Alvos de toque de pelo menos 44 px.
- **Área segura:** a barra soma `env(safe-area-inset-bottom)` ao padding inferior, e o conteúdo ganha um espaço inferior da altura da barra para não ficar coberto. O `viewport` de `app/layout.tsx` ganha `viewportFit: "cover"`.
- **Impressão:** topo e barra inferior não aparecem (`no-print`).

`components/client-nav.tsx` é removido quando nenhuma tela o usar mais.

### 5.2 Aba ativa (`lib/client/nav.ts`)

```ts
export type ClientTab = "inicio" | "plano" | "receitas"
export function activeTab(pathname: string): ClientTab | null
```

| Caminho | Aba |
|---|---|
| `/cliente/dashboard` | `inicio` |
| `/cliente/meu-plano`, `/cliente/planos`, `/cliente/planos/...` | `plano` |
| `/cliente/receitas`, `/cliente/receitas/...` | `receitas` |
| outros (ex.: `/cliente/meus-dados`) | `null` |

## 6. PlanA: telas

### 6.1 Opções da refeição (`lib/meal-plan/options.ts`)

```ts
export type MealOption = { foods: string[]; calories: string | null }
export function mealOptions(meal: unknown): MealOption[]
```

- Devolve `[principal, ...substitutas]`. A principal vem de `meal.foods` e `meal.calories`.
- `foods` vira lista de linhas sem as vazias (e com `trim`).
- Substituta que não é objeto, ou sem `foods` em texto com pelo menos uma linha, é ignorada. `substitutes` que não é lista é tratado como vazio.
- `calories` vazio ou que não é texto nem número vira `null` (a tela não mostra kcal).

### 6.2 `MealPlanView` (`components/meal-plan-view.tsx`)

O corpo atual de `/cliente/planos/[id]` (cabeçalho do plano, alerta de vencimento, refeições, observações, botão "Baixar PDF" e estilo de impressão) vira um componente que recebe o plano. Usado por `/cliente/planos/[id]` e por `/cliente/meu-plano`.

Card de refeição (`MealCard`):

- Cabeçalho: **nome · horário** (o horário some se vazio).
- Com mais de uma opção: um grupo de botões "Opção 1", "Opção 2" (`role="tablist"`, cada botão `role="tab"` com `aria-selected`). Começa na Opção 1. Um toque troca a lista de alimentos e as kcal mostradas. A escolha não é salva.
- Com uma opção: sem botões; mostra a lista como hoje.
- kcal da opção visível, quando houver, no rodapé do card ("~350 kcal").
- Na impressão: os botões somem e todas as opções aparecem, uma abaixo da outra, cada uma com o título "Opção N".

### 6.3 `/cliente/meu-plano` (nova)

- Busca `GET /api/client/meal-plans` (já devolve `planData`) e usa o plano com `status === "active"`.
- Com plano ativo: `MealPlanView`.
- Sem plano ativo: card "Você ainda não tem um plano ativo" e, se houver planos, o `PlanExpirationAlert` (variante `list`) com eles.
- Erro na busca: mensagem de erro com botão "Tentar de novo".

### 6.4 `/cliente/planos/[id]`

Passa a usar `MealPlanView`. O botão "Voltar" leva para o Início.

### 6.5 Início (`/cliente/dashboard`)

De cima para baixo:

1. "Olá, {primeiro nome}!"
2. **Plano ativo:** card com título, datas de início e fim, "Vence em X dias", "Vence hoje" ou "Vencido", e o botão principal **"Abrir meu plano"** (para `/cliente/meu-plano`). Os dias vêm de `daysLeft(endDate, todayInSaoPaulo(new Date()))` (`lib/renewal/rules.ts` e `lib/time.ts`), a mesma regra do alerta: `> 0` "Vence em X dias" (1 dia no singular), `0` "Vence hoje", `< 0` "Vencido"; sem `endDate`, nada. Sem plano ativo: o card vazio de hoje.
3. `PlanExpirationAlert`, como hoje.
4. Atalho **Receitas** (card com ícone e "Ver receitas").
5. **Planos anteriores:** até 3 (`recentPlans` da API) com status e data de criação, e o link "Ver todos" para `/cliente/planos`. A seção não aparece se não houver planos além do ativo.

Saem os cards "Total de Planos", "Última Atualização" e "Receitas disponíveis". A API `dashboard-stats` não muda.

O plano ativo vencido continua `active` (README, "Vencimento e renovação"). O card do Início passa a mostrá-lo como "Vencido", em vez de escondê-lo como hoje.

## 7. PlanA: editor do admin

`/admin/planos/[id]/editar`:

- O estado de cada refeição guarda `substitutes` como vieram do banco (passando por uma função pura em `lib/admin/meal-substitutes.ts` que mantém só as entradas com `foods` em texto).
- Ao salvar, cada refeição vai com `substitutes` quando houver; sem substitutas, a chave não é enviada.
- No card da refeição, abaixo de "Alimentos": bloco só de leitura **"Substituição (gerada pela IA)"**, com os alimentos e as kcal.
- Remover a refeição remove a substituta dela.

`/admin/planos/novo` e `parsePlanFields` não mudam (`plan_data` já aceita qualquer objeto).

## 8. Testes

**`v0-tami-forms`** (`tests/lib/meal-plan/plan.test.ts`, `prompt.test.ts`):

- Plano válido com substituta em todas as refeições menos o almoço: sem issues.
- Almoço com 1 substituta e jantar sem substituta: `substitutes_count`.
- Substituta com 11% a mais de calorias: `substitute_calories_mismatch`; com 10%: sem issue.
- Linha de substituta sem quantidade: `food_without_quantity`. Substituta com `foods` vazio ou calorias 0: `meal_fields`.
- Soma do dia ignora as substitutas.
- `isLunch` com e sem acento e em maiúsculas.
- `toPlanData`: substituta normalizada; almoço sem a chave `substitutes`.
- Prompt contém a seção "Opções de substituição".

**PlanA:**

- `mealOptions`: sem `substitutes`; com 1; com entradas malformadas; `substitutes` que não é lista; calorias numéricas e vazias.
- `activeTab`: cada linha da tabela da seção 5.2.
- Função do editor que preserva as substitutas.
- `pnpm typecheck`, `pnpm test` e `pnpm build`.
- O Vitest roda em ambiente `node`, sem testes de componente: a tela é conferida rodando o app numa janela de celular (Início, Meu Plano com e sem substituta, troca de opção, Receitas, impressão).

## 9. Deploy

1. **PlanA primeiro.** Ele lê o campo opcional e o editor preserva as substitutas. Se a IA gerasse substitutas antes, o paciente não as veria e um admin que salvasse o plano as apagaria.
2. Depois o `v0-tami-forms`.

Não há migration nem variável de ambiente nova. Os planos que já existem continuam sem substitutas; só os gerados depois do deploy do `v0-tami-forms` as têm. Os READMEs dos dois apps registram a ordem.
