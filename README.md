# PlanA

Aplicação onde o cliente vê o plano alimentar depois de pagar, e onde a nutricionista administra os cadastros.

## 1. O que é

O PlanA é a continuação do quiz (`v0-tami-forms`). O quiz recebe as respostas, cobra no Asaas e, quando o pagamento é confirmado, gera o plano alimentar e cria uma senha temporária. O PlanA é onde essa pessoa entra.

- **Cliente:** entra com CPF e senha, é obrigado a trocar a senha temporária no primeiro acesso, vê o plano ativo e os anteriores, as receitas liberadas e seus dados. Recupera a senha por link enviado por e-mail e WhatsApp. No celular, a navegação fica no rodapé: **Início**, **Meu Plano** (no centro, abre direto o plano ativo em `/cliente/meu-plano`) e **Receitas**; "Meus dados", "Alterar senha" e "Sair" ficam no avatar do topo. No computador, as mesmas opções ficam no topo.
- **Substituições:** toda refeição, menos o almoço, vem da IA com uma opção de substituição (`plan_data.meals[].substitutes`), que o paciente vê nos botões "Opção 1 | Opção 2" do card da refeição (no PDF saem as duas). O editor do admin mostra a substituição só para leitura e a preserva ao salvar.
- **Admin:** cadastra pacientes, planos, receitas e configurações de refeição, redefine senhas e consulta o cadastro completo de cada paciente (respostas do quiz, cobranças, planos e mensagens).

**Erros (`/admin/erros`).** Duas abas. **Falhas** lista as cobranças (`ASAAS_FAILED`), gerações de plano e mensagens (`failed`) que esgotaram as tentativas, com o `last_error`, o paciente e uma dica da causa provável; o botão **Reexecutar** (com confirmação) pede ao `v0-tami-forms` o `POST /api/jobs/retry` daquele item. **Logs de erro** mostra, só para leitura, os `warn`/`error` do servidor gravados em `app_logs` nos últimos 90 dias, com filtro de período, área e nível. Não há descarte de falha nem reexecução em lote.

**Vencimento e renovação.** O plano alimentar vale 30 dias. Faltando 5 dias, 2 dias e no dia do vencimento, o paciente recebe um aviso por e-mail e por WhatsApp (uma vez por plano e estágio, só entre 9h e 20h de São Paulo) e vê um alerta na tela do plano. A partir de 2 dias antes do vencimento, e também depois dele, abre o formulário de atualização em `/cliente/planos/[id]/renovar`: as 16 respostas do quiz que alimentam a IA, já preenchidas com as últimas respostas (peso atual e meta de peso sempre em branco). O PlanA entrega o formulário ao `v0-tami-forms` (`POST /api/renewals`), que cria a cobrança no Asaas e devolve o link de pagamento. Quando o pagamento é confirmado, o `v0-tami-forms` gera o plano novo, conclui o anterior e avisa o paciente. Plano vencido continua `active`, e o paciente continua vendo o conteúdo, até ser substituído.

O estado da renovação (`none`, `awaiting_payment`, `payment_expired` ou `paid`) é lido da tabela `payments` a cada consulta, pela mesma regra nos dois apps. Enquanto está `paid`, o paciente não vê pedido de pagamento nem consegue enviar o formulário de novo.

**Os dois apps usam o mesmo MySQL.**

| | `v0-tami-forms` | PlanA (este) |
|---|---|---|
| Cria e altera as tabelas | **sim** (todas as migrations) | não |
| Envia e-mail e WhatsApp | **sim** (fila + job) | não: pede o envio ao `v0-tami-forms` |
| Fala com Asaas e IA | sim | não |
| Mostra o plano ao cliente | não | sim |
| Avisos de vencimento do plano | **sim** (job de 2 minutos) | não: só o alerta na tela |
| Formulário de renovação | recebe o envio e cria a cobrança | **sim** (tela e envio) |

Quem pagou só consegue entrar porque o `v0-tami-forms` grava a senha temporária depois da confirmação do pagamento. Paciente sem senha não entra.

## 2. Requisitos

- Node 24.
- pnpm, pelo corepack: rode `corepack enable` uma vez.
- O MySQL 8 do `v0-tami-forms`, com as migrations dele já aplicadas (suba o `v0-tami-forms` pelo menos uma vez).

## 3. Rodar no seu computador

```bash
corepack pnpm install
cp .env.example .env.local
```

Edite o `.env.local` (seção 4). Depois:

```bash
corepack pnpm dev
```

O servidor abre em `http://localhost:5000`. Se o `v0-tami-forms` já está usando a porta 5000, use outra:

```bash
corepack pnpm exec next dev -p 5001
```

(e ajuste `APP_URL` no `.env.local`).

Se o banco não tiver as tabelas, o app encerra no início e o log lista o que falta: suba o `v0-tami-forms` antes.

## 4. Variáveis de ambiente

O modelo está em `.env.example`. Nenhuma começa com `NEXT_PUBLIC_`. Uma variável **vazia** é inválida: para usar o padrão, **remova** a linha.

| Variável | Obrigatória | Para que serve |
|---|---|---|
| `DATABASE_URL` | sim | O mesmo MySQL do `v0-tami-forms`. Ex.: `mysql://usuario:senha@host:3306/tami_forms` |
| `SESSION_SECRET` | sim | Assina o cookie de sessão. Mínimo de 32 caracteres, aleatório |
| `APP_URL` | sim | Endereço público do PlanA (URL completa). Vai no link de "esqueci a senha" |
| `FORMS_INTERNAL_URL` | sim | Endereço do `v0-tami-forms`. No Easypanel, use a URL interna do serviço |
| `JOBS_TOKEN` | sim | O **mesmo valor** do `JOBS_TOKEN` do `v0-tami-forms` (mínimo de 32 caracteres) |
| `ADMIN_EMAIL` | não | E-mail do primeiro admin (seção 5) |
| `ADMIN_PASSWORD` | não | Senha do primeiro admin, mínimo de 12 caracteres |
| `ADMIN_NAME` | não | Nome do primeiro admin. Padrão `Administrador` |
| `NOTIFY_EMAIL_ENABLED` | não | `true` (padrão) envia o link por e-mail; `false` desliga o canal |
| `NOTIFY_WHATSAPP_ENABLED` | não | `true` (padrão) envia o link por WhatsApp; `false` desliga o canal |

`NOTIFY_*_ENABLED` devem ter os mesmos valores configurados no `v0-tami-forms`.

Para gerar um segredo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

**Trocar o `SESSION_SECRET` desconecta todo mundo** (as sessões deixam de valer).

## 5. Primeiro admin

No início, se a tabela `admins` está vazia e `ADMIN_EMAIL` e `ADMIN_PASSWORD` existem, o app cria o admin. Se a tabela está vazia e as variáveis não existem, o app sobe e registra um aviso (`boot.admin.missing`): ninguém conseguirá entrar no painel.

Depois que existe algum admin, as variáveis são **ignoradas**: mudar `ADMIN_PASSWORD` não troca a senha. Para trocar, use "Alterar senha" no menu do admin.

## 6. Deploy no Easypanel (a partir do GitHub, sem Docker)

1. **Suba (ou atualize) o `v0-tami-forms` primeiro:** ele aplica as migrations. Quando o schema mudar, ele sempre sobe antes do PlanA.
2. Crie um serviço **App** a partir do repositório do GitHub (branch de produção).
3. Comandos:
   - Build: `pnpm install && pnpm build`
   - Start: `pnpm start`
   - Porta do app: `5000`
   - Versão do Node: o `nixpacks.toml` fixa o Node 22 (o Next.js 16 exige 20.9 ou mais novo; sem esse arquivo o Nixpacks usa o 18 e o build falha).
4. Em `DATABASE_URL`, use a **URL interna** do serviço MySQL. Em `FORMS_INTERNAL_URL`, a URL interna do `v0-tami-forms`.
5. Cadastre as variáveis da seção 4.
6. Health check: caminho `/api/health` (200 com o banco acessível, 503 sem).
7. Configure o domínio no proxy do Easypanel.

Se o PlanA subir antes do `v0-tami-forms` num banco novo, ele encerra com `boot.schema_missing` listando as tabelas que faltam; o Easypanel o reinicia até o banco estar pronto.

### Deploy da página de erros

A página `/admin/erros` lê `app_logs`, e a cópia do schema deste repositório passou a incluir `app_logs`, `funnel_sessions` e `funnel_events`. O boot confere essas tabelas: um banco sem elas faz o PlanA encerrar com `boot.schema_missing`. Elas vêm das migrations `0004` e `0005` do `v0-tami-forms` (observabilidade do funil), então o `v0-tami-forms` com a observabilidade sobe **antes** deste deploy. Não há variável de ambiente nova.

### Deploy da renovação

O vencimento e a renovação não pedem variável de ambiente nova em nenhum dos dois apps (o valor da renovação é o `PAYMENT_AMOUNT` do quiz). O PlanA chama o `v0-tami-forms` com `FORMS_INTERNAL_URL` e `JOBS_TOKEN`, que já existem.

1. Suba o `v0-tami-forms` **primeiro**: ele aplica a migration `0003`.
2. Em seguida, suba o PlanA.

**Atenção:** a migration `0003` **remove** as colunas `meal_plans.due_date_new_meal_plan` e `meal_plans.payment_url_new_meal_plan`, que o PlanA anterior ainda lê. Entre um deploy e o outro, as telas de plano do PlanA antigo respondem com erro. Se o PlanA já está em uso, faça os dois deploys um logo após o outro, num horário de pouco acesso.

No primeiro deploy, todo plano ativo que já está dentro de um estágio de aviso (0 a 5 dias para vencer) recebe a mensagem desse estágio na primeira rodada do job entre 9h e 20h de São Paulo, menos os planos cuja renovação já está paga (a cobrança criada depois do plano já foi paga e o plano novo está a caminho): esses não recebem aviso. Fora dessa janela nenhuma rodada enfileira aviso, nem a disparada à mão por `/api/jobs/run`.

### Deploy das opções de substituição

Sem migration e sem variável de ambiente nova: `substitutes` é um campo opcional dentro de `plan_data`.

1. Suba o PlanA **primeiro**. Ele mostra as substituições e o editor do admin as preserva. Se o `v0-tami-forms` gerasse substituições antes, o paciente não as veria, e um admin que salvasse o plano as apagaria.
2. Depois, suba o `v0-tami-forms`.

Os planos que já existem continuam sem substituição; só os gerados depois do deploy do `v0-tami-forms` as têm.

## 7. Schema

`lib/db/schema.ts` é uma **cópia** de `../v0-tami-forms/lib/db/schema.ts`, que é a fonte. O PlanA não tem migrations. Depois de mudar o schema no `v0-tami-forms`:

```bash
corepack pnpm db:sync-schema
```

Um teste confere que as duas cópias são iguais (quando o `v0-tami-forms` está ao lado).

O schema não é a única coisa que acompanha o `v0-tami-forms`. Dois arquivos do PlanA também são **cópias** e precisam ser mantidos iguais aos de lá, à mão:

| No PlanA | Fonte no `v0-tami-forms` | O que tem |
|---|---|---|
| `lib/renewal/rules.ts` | `lib/renewal/rules.ts` | Dias restantes, estágio do aviso, formulário aberto (2 dias antes ou depois do vencimento) e estado da renovação |
| `lib/time.ts` | `lib/time.ts` | Data e hora em São Paulo e soma de dias |

Se a regra divergir, a tela e as mensagens passam a discordar (por exemplo, um aviso pedindo pagamento a quem a tela já mostra como pago). Mudou um, mude o outro.

A lista de perguntas do formulário (`lib/renewal/questions.ts`) também foi copiada, de `v0-tami-forms/app/page.tsx`: os `value`s são o que o quiz grava e o que o gerador do plano entende, então não devem ser alterados só aqui.

## 8. Segurança

- O app deve ser acessível **só pelo proxy do Easypanel**. Os limites de tentativa (10 logins a cada 10 minutos e 5 pedidos de "esqueci a senha" a cada 15, por IP) usam o primeiro valor de `x-forwarded-for`, que qualquer um forja se acessar o app direto. Os limites ficam na memória e valem por instância.
- Nenhum segredo fica no código. `.env.local` é ignorado pelo Git.
- **Troque as senhas do Supabase e considere o segredo de sessão antigo comprometido.** Os arquivos `configEasypanel.md` (removido) e `.replit` (o bloco `[userenv]` foi removido) traziam as URLs de conexão do Supabase de desenvolvimento e de produção, com senha, e um `JWT_SECRET`, e ficaram no histórico do Git. Os dois PRDs em `attached_assets/` também traziam a chave `anon` e a `service_role` do Supabase (a `service_role` dá acesso total ao projeto, ignorando as regras de acesso por linha); as três linhas foram apagadas dos arquivos. Apagar os arquivos não apaga o histórico, e trocar a senha do banco **não** revoga essas chaves: no Supabase, gere um novo JWT secret do projeto (ou apague os projetos) e nunca reutilize aquele `JWT_SECRET`.
- O envio do formulário de renovação é limitado a 5 a cada 10 minutos por paciente, na memória e por instância. Nome, e-mail, telefone e CPF vêm do cadastro do paciente, nunca do navegador. Depois do login, o `next` só aceita caminho interno de `/cliente/`.
- Senhas ficam em scrypt com salt por usuário. O link de redefinição vale 1 hora, serve uma vez e só o hash dele é guardado.
- Nada de senha, hash, token ou link de redefinição vai para o log.

## 9. Testes

```bash
corepack pnpm test        # testes unitários e de repositório
corepack pnpm typecheck   # verificação de tipos
corepack pnpm build       # build de produção (não precisa de variáveis nem de banco)
```

Os testes que usam MySQL de verdade são **pulados** se `TEST_DATABASE_URL` não estiver definida ou se o `v0-tami-forms` não estiver ao lado (as tabelas vêm das migrations dele). Aponte para um banco **descartável**, com "test" no nome: os testes **apagam o conteúdo das tabelas**, e recusam rodar contra um banco sem "test" no nome.

```bash
TEST_DATABASE_URL=mysql://root:senha@127.0.0.1:3306/plana_test corepack pnpm test
```

Crie antes o banco (MySQL 8):

```sql
CREATE DATABASE plana_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

## 10. Documentos de design

`docs/superpowers/specs` e `docs/superpowers/plans`. Os do vencimento e da renovação:

- Spec: `docs/superpowers/specs/2026-10-12-vencimento-renovacao-design.md`
- Plano: `docs/superpowers/plans/2026-10-12-vencimento-renovacao.md`

O painel de erros do admin:

- Spec: `docs/superpowers/specs/2026-10-24-painel-erros-design.md`
- Plano: `docs/superpowers/plans/2026-10-24-painel-erros.md`

A navegação para celular e as opções de substituição:

- Spec: `docs/superpowers/specs/2026-11-02-navegacao-mobile-substituicoes-design.md`
- Plano: `docs/superpowers/plans/2026-11-02-navegacao-mobile-substituicoes.md`


