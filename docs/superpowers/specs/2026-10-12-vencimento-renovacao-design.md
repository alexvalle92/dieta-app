# Vencimento e renovação do plano alimentar

**Data:** 2026-10-12
**Branch:** `feature/vencimento-renovacao` (nos dois repositórios)
**Status:** aguardando revisão do spec

## 1. Contexto e objetivo

Este é o segundo dos dois ciclos anunciados em `2026-10-12-plana-mysql-design.md`. O primeiro pôs o PlanA (`dieta-app`) sobre o MySQL do `v0-tami-forms`.

O plano alimentar vale 30 dias. Hoje, quando ele chega ao fim:

- o PlanA mostra um alerta na tela (`components/plan-expiration-alert.tsx`), mas os botões "Preencher Formulário" e "Atualizar Dados" apontam para `/cliente/planos/[id]/renovar`, que não existe, e um dos botões "Efetuar Pagamento" aponta para `/cliente/planos/[id]/pagamento`, que também não existe;
- nenhuma mensagem avisa o paciente;
- as colunas `meal_plans.due_date_new_meal_plan` e `payment_url_new_meal_plan`, que o alerta lê, nunca são preenchidas.

O que já funciona e é reaproveitado: uma cobrança paga de quem já é paciente gera um plano novo, conclui o anterior e envia a mensagem "Plano novo disponível" (spec `2026-10-11-webhook-asaas-plano-alimentar-design.md` do `v0-tami-forms`).

**Objetivo deste ciclo:** o paciente é avisado por tela, e-mail e WhatsApp de que o plano está acabando, atualiza seus dados num formulário dentro do PlanA, paga e recebe o plano novo, sem intervenção manual.

### Restrições

As mesmas do primeiro ciclo:

- Toda tabela é criada e alterada pelas migrations do `v0-tami-forms`. O PlanA só lê e grava.
- O PlanA nunca fala com Asaas, SMTP, Evolution ou Anthropic. Quem cria cobrança e envia mensagem é o `v0-tami-forms`.
- As telas existentes não mudam de layout. A tela nova usa os componentes que o PlanA já tem.
- Deploy por Git no Easypanel, sem serviço novo de infraestrutura.

## 2. Decisões tomadas

A coluna "Origem" separa o que já estava decidido do que este spec propõe. As propostas são o que mais vale conferir na revisão.

| Tema | Decisão | Origem |
|---|---|---|
| Momentos do aviso | 5 dias, 2 dias e no dia do vencimento | os estados que o alerta da tela já tem |
| Abertura do formulário | A partir de 2 dias antes do vencimento, e depois dele | textos do alerta da tela |
| Canais | Tela, e-mail e WhatsApp | spec do primeiro ciclo |
| Onde fica o formulário | No PlanA, com o paciente logado | rota que o alerta já usa |
| Perguntas do formulário | As 16 respostas do quiz que alimentam a IA, numa página só, já preenchidas com as últimas respostas; peso atual e meta de peso sempre em branco | proposta |
| Quem cria a cobrança | O `v0-tami-forms`, num endpoint interno chamado pelo PlanA | regra do primeiro ciclo |
| Valor da renovação | O mesmo `PAYMENT_AMOUNT` do quiz | proposta |
| Estado da renovação | Lido da tabela `payments` a cada consulta; as duas colunas de `meal_plans` são removidas | proposta |
| Depois do pagamento | Fluxo atual: plano novo `active` com início no dia da geração e 30 dias de validade; o anterior vira `completed` | spec do webhook |
| Horário dos avisos | Entre 9h e 20h de São Paulo | proposta |
| Aviso depois de vencido | Não há mensagem; só o alerta da tela | proposta |
| Página `/pagamento` | Não é criada; o botão passa a abrir o link de pagamento | proposta |
| Git | Commits locais na branch `feature/vencimento-renovacao` dos dois repositórios, sem `push` | regra do primeiro ciclo |

### Fora de escopo

- Mudar o status de um plano vencido. Ele continua `active` até ser substituído, e o paciente continua vendo o conteúdo.
- Valor, cupom ou forma de pagamento diferente na renovação.
- Fazer o plano novo começar só quando o anterior terminar. Quem renova 2 dias antes troca de plano 2 dias antes.
- Opção de o paciente parar de receber os avisos.
- Telas de admin para renovações. As mensagens e cobranças novas já aparecem em `/admin/pacientes/[id]`.

## 3. Visão geral

```
dia -5      dia -2                 dia 0         depois
  │           │                      │              │
  aviso       aviso + formulário     aviso          só o alerta da tela
              aberto ───────────────────────────────────────────>

PlanA                               v0-tami-forms                Asaas
  │ formulário de renovação            │                           │
  ├── POST /api/renewals ─────────────>│ grava envio e cobrança    │
  │                                    ├── cria a cobrança ───────>│
  │<── link de pagamento ──────────────┤                           │
  │                                    │<── webhook: pago ─────────┤
  │                                    │ gera o plano, conclui o   │
  │                                    │ anterior, avisa o paciente│
  │ lê o plano novo                    │                           │
                                       │
                                       │ job de 2 min: enfileira e envia os avisos de vencimento
```

## 4. Estado da renovação

Uma regra só, usada pela tela do PlanA e pelos avisos do `v0-tami-forms`.

A **cobrança de renovação** do plano ativo `P` de um paciente é a cobrança mais recente desse paciente com `created_at` posterior ao `created_at` de `P`. A cobrança que gerou `P` fica de fora, porque foi criada antes dele.

| Situação da cobrança de renovação | Estado | Vencimento e link |
|---|---|---|
| `paid_at` preenchido | `paid` | não se aplicam |
| `PENDING_ASAAS` | `awaiting_payment` | nulos: o link ainda está sendo criado |
| `PENDING` com `due_date` de hoje em diante | `awaiting_payment` | `due_date` e `payment_url` |
| `PENDING` com `due_date` anterior a hoje, ou `OVERDUE` | `payment_expired` | `due_date` |
| Não existe, ou qualquer outro status (`DELETED`, `ASAAS_FAILED`) | `none` | não se aplicam |

As linhas são avaliadas nessa ordem. "Hoje" é a data no fuso `America/Sao_Paulo`. Plano que não é o ativo do paciente está sempre em `none`.

`paid` cobre os minutos entre o pagamento e a geração do plano novo, e o caso em que a geração falhou. Nesse estado o paciente não vê pedido de pagamento nem consegue enviar o formulário de novo, o que evita uma segunda cobrança.

**Dias restantes** de um plano: `end_date` menos hoje. A partir deles:

| Dias restantes | Estágio | Formulário |
|---|---|---|
| mais de 5, ou `end_date` nulo | nenhum | fechado |
| 3 a 5 | `d5` | fechado |
| 1 e 2 | `d2` | aberto |
| 0 | `d0` | aberto |
| negativo | vencido | aberto |

## 5. Banco de dados (repositório `v0-tami-forms`)

Uma migration nova, `0003`, gerada pelo `drizzle-kit` a partir de `lib/db/schema.ts`.

| Tabela | Mudança |
|---|---|
| `notifications` | coluna nova `meal_plan_id` CHAR(36) NULL, FK → `meal_plans` |
| `notifications` | chave única nova `(meal_plan_id, channel, kind)` |
| `meal_plans` | saem `due_date_new_meal_plan` e `payment_url_new_meal_plan` |
| `meal_plans` | índice novo `(status, end_date)` |

- `notifications.kind` é VARCHAR e ganha `plan_expiring_d5`, `plan_expiring_d2` e `plan_expiring_d0`.
- A chave única nova garante um aviso por plano, canal e estágio. Nas mensagens sem plano, `meal_plan_id` é nulo e a chave não se aplica.
- O PlanA atualiza a cópia do schema com `pnpm db:sync-schema`.

## 6. Avisos por e-mail e WhatsApp (`v0-tami-forms`)

### 6.1 Enfileiramento

A rodada do job ganha um passo, entre as gerações de plano e o envio de notificações. Assim o aviso criado numa rodada sai na mesma rodada.

1. Se a hora em São Paulo é anterior às 9h00 ou é 20h00 em diante, o passo não faz nada.
2. Para cada plano `active` com 0 a 5 dias restantes:
   1. calcula o estágio (seção 4);
   2. lê o estado da renovação. Se é `paid`, pula o plano;
   3. para cada canal ativo, insere a notificação do estágio com `INSERT IGNORE`: `patient_id`, `meal_plan_id`, `status = 'pending'`, `next_attempt_at` = agora, e `payment_id` = a cobrança de renovação quando o estágio é `d2` ou `d0` e o estado é `awaiting_payment` com link. Nos outros casos `payment_id` fica nulo.
3. Registra o log `job.reminders.enqueued` com a quantidade criada.

Consequências dessa regra:

- Cada estágio é enviado uma vez por plano, na primeira rodada em que o plano está nele. Se o app ficou fora do ar no dia -5, o aviso sai no dia -4 ou -3.
- Um estágio que passou inteiro com o app parado não é enviado depois.
- No primeiro deploy, todo plano ativo que já está dentro de um estágio recebe o aviso desse estágio.
- Se o admin alterar o `end_date` de um plano, os estágios já avisados não se repetem.
- Plano criado à mão pelo admin também recebe os avisos.
- Paciente sem telefone (o admin pode cadastrar assim) recebe só o e-mail: nenhuma linha de WhatsApp é criada para ele.

### 6.2 Texto

O texto é montado no envio. A data é o `end_date` do plano, em `dd/mm/aaaa`. Há duas variantes nos estágios `d2` e `d0`: **formulário**, quando a notificação não tem cobrança, e **pagamento**, quando tem.

- Link do formulário: `<PLANA_APP_URL>/cliente/planos/<id do plano>/renovar`.
- Link de pagamento: `payment_url` da cobrança.

**`plan_expiring_d5`**. Título: `Seu plano alimentar está acabando`

```
Olá {nome}! 👋 <br>Seu <strong>Plano Alimentar</strong> vence em <strong>{data}</strong>. <br><br>
Em breve vamos liberar um formulário rápido de atualização para ajustar seu próximo plano. Avisaremos assim que ele estiver disponível. 💚
```

**`plan_expiring_d2`**. Título: `Faltam poucos dias para o seu plano vencer`

Formulário:

```
Olá {nome}! 👋 <br>Seu <strong>Plano Alimentar</strong> vence em <strong>{data}</strong>. <br><br>
O formulário de atualização já está disponível e leva menos de 3 minutos. Depois de preencher, é só concluir o pagamento para liberar seu novo plano: <br>
{link do formulário}
```

Pagamento:

```
Olá {nome}! 👋 <br>Seu <strong>Plano Alimentar</strong> vence em <strong>{data}</strong>. <br><br>
Você já preencheu o formulário de atualização. Para liberar seu novo plano, efetue o pagamento pelo link abaixo: <br>
{link de pagamento}
```

**`plan_expiring_d0`**. Título: `Seu plano alimentar vence hoje`

Formulário:

```
Olá {nome}! 👋 <br>Seu <strong>Plano Alimentar</strong> vence <strong>hoje</strong>. <br><br>
Para receber um novo plano atualizado, preencha o formulário de atualização (leva menos de 3 minutos) e conclua o pagamento: <br>
{link do formulário}
```

Pagamento:

```
Olá {nome}! 👋 <br>Seu <strong>Plano Alimentar</strong> vence <strong>hoje</strong>. <br><br>
Você já preencheu o formulário de atualização. Para liberar seu novo plano, efetue o pagamento pelo link abaixo: <br>
{link de pagamento}
```

O envio segue as regras atuais: nome escapado, e-mail em HTML e texto puro, WhatsApp dividido a cada `<br><br>`, tentativas, backoff, alerta ao admin e reabertura por `/api/jobs/retry`. Notificação de vencimento sem plano ligado é falha definitiva.

### 6.3 Link de pagamento da renovação

A mensagem `payment_link` de hoje fala em "cadastro" e promete "informações de acesso", o que não serve para quem já é paciente. No envio, se o paciente já tem `password_hash`, o texto passa a ser este. A regra vale também para o paciente que refaz o quiz público.

Título: `Recebemos sua atualização! Falta só o pagamento`

```
Olá {nome}! 👋 <br>Recebemos a atualização dos seus dados. 🎉 <br><br>
Para liberar seu <strong>novo Plano Alimentar Personalizado</strong>, efetue o pagamento pelo link abaixo: <br>
{link} <br><br>
Assim que o pagamento for confirmado, seu novo plano aparece no PlanA. É só entrar com seu CPF e a senha que você já usa. 💚
```

## 7. Endpoint de renovação (`POST /api/renewals`, no `v0-tami-forms`)

- Autenticação: `Authorization: Bearer <JOBS_TOKEN>`. Sem token ou token errado → `401`.
- Corpo: o mesmo de `/api/submit-quiz`, `{ submissionId, answers }`, com `nome_completo`, `email`, `whatsapp` e `cpf` dentro de `answers`. Limite de 64 KB. Fora do formato → `400`.
- Usa a mesma validação (`parseSubmitRequest`) e o mesmo serviço (`submitQuiz`) do quiz. Valem, portanto, as regras de hoje: idempotência por `submissionId`, reaproveitamento da cobrança pendente, criação da cobrança no Asaas dentro do pedido (até 20 s) e mensagem de link de pagamento por e-mail e WhatsApp.
- Não tem limite por IP: quem chama é o PlanA.
- Diferente do quiz, aceita `whatsapp` vazio: o paciente cadastrado pelo admin sem telefone renova normalmente e recebe o link de pagamento só por e-mail. A cobrança no Asaas é criada sem telefone.
- Respostas: `200 { ok: true, paymentUrl }`, com `paymentUrl` nulo quando os dados foram gravados mas o link ainda não saiu (o job conclui); `500 { ok: false }` quando nada foi gravado.
- Depois da resposta, envia as notificações do envio, como o quiz faz.

Nenhuma variável de ambiente nova.

## 8. PlanA: formulário de renovação

### 8.1 Tela `/cliente/planos/[id]/renovar`

Uma página, com os cartões e botões que o PlanA já usa, em quatro blocos:

| Bloco | Campos |
|---|---|
| Sobre você | `faixa_etaria`, `sexo_biologico`, `altura_cm`, `tipo_fisico`, `peso_comportamento` |
| Peso | `peso_kg`, `meta_peso_30d` |
| Refeições | `breakfast_foods`, `almoco`, `lanche_tarde`, `jantar`, `sobremesa` |
| Rotina | `rotina_dia`, `sono`, `agua`, `habitos` |

- As perguntas e as opções são as do quiz, sem as imagens e sem as telas de apresentação. Elas ficam em `lib/renewal/questions.ts`, copiadas de `v0-tami-forms/app/page.tsx`.
- Escolha única: `faixa_etaria`, `sexo_biologico`, `tipo_fisico`, `peso_comportamento`, `sobremesa`, `rotina_dia`, `sono`, `agua`. Escolha múltipla, com pelo menos uma opção: `breakfast_foods`, `almoco`, `lanche_tarde`, `jantar`, `habitos`. Número: `altura_cm` (120 a 230), `peso_kg` e `meta_peso_30d` (30 a 300).
- A tela abre preenchida com o envio mais recente do paciente em `quiz_responses`. `peso_kg` e `meta_peso_30d` abrem sempre em branco. Resposta antiga que não está mais entre as opções é descartada. Paciente sem envio (criado pelo admin) vê tudo em branco.
- Todos os campos são obrigatórios.

Depois do envio, a mesma página mostra a confirmação:

- com link: "Dados enviados! Para liberar seu novo plano, efetue o pagamento." e o botão "Efetuar Pagamento", que abre o link em outra aba;
- sem link: "Dados enviados! Seu link de pagamento está sendo gerado. Ele chega por e-mail e WhatsApp em instantes e também aparece na tela do seu plano."

Quando a renovação não é permitida, a página mostra o motivo e o botão de voltar ao plano:

| Motivo | Texto |
|---|---|
| `plan_not_active` | Este plano não está mais ativo. |
| `renewal_not_open` | O formulário de atualização fica disponível a partir de 2 dias antes do vencimento do seu plano. |
| `renewal_paid` | Recebemos seu pagamento. Seu novo plano está sendo preparado. |

### 8.2 Rotas

**`GET /api/client/meal-plans/[id]/renewal`** responde `{ eligible, reason, answers, renewal }`: se a renovação é permitida, o motivo quando não é, as respostas para preencher a tela e o estado da renovação (seção 4).

**`POST /api/client/meal-plans/[id]/renewal`**, corpo `{ submissionId, answers }`:

1. `requirePatient()`. Plano de outro paciente ou inexistente → `404`.
2. Limite de 5 envios a cada 10 minutos por paciente → `429`.
3. Confere a permissão: plano `active`, formulário aberto (seção 4) e estado diferente de `paid`. Senão → `409` com `{ error, code }`, sendo `code` um dos motivos da seção 8.1.
4. Valida as respostas com zod: cada valor de escolha tem de estar entre as opções da pergunta. Inválido → `400`.
5. Monta o envio: as 16 respostas, com altura, peso e meta em texto, como o quiz grava; o `imc` calculado no servidor (`peso / altura²`, duas casas); e `nome_completo`, `email`, `whatsapp` e `cpf` lidos da tabela `patients`.
6. Chama `POST /api/renewals` com tempo limite de 25 segundos.
7. Responde `200 { success: true, paymentUrl }`. Se o `v0-tami-forms` não respondeu ou devolveu erro → `502` com "Não foi possível enviar seus dados agora. Tente novamente em instantes.".

O `submissionId` é um UUID gerado pela página ao abrir e reusado nas novas tentativas, então repetir o envio não duplica nada.

"Atualizar Dados", para quem já preencheu e ainda não pagou, é o mesmo formulário: o envio novo se liga à mesma cobrança pendente, e o plano é gerado com as respostas mais recentes.

### 8.3 Alerta de vencimento

O visual do alerta não muda. A decisão do que mostrar sai do componente e vira uma função pura, `lib/renewal/alert-state.ts`, com teste. O componente só desenha.

As rotas `GET /api/client/meal-plans`, `GET /api/client/meal-plans/[id]` e `GET /api/client/dashboard-stats` continuam devolvendo `dueDateNewMealPlan` e `paymentUrlNewMealPlan` em cada plano, agora calculados pela regra da seção 4, e passam a devolver também `renewalStatus`.

O que muda de comportamento:

| Onde | O que muda |
|---|---|
| Botões "Preencher Formulário" e "Atualizar Dados" | passam a ter destino |
| "Efetuar Pagamento" no estágio `d2` | abre o link de pagamento, como nos outros estágios; a rota `/pagamento` deixa de ser citada |
| Variante "já preencheu o formulário" | aparece quando `renewalStatus` é `awaiting_payment`, decidido no servidor, e não mais por uma conta de datas no navegador |
| `awaiting_payment` sem link | o texto vira "Você já preencheu o formulário. Seu link de pagamento está sendo gerado e chega por e-mail e WhatsApp em instantes." e o botão de pagamento não aparece |
| `renewalStatus` igual a `paid` | no lugar de qualquer outro alerta que a tela mostraria, um alerta informativo (o estilo azul do `d5`): "Pagamento confirmado" e "Recebemos seu pagamento. Seu novo plano alimentar está sendo preparado e aparece aqui em alguns minutos." |
| Propriedade `planPrice` | removida; não era usada |

O selo da lista ("Vence em 2 dias", "Vence hoje", "Expirado") não muda.

### 8.4 Volta ao destino depois do login

O link do aviso leva ao formulário, mas o paciente quase sempre chega sem sessão e, hoje, o login o manda para o painel, onde o alerta de `d2` não aparece.

- O `middleware.ts`, ao barrar uma página de `/cliente/*` sem sessão, redireciona para `/cliente/login?next=<caminho>`.
- A tela de login, depois de entrar, vai para `next` quando ele começa com `/cliente/` e não contém `//` nem `\`. Em qualquer outro caso vai para o painel, como hoje.
- A troca obrigatória de senha do primeiro acesso continua tendo prioridade e não guarda o `next`.

## 9. Estrutura do código

**PlanA**

```
lib/time.ts                          → hoje em São Paulo e soma de dias (cópia do v0-tami-forms)
lib/renewal/stage.ts                 → dias restantes, estágio e abertura do formulário
lib/renewal/questions.ts             → perguntas e opções
lib/renewal/alert-state.ts           → o que o alerta mostra
lib/validation/renewal.ts            → schema zod das respostas
lib/repos/renewals.ts                → cobrança de renovação e último envio do paciente
lib/services/renewal.ts              → estado, permissão e envio
lib/forms-client.ts                  → ganha `submitRenewal`
app/api/client/meal-plans/[id]/renewal/route.ts
app/cliente/planos/[id]/renovar/page.tsx
components/renewal-form.tsx
```

Alterados: `components/plan-expiration-alert.tsx`, as três rotas da seção 8.3, `lib/repos/meal-plans.ts` e `lib/repos/types.ts` (saem as duas colunas), `lib/admin/record-format.ts` (nomes dos tipos novos de mensagem: "Aviso de vencimento (5 dias)", "(2 dias)" e "(vence hoje)"), `middleware.ts`, `app/cliente/login/page.tsx`, `lib/container.ts`, `README.md`.

`lib/repos/meal-plans.ts`: a exclusão de um plano pelo admin apaga antes, na mesma transação, os avisos de vencimento ligados a ele, por causa da chave estrangeira nova.

**`v0-tami-forms`**

```
app/api/renewals/route.ts            → rota
lib/http/handlers/renewals.ts        → autenticação, leitura do corpo, resposta
lib/jobs/expiry-reminders.ts         → horário permitido e passo de enfileiramento
```

Alterados: `lib/db/schema.ts` e a migration `0003`, `lib/db/repos/types.ts`, `lib/db/repos/mysql.ts`, `tests/fakes/memory-repos.ts`, `tests/db/repos.contract.ts`, `lib/jobs/run-jobs.ts`, `lib/notify/templates.ts`, `lib/services/dispatch-notification.ts`, `lib/time.ts` (hora em São Paulo), `lib/container.ts`, `README.md`.

Valem as regras de fronteira dos specs anteriores: rota sem regra de negócio, serviço com dependências por parâmetro, só os repositórios falam com o banco.

## 10. Segurança

- `POST /api/renewals` só aceita o `JOBS_TOKEN`, comparado em tempo constante.
- O paciente só renova um plano dele: a sessão define o paciente, e nome, e-mail, telefone e CPF vêm do banco, nunca do navegador.
- O parâmetro `next` do login só aceita caminho interno de `/cliente/`.
- Respostas do formulário, links de pagamento e dados pessoais não vão para log.
- À IA continuam chegando só os 17 campos de sempre, sem identificação do paciente.

## 11. Deploy

- Ordem: `v0-tami-forms` primeiro, depois o PlanA, um em seguida do outro.
- **Atenção:** a migration `0003` remove duas colunas que o PlanA do primeiro ciclo ainda lê. Entre um deploy e outro, as telas de plano do PlanA antigo respondem com erro. Se o PlanA já estiver em uso, fazer os dois deploys num horário de pouco acesso.
- No primeiro deploy, os planos que já estão num estágio de aviso recebem a mensagem desse estágio na primeira rodada do job entre 9h e 20h.

## 12. Testes (Vitest)

**PlanA**

- **Unitários:** dias restantes e estágio, nos limites (6, 5, 3, 2, 1, 0 e -1 dias, e `end_date` nulo); estado do alerta para cada combinação de estágio, estado da renovação e variante; validação das respostas (opção fora da lista, múltipla escolha vazia, números fora da faixa); cálculo do IMC; `next` do login (caminho válido, externo, com `//`).
- **Serviço com dublês**
  - estado da renovação: cada linha da tabela da seção 4;
  - permissão: plano de outro paciente; plano não ativo; formulário fechado; estado `paid`;
  - envio: monta o corpo com os dados do paciente e o IMC; devolve o link; link nulo; falha do `v0-tami-forms` vira erro;
  - respostas para preencher a tela: último envio; sem envio; peso e meta sempre vazios; opção antiga descartada.
- **Rotas:** sem teste próprio, como as demais do PlanA. A guarda, o limite por paciente, a validação e o serviço são testados separadamente.
- **Cliente do `v0-tami-forms`:** sucesso, erro HTTP e tempo esgotado.
- **Repositórios contra o MySQL:** cobrança de renovação (ignora a cobrança anterior ao plano, pega a mais recente); último envio; exclusão de plano com aviso ligado.
- **Middleware:** redireciona com `next`.

**`v0-tami-forms`**

- Migration `0003` aplicada num banco com dados.
- Contrato do repositório, no fake e no MySQL: enfileira o estágio certo por dias restantes; não repete; pula plano com renovação `paid`; liga a cobrança só em `d2` e `d0` com link; ignora plano não ativo, vencido e com `end_date` nulo; um aviso por canal ativo.
- Passo do job: fora do horário não enfileira; a exceção do passo não interrompe a rodada.
- Templates: os cinco textos de vencimento e o de link de pagamento da renovação, com escape do nome e partes do WhatsApp.
- Envio: variante por presença de cobrança; `payment_link` com o texto de renovação para paciente com senha e o texto atual para paciente sem senha; aviso sem plano é falha definitiva.
- Endpoint: 401 sem token; 400 para corpo inválido; 200 com link; 200 com link nulo; 500 em erro de banco.
- Os testes existentes continuam passando.

**Roteiro manual** (os dois apps locais, no mesmo banco, Asaas em sandbox)

1. Como admin, criar um plano ativo com `end_date` daqui a 4 dias: conferir o aviso `d5` em `notifications` e o envio.
2. Alterar o `end_date` para daqui a 2 dias: aviso `d2` com o link do formulário; abrir o link sem sessão e chegar ao formulário depois do login.
3. Preencher e enviar: conferir o envio em `quiz_responses`, a cobrança, o link na tela e a mensagem de link de pagamento com o texto de renovação.
4. Voltar ao plano: alerta "já preencheu o formulário" com o botão de pagamento.
5. Alterar o `end_date` para hoje: aviso `d0` na variante de pagamento.
6. Pagar no sandbox: alerta "Pagamento confirmado"; em seguida o plano novo ativo, o anterior concluído e a mensagem "Plano novo disponível".
7. Tentar abrir o formulário de um plano com mais de 2 dias restantes: mensagem de formulário indisponível.

## 13. Critérios de sucesso

- Todo botão do alerta de vencimento leva a algum lugar que funciona.
- O paciente recebe um aviso por e-mail e um por WhatsApp em cada estágio, uma única vez, entre 9h e 20h.
- Da tela do plano, o paciente preenche o formulário, recebe o link, paga e vê o plano novo, sem ação de ninguém.
- Enviar o formulário duas vezes não cria duas cobranças, e quem já pagou não consegue gerar outra.
- A tela e as mensagens nunca pedem pagamento a quem já pagou.
- O PlanA continua sem falar com Asaas, SMTP, Evolution ou Anthropic.
- Testes, `typecheck` e `next build` passam nos dois projetos.
