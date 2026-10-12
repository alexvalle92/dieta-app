# PlanA sobre MySQL: banco centralizado, autenticação nova e refatoração

**Data:** 2026-10-12
**Branch:** `feature/refatoracao` (nos dois repositórios)
**Status:** design aprovado em conversa; aguardando revisão do spec

## 1. Contexto e objetivo

O PlanA (`dieta-app`) é a continuação do quiz (`v0-tami-forms`). O quiz recebe as respostas, cria a cobrança no Asaas e, quando o pagamento é confirmado, gera o plano alimentar, cria a senha temporária e avisa o cliente. O PlanA é onde o cliente entra para ver o plano e onde o admin administra os cadastros.

Hoje os dois não se falam. O `v0-tami-forms` grava tudo em MySQL, com senha em scrypt. O PlanA ainda lê um PostgreSQL do Supabase e confere a senha com SHA-512. Quem paga recebe uma senha que o PlanA não sabe validar.

**Objetivo deste ciclo:** fazer o PlanA funcionar sobre o MySQL do `v0-tami-forms`, com a criação de todas as tabelas num lugar só, e refatorar o código do PlanA sem mudar o layout.

Este é o primeiro de dois ciclos. O segundo ("Vencimento e renovação") cobre os avisos de fim de plano e o formulário de renovação, e terá spec próprio.

### Restrições

- Banco: o MySQL 8 do `v0-tami-forms`. O Supabase sai do projeto e nenhum dado dele é migrado: o banco começa vazio.
- Toda tabela é criada pelas migrations do `v0-tami-forms`, aplicadas no boot dele. O PlanA não cria nem altera tabela.
- Deploy por Git no Easypanel, sem Docker (`next build` e `next start`, porta 5000).
- O layout das telas não muda. Mudam só comportamentos listados na seção 9.
- Os padrões são os do `v0-tami-forms`: ids `CHAR(36)` gerados na aplicação, datas `DATETIME(3)` em UTC, `created_at` e `updated_at` em toda tabela.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Recorte | Dois ciclos; este é "PlanA sobre MySQL" |
| Dados do Supabase | Nada é migrado |
| Arquitetura | Banco compartilhado e fila única de mensagens (o `v0-tami-forms` é dono das migrations e de todo envio) |
| Acesso ao banco no PlanA | Drizzle com `mysql2` e uma cópia idêntica do `schema.ts` do `v0-tami-forms`, sem migrations |
| Primeiro admin | Criado no boot do PlanA a partir de `ADMIN_EMAIL` e `ADMIN_PASSWORD`, se a tabela `admins` estiver vazia |
| Senhas | scrypt, no formato que o `v0-tami-forms` já grava, para paciente e admin |
| Primeiro acesso | Troca de senha obrigatória enquanto `must_change_password` for verdadeiro |
| Senha nova | Mínimo de 8 caracteres |
| Recuperação de senha | Link de uso único, válido por 1 hora, enviado por e-mail e WhatsApp pela fila do `v0-tami-forms` |
| Admin | Mantém as telas de hoje e ganha a tela de cadastro completo do paciente, só de leitura |
| Exclusão de paciente | Só para paciente sem cobrança e sem envio do quiz |
| Git | Commits locais na branch `feature/refatoracao` dos dois repositórios, sem `push` |

### Fora de escopo

- Aviso de vencimento por tela, e-mail e WhatsApp, e o formulário de renovação (segundo ciclo). Os botões do alerta de vencimento que apontam para `/cliente/planos/[id]/renovar` e `/cliente/planos/[id]/pagamento` continuam sem destino até lá, como hoje.
- Qualquer mudança visual.
- Tela de edição de admin, e telas próprias para cobranças, gerações de plano e mensagens.
- Migração de dados do Supabase.
- Troca das senhas do Supabase que ficaram no histórico do Git (seção 10): é ação manual do dono do projeto.

## 3. Visão geral

```
                  ┌──────────────────────────┐
  quiz ──────────>│      v0-tami-forms       │──> Asaas, Anthropic
                  │  migrations (todas)      │──> SMTP, Evolution API
                  │  job de 2 min            │
                  │  POST /api/notifications/dispatch
                  └────────────┬─────────────┘
                               │ cria e altera tabelas
                        ┌──────▼──────┐
                        │   MySQL 8   │
                        └──────▲──────┘
                               │ lê e grava (sem criar tabela)
                  ┌────────────┴─────────────┐
  cliente, admin ─>│        dieta-app         │
                  │  login, planos, admin    │
                  │  enfileira `password_reset` e pede o envio
                  └──────────────────────────┘
```

O PlanA nunca fala com Asaas, SMTP, Evolution ou Anthropic. A única chamada que ele faz ao `v0-tami-forms` é o pedido de envio das mensagens de recuperação de senha, e ela é opcional: se falhar, o job de 2 minutos envia.

## 4. Banco de dados (repositório `v0-tami-forms`)

Uma migration nova, `0002`, gerada pelo `drizzle-kit` a partir de `lib/db/schema.ts` e ajustada à mão no ponto indicado em 4.2.

### 4.1 Tabelas novas

**`admins`**

| coluna | tipo | notas |
|---|---|---|
| id | CHAR(36) PK | |
| name | VARCHAR(200) NOT NULL | |
| email | VARCHAR(254) NOT NULL **UNIQUE** | gravado em minúsculas |
| password_hash | VARCHAR(255) NOT NULL | scrypt, formato da seção 6.1 |
| cpf | CHAR(11) NULL | o anexo pedia NOT NULL; fica nulo porque o primeiro admin nasce só com nome, e-mail e senha |
| phone | VARCHAR(13) NULL | idem |
| crn | VARCHAR(32) NULL | idem |

**`password_reset_tokens`**

| coluna | tipo | notas |
|---|---|---|
| id | CHAR(36) PK | |
| patient_id | CHAR(36) NOT NULL FK → patients | índice |
| token_hash | CHAR(64) NOT NULL **UNIQUE** | SHA-256 em hexadecimal do token; o token em texto puro nunca é gravado aqui |
| expires_at | DATETIME(3) NOT NULL | criação + 1 hora |
| used | BOOLEAN NOT NULL default false | |

**`recipes`**

| coluna | tipo | notas |
|---|---|---|
| id | CHAR(36) PK | |
| title | VARCHAR(200) NOT NULL | |
| description | TEXT NULL | |
| ingredients | JSON NOT NULL | lista de textos (era `text[]`) |
| preparation | TEXT NOT NULL | |
| tips | TEXT NULL | |
| prep_time, servings, calories | INT NULL | |
| category | VARCHAR(100) NULL | índice |
| image_url | TEXT NULL | |
| portion_quantity, proteins, lipids, carbohydrates, fiber | DECIMAL(10,2) NULL | eram `numeric`; a API continua devolvendo número |
| active_customer | BOOLEAN NOT NULL default true | |

**`meal_categories`**

| coluna | tipo | notas |
|---|---|---|
| id | CHAR(36) PK | |
| name | VARCHAR(100) NOT NULL **UNIQUE** | |

**`allowed_meal_items`**

| coluna | tipo | notas |
|---|---|---|
| id | CHAR(36) PK | |
| meal_category_id | CHAR(36) NOT NULL FK → meal_categories, **ON DELETE CASCADE** | |
| item_type | VARCHAR(16) NOT NULL | `food` ou `recipe` |
| food_name | VARCHAR(200) NULL | |
| recipe_id | CHAR(36) NULL FK → recipes, **ON DELETE CASCADE** | |

As duas chaves desta tabela têm cascata porque ela é só configuração: apagar a categoria ou a receita apaga os itens ligados, como no schema antigo do PlanA. Nenhuma outra chave do banco tem cascata.

**`app_settings`**

| coluna | tipo | notas |
|---|---|---|
| id | VARCHAR(32) PK | sempre `global` |
| diet_technical_definition | TEXT NOT NULL | |

Todas as tabelas têm `created_at` e `updated_at`.

### 4.2 `notifications` (alterada)

A fila hoje só aceita mensagem ligada a um envio do quiz e a uma cobrança. A recuperação de senha não tem nenhum dos dois.

| mudança | detalhe |
|---|---|
| `quiz_response_id` | passa a aceitar nulo |
| `payment_id` | passa a aceitar nulo |
| `patient_id` (nova) | CHAR(36) NOT NULL FK → patients, com índice |
| `payload` (nova) | JSON NULL |

- `kind` é VARCHAR e ganha o valor `password_reset`.
- A chave única `(quiz_response_id, channel, kind)` continua. Linhas de `password_reset` têm `quiz_response_id` nulo e por isso não colidem entre si.
- **Ajuste manual na migration:** `patient_id` entra como nulo, as linhas existentes são preenchidas com `UPDATE notifications n JOIN quiz_responses q ON q.id = n.quiz_response_id SET n.patient_id = q.patient_id`, e só então a coluna vira NOT NULL e recebe a chave estrangeira. Sem isso a migration falha em banco com mensagens já gravadas.

### 4.3 O que não é criado

- A tabela `payments` do schema antigo do PlanA. Vale a do `v0-tami-forms`.
- As colunas `birth_date`, `gender`, `address` e `notes` de `patients`, que nenhuma tela usa.
- `patients.password`. Vale `patients.password_hash`.

### 4.4 Cópia do schema no PlanA

- `dieta-app/lib/db/schema.ts` é uma cópia byte a byte de `v0-tami-forms/lib/db/schema.ts`.
- O arquivo ganha, nos dois repositórios, um comentário no topo dizendo que a fonte é o `v0-tami-forms` e que a cópia é atualizada com `pnpm db:sync-schema`.
- `pnpm db:sync-schema` (no PlanA) copia o arquivo de `../v0-tami-forms/lib/db/schema.ts`.
- Um teste do PlanA compara os dois arquivos. Ele é pulado quando o repositório vizinho não existe.

## 5. Mudanças no `v0-tami-forms`

Além da migration:

| Arquivo | Mudança |
|---|---|
| `lib/db/schema.ts` | tabelas da seção 4.1, colunas da 4.2, comentário do topo |
| `lib/db/repos/types.ts` | `NotificationKind` ganha `password_reset`; em `NotificationView`, `quizResponseId` e `paymentId` aceitam nulo e entra `payload` |
| `lib/db/repos/mysql.ts` | toda inserção em `notifications` grava `patient_id`; `get` busca o paciente por `notifications.patient_id` e a cobrança por `LEFT JOIN`; `markSent` zera `payload` |
| `tests/fakes/memory-repos.ts`, `tests/db/repos.contract.ts` | acompanham o contrato |
| `lib/notify/templates.ts` | `renderPasswordReset` (seção 7.3) |
| `lib/services/dispatch-notification.ts` | trata `password_reset`: lê `payload.link`; sem link é erro definitivo |
| `lib/http/handlers/notifications-dispatch.ts`, `app/api/notifications/dispatch/route.ts` | endpoint novo (seção 7.4) |
| `lib/container.ts` | expõe o envio por lista de ids |
| `README.md` | seção "Integração com o PlanA" atualizada |

Nenhuma variável de ambiente nova no `v0-tami-forms`.

## 6. PlanA: autenticação e sessão

### 6.1 Hash de senha

Mesmo formato do `v0-tami-forms`, para paciente e admin:

```
scrypt$16384$8$1$<salt em base64, 16 bytes>$<hash em base64, 32 bytes>
```

`lib/auth/password-hash.ts` do PlanA é uma cópia de `lib/access/password-hash.ts` do `v0-tami-forms`: lê `N`, `r` e `p` do valor gravado, limita esses parâmetros e compara em tempo constante. Um valor em outro formato (por exemplo um SHA-512 antigo) nunca confere.

### 6.2 Sessão

- Cookie `plana_session`, `httpOnly`, `sameSite=lax`, `secure` em produção, 7 dias.
- JWT HS256 assinado com `SESSION_SECRET` (mínimo de 32 caracteres), lido da variável de ambiente. O segredo fixo no código é removido, e com isso todas as sessões antigas deixam de valer.
- Conteúdo: id do usuário, tipo (`patient` ou `admin`), nome, e-mail e, para paciente, `mustChangePassword`.

### 6.3 Login do cliente (`POST /api/auth/login-cliente`)

1. Limite de 10 tentativas a cada 10 minutos por IP. Acima disso, `429` com "Muitas tentativas. Aguarde alguns minutos e tente novamente.".
2. Por CPF (11 dígitos): busca o paciente pelo CPF, que é único.
3. Por e-mail: busca até 2 pacientes com o e-mail em minúsculas. Só segue se achar exatamente um.
4. Paciente não encontrado, e-mail repetido, paciente sem `password_hash` ou senha errada respondem o mesmo `401`, "CPF/E-mail ou senha inválidos". Quando não há paciente, o app ainda calcula um scrypt contra um hash fixo, para o tempo de resposta não revelar se o CPF existe.
5. Senha certa: cria a sessão com `mustChangePassword` igual ao campo do banco e responde `{ success, user }` como hoje.

Paciente sem `password_hash` é quem ainda não pagou. É essa regra que garante o acesso só depois do pagamento. Paciente criado à mão pelo admin entra com a senha que o admin definiu.

### 6.4 Login do admin (`POST /api/auth/login-admin`)

Por e-mail (único) e senha, com o mesmo limite por IP e a mesma resposta `401` genérica.

### 6.5 Troca obrigatória no primeiro acesso

- O `middleware.ts` protege `/cliente/*` e `/admin/*`. Para paciente com `mustChangePassword`, qualquer página de `/cliente/*` que não seja `/cliente/recuperar-senha` redireciona para ela.
- As rotas `/api/client/*` respondem `403` com `{ error, code: "password_change_required" }` nesse estado. Continuam liberadas: `/api/auth/session`, `/api/auth/logout` e `/api/auth/reset-password`.
- `POST /api/auth/reset-password` (senha atual + nova) grava o novo hash, põe `must_change_password = false`, atualiza `password_set_at` e emite uma sessão nova sem a marca.
- Quando o admin cria um paciente ou redefine a senha de um paciente, `must_change_password` vai para verdadeiro.

### 6.6 Guardas

`lib/auth/guards.ts` tem duas funções, `requireAdmin()` e `requirePatient()`, usadas por todas as rotas. Sem sessão ou com sessão do tipo errado, a resposta é sempre `401` (hoje umas respondem 401 e outras 403).

## 7. Recuperação de senha

### 7.1 Pedido (`POST /api/auth/forgot-password`)

1. Limite de 5 pedidos a cada 15 minutos por IP.
2. Corpo: `{ cpf }`. CPF com formato inválido → `400`.
3. CPF não encontrado → `404` com "CPF não encontrado no sistema", como hoje. A tela depende dessa resposta para mostrar o erro; o limite por IP é o que dificulta usar a rota para descobrir CPFs cadastrados.
4. CPF encontrado, numa transação:
   1. gera um token aleatório de 32 bytes (base64url);
   2. grava `token_hash`, `expires_at` = agora + 1 hora;
   3. insere em `notifications` uma linha por canal ativo, com `kind = 'password_reset'`, `patient_id`, `recipient` (e-mail, ou `55` + telefone no WhatsApp), `status = 'pending'`, `next_attempt_at` = agora e `payload = { "link": "<APP_URL>/cliente/redefinir-senha/<token>" }`.
5. Depois da resposta, o PlanA chama o endpoint da seção 7.4 com os ids criados. Falha nessa chamada só gera log.
6. Responde `{ success: true, email }`, com o e-mail mascarado (`a***@gmail.com`), como hoje.

Os canais ativos vêm de `NOTIFY_EMAIL_ENABLED` e `NOTIFY_WHATSAPP_ENABLED` do PlanA (padrão `true`), que devem ter os mesmos valores configurados no `v0-tami-forms`.

O link com o token fica em `notifications.payload` só até a mensagem sair: o envio zera o campo. O token vale 1 hora e só o hash fica em `password_reset_tokens`.

### 7.2 Redefinição (`POST /api/auth/verify-reset-token`)

Corpo: `{ token, newPassword }`.

1. Senha nova com menos de 8 caracteres → `400`.
2. Busca o token pelo SHA-256. Inexistente ou `used` → `400` "Token inválido ou já utilizado". Vencido → `400` "Token expirado. Solicite um novo link de recuperação".
3. Numa transação: grava o novo hash do paciente, `must_change_password = false`, `password_set_at`; marca como usados **todos** os tokens do paciente.
4. Responde `{ success: true, message }`.

### 7.3 Texto da mensagem (`renderPasswordReset`, no `v0-tami-forms`)

- Título: `Redefinição de senha do PlanA`
- Corpo:

```
Olá {nome}! 👋 <br>Recebemos um pedido para redefinir a senha do seu acesso ao <strong>PlanA</strong>. <br><br>
Para criar uma nova senha, acesse o link abaixo. Ele vale por 1 hora e só pode ser usado uma vez: <br>
{link} <br><br>
Se você não fez esse pedido, ignore esta mensagem. Sua senha continua a mesma.
```

Segue as regras das outras mensagens: nome escapado, e-mail em HTML e texto puro, WhatsApp dividido a cada `<br><br>`.

### 7.4 Endpoint de envio (`POST /api/notifications/dispatch`, no `v0-tami-forms`)

- Autenticação: `Authorization: Bearer <JOBS_TOKEN>`. Sem token ou token errado → `401`.
- Corpo: `{ "notificationIds": ["…"] }`, de 1 a 10 ids. Fora disso → `400`.
- Responde `202 { ok: true }` na hora e envia depois da resposta (`after()`), uma mensagem por vez, com o mesmo serviço do job (lock, tentativas, backoff e alerta).
- Id inexistente ou mensagem que não está `pending` é ignorada.

O PlanA chama com tempo limite de 5 segundos. O endereço vem de `FORMS_INTERNAL_URL`.

## 8. PlanA: estrutura do código

```
instrumentation.ts            → chama o boot, só no runtime Node e fora do `next build`
lib/boot.ts                   → valida as variáveis, confere o banco, cria o primeiro admin
lib/env.ts                    → variáveis validadas com zod
lib/log.ts                    → log em JSON, uma linha por evento (cópia do `v0-tami-forms`)
lib/db/client.ts              → pool `mysql2` em UTC e Drizzle
lib/db/schema.ts              → cópia do schema (seção 4.4)
lib/db/check.ts               → confere tabelas e colunas esperadas
lib/auth/password-hash.ts     → scrypt
lib/auth/session.ts           → cria, lê e apaga o cookie de sessão
lib/auth/guards.ts            → `requireAdmin`, `requirePatient`
lib/auth/reset-token.ts       → gera o token e calcula o hash
lib/http/rate-limit.ts        → limite em memória (cópia do `v0-tami-forms`)
lib/http/client-ip.ts         → primeiro IP de `x-forwarded-for`
lib/validation/               → CPF, telefone, e-mail mascarado, schemas zod das entradas
lib/repos/                    → um arquivo por assunto (tabela abaixo)
lib/services/                 → regras de negócio (tabela abaixo)
lib/forms-client.ts           → chamada ao endpoint de envio do `v0-tami-forms`
lib/container.ts              → monta repositórios e serviços uma vez por processo
app/api/**/route.ts           → rota fina
middleware.ts                 → proteção de páginas e troca obrigatória
```

**Repositórios**

| Arquivo | Responsabilidade |
|---|---|
| `patients.ts` | busca por CPF, e-mail e id; lista com busca; cria, altera, exclui; grava senha |
| `admins.ts` | busca por e-mail e id; conta; cria; grava senha |
| `meal-plans.ts` | lista e detalhe do cliente; lista, cria, altera e exclui do admin |
| `recipes.ts` | lista (com busca), detalhe, cria, altera, exclui; conta |
| `meal-config.ts` | categorias de refeição, itens permitidos e `app_settings` |
| `reset-tokens.ts` | cria o pedido de recuperação (token + mensagens) e conclui a redefinição |
| `patient-record.ts` | leitura do cadastro completo do paciente (seção 9.2) |
| `stats.ts` | números dos dois painéis |

**Serviços**

| Arquivo | Responsabilidade |
|---|---|
| `login.ts` | login do cliente e do admin |
| `change-password.ts` | troca com senha atual, para cliente e admin |
| `password-reset.ts` | pedido e redefinição |
| `patient-admin.ts` | cadastro, alteração, exclusão e redefinição de senha feitos pelo admin |
| `seed-admin.ts` | criação do primeiro admin |

**Regras de fronteira**

- A rota não tem regra de negócio: chama a guarda, valida a entrada com zod, chama um serviço ou repositório e traduz o resultado em HTTP.
- Serviços recebem as dependências por parâmetro e são testados com dublês, sem banco e sem rede.
- Só `lib/repos/` importa o Drizzle e o schema.
- Ids são gerados com `randomUUID()` na aplicação. Todo `UPDATE` define `updated_at`.
- As URLs das rotas e o formato das respostas não mudam, salvo o que está na seção 9.

### 8.1 Boot

Na ordem, e qualquer falha encerra o processo com o motivo no log:

1. valida as variáveis de ambiente;
2. confere o banco: para cada tabela e coluna declarada em `lib/db/schema.ts`, consulta `information_schema.columns`. Se faltar algo, o log lista as tabelas e colunas ausentes e orienta a subir o `v0-tami-forms` antes;
3. cria o primeiro admin: se `admins` está vazia e `ADMIN_EMAIL` e `ADMIN_PASSWORD` existem, insere o admin com `ADMIN_NAME` (padrão "Administrador"). Se a tabela está vazia e as variáveis não existem, o app sobe e registra um aviso. Se já existe algum admin, as variáveis são ignoradas: mudar `ADMIN_PASSWORD` depois não troca a senha.

### 8.2 Variáveis de ambiente do PlanA

| variável | obrigatória | notas |
|---|---|---|
| `DATABASE_URL` | sim | o mesmo MySQL do `v0-tami-forms` |
| `SESSION_SECRET` | sim | mínimo de 32 caracteres |
| `APP_URL` | sim | endereço público do PlanA, usado no link de redefinição |
| `FORMS_INTERNAL_URL` | sim | endereço do `v0-tami-forms` (no Easypanel, a URL interna do serviço) |
| `JOBS_TOKEN` | sim | o mesmo valor do `v0-tami-forms`, mínimo de 32 caracteres |
| `ADMIN_EMAIL` | não | e-mail do primeiro admin |
| `ADMIN_PASSWORD` | não | mínimo de 12 caracteres |
| `ADMIN_NAME` | não | padrão "Administrador" |
| `NOTIFY_EMAIL_ENABLED` | não | padrão `true` |
| `NOTIFY_WHATSAPP_ENABLED` | não | padrão `true` |

Nenhuma é `NEXT_PUBLIC_*`. Um `.env.example` novo documenta todas. Variável vazia é inválida, como no `v0-tami-forms`.

## 9. Telas e regras que mudam

### 9.1 Comportamento

| Onde | O que muda |
|---|---|
| `/cliente/recuperar-senha` | parada obrigatória no primeiro acesso; mínimo de 8 caracteres |
| `/cliente/redefinir-senha/[token]` e o diálogo "Alterar senha" | mínimo de 8 caracteres |
| `/cliente/esqueci-senha` | deixa de depender do n8n |
| `/setup`, `/api/setup/*` | removidas |
| `/api/patients/create` | removida; era duplicata de `POST /api/admin/patients` e nenhuma tela a chama |
| Cadastro de paciente pelo admin | barra CPF repetido (e não mais e-mail repetido); valida os dígitos do CPF; senha mínima de 8; e-mail gravado em minúsculas |
| Exclusão de paciente pelo admin | só sem cobrança e sem envio do quiz; caso contrário `409` com "Paciente com pagamentos não pode ser excluído" |
| Plano criado ou alterado para `active` pelo admin | os outros planos `active` do mesmo paciente passam para `completed`, a mesma regra do `v0-tami-forms` |
| Busca de receitas e de pacientes | `LIKE` no MySQL; o collation do banco já ignora maiúsculas e acentos |

A exclusão permitida apaga, numa transação, os tokens de senha, as mensagens e os planos manuais do paciente, e depois o paciente.

### 9.2 Tela nova: `/admin/pacientes/[id]`

Só leitura, com os componentes já usados nas telas do admin. A lista de pacientes ganha o botão "Ver cadastro". Dados vêm de `GET /api/admin/patients/[id]/record`.

| Bloco | Conteúdo |
|---|---|
| Dados | nome, CPF, e-mail, telefone, data de cadastro, "tem senha" e "precisa trocar a senha" |
| Respostas do quiz | cada envio, do mais novo ao mais antigo, com a data e a lista de perguntas e respostas |
| Cobranças | valor, status, vencimento, data do pagamento, forma de pagamento e link |
| Planos | título, período, status e origem ("gerado pela IA" quando tem cobrança, "criado pelo admin" quando não tem) |
| Mensagens | canal, tipo, status, tentativas e data de envio |

A tela nunca mostra `password_hash`, `payload`, `last_error` nem o id do cliente no Asaas.

## 10. Segurança

- Segredo de sessão em variável de ambiente; nenhum segredo no código.
- `configEasypanel.md` é apagado. Ele traz as URLs de conexão do Supabase de desenvolvimento e de produção, com senha, e está no histórico do Git. **Apagar o arquivo não apaga o histórico:** as duas senhas devem ser trocadas no Supabase, ou os projetos apagados.
- `/api/setup/admin` (criava admin sem login) e `/api/setup/seed` (apagava todos os pacientes sem login) deixam de existir.
- Limite de tentativas por IP no login e na recuperação de senha. O limite fica em memória e vale por instância; o IP vem de `x-forwarded-for`, então o app só deve ser acessível pelo proxy do Easypanel.
- Nunca vão para log: senha, hash, token de redefinição, link de redefinição, `SESSION_SECRET`, `JOBS_TOKEN`. CPF, e-mail e telefone saem mascarados.
- `typescript.ignoreBuildErrors` é removido do `next.config.mjs`: erro de tipo passa a quebrar o build.

## 11. Limpeza do repositório `dieta-app`

**Apagados**

- Deploy antigo: `Dockerfile`, `.dockerignore`, `.github/workflows/docker-publish.yml`.
- Supabase e AWS: `supabase/`, `server/db.ts`, `shared/schema.ts`, `drizzle.config.ts`, `lib/aws-config.ts`, `lib/crypto-utils.ts`, `AWS_SETUP.md`, `configEasypanel.md`.
- Documentos desatualizados: `README-SETUP.md`, `SETUP-PASSWORD-RESET.md`, `F1-STATUS.md`, `F2-STATUS.md`, `F3-STATUS.md`, `F2-CREDENCIAIS-TESTE.md`, `replit.md`.
- `package-lock.json`. O gerenciador passa a ser só o pnpm 9.15.0, como no `v0-tami-forms`.
- `lib/auth.ts`, substituído por `lib/auth/`.

**Dependências**

- Saem: `pg`, `@types/pg`, `@aws-sdk/client-ssm`, `drizzle-kit`, `@types/bcryptjs`, `bcryptjs`.
- Entram: `mysql2`, `vitest`.

**Alterados**

- `package.json`: scripts `test`, `test:watch`, `typecheck` e `db:sync-schema`; `packageManager`.
- `next.config.mjs`: sai `output: "standalone"` (só servia ao Docker) e `ignoreBuildErrors`. O PWA fica.
- `tsconfig.json`: sai o alias `@shared/*`.
- `README.md`: reescrito (instalação, variáveis, deploy, relação com o `v0-tami-forms`).

**Mantidos:** o PRD em `attached_assets/`, o `.replit` e o PWA.

## 12. Deploy no Easypanel

- Serviço App a partir do GitHub, Node 24.
- Build: `pnpm install && pnpm build`. Start: `pnpm start`. Porta `5000`.
- Health check: `GET /api/health`, que responde 200 quando o banco está acessível e 503 quando não está.
- **Ordem:** primeiro o `v0-tami-forms`, que cria as tabelas; depois o PlanA. Invertendo, o PlanA encerra no boot e o log diz o que falta. O Easypanel o reinicia até o banco estar pronto.
- Quando o schema mudar, o `v0-tami-forms` sobe antes do PlanA.
- O webhook de **produção** do Asaas só deve ser cadastrado depois que o PlanA estiver no ar com este trabalho, como o README do `v0-tami-forms` já avisa.

## 13. Testes (Vitest)

**PlanA**

- **Unitários:** hash e verificação de senha (inclui valor em formato antigo); sessão (criação, leitura, cookie adulterado, segredo errado); variáveis de ambiente; conferência do banco (tabela ausente, coluna ausente); token de redefinição; e-mail mascarado; validação de CPF; limite por IP.
- **Serviços com dublês**
  - login do cliente: CPF e senha certos; senha errada; CPF inexistente; paciente sem senha; e-mail único; e-mail repetido; marca `mustChangePassword` na sessão;
  - login do admin: certo e errado;
  - troca de senha: senha atual errada; senha curta; sucesso zera `must_change_password`;
  - recuperação: CPF inexistente; sucesso cria o token e uma mensagem por canal ativo; canal desligado não gera mensagem;
  - redefinição: token inexistente, usado e vencido; sucesso invalida os outros tokens;
  - admin: cadastro com CPF repetido; CPF inválido; exclusão de paciente com cobrança é recusada; redefinir senha marca a troca obrigatória;
  - plano `active` novo conclui os outros planos ativos do paciente;
  - primeiro admin: tabela vazia com variáveis; tabela vazia sem variáveis; tabela com admin.
- **Guardas e rotas:** sem sessão → 401; tipo errado → 401; paciente com troca pendente → 403 nas rotas de `/api/client/*`.
- **Repositórios contra o MySQL de verdade:** só com `TEST_DATABASE_URL`, num banco descartável. As tabelas são criadas com as migrations de `../v0-tami-forms/lib/db/migrations`; sem o repositório vizinho, estes testes são pulados.
- **Schema:** o teste da seção 4.4.

**`v0-tami-forms`**

- Migration `0002` aplicada num banco com mensagens já gravadas: `patient_id` é preenchido.
- Contrato de `notifications` com os campos novos, no fake em memória e no MySQL.
- `renderPasswordReset`: texto, escape do nome e partes do WhatsApp.
- Envio de `password_reset`: usa o link do `payload`; depois do envio o `payload` fica nulo; sem link vira falha definitiva.
- Endpoint de envio: 401 sem token; 400 para corpo inválido; 202 e envio depois da resposta.
- Os testes existentes continuam passando.

**Roteiro manual** (os dois apps locais, no mesmo banco)

1. Banco vazio: subir o `v0-tami-forms` e conferir as tabelas novas.
2. Subir o PlanA com `ADMIN_EMAIL` e `ADMIN_PASSWORD`; entrar como admin.
3. Criar um paciente pelo admin, entrar como ele e conferir a troca obrigatória.
4. Criar um plano para esse paciente e abri-lo como cliente.
5. Pedir a recuperação de senha e conferir a linha em `notifications` e o envio.
6. Abrir `/admin/pacientes/[id]` de um paciente vindo do quiz.
7. Subir o PlanA apontando para um banco sem tabelas e conferir que ele encerra com a lista do que falta.

## 14. Critérios de sucesso

- Com o banco vazio, subir o `v0-tami-forms` cria todas as tabelas usadas pelos dois apps.
- O PlanA não tem migration, e encerra no boot com mensagem clara se o banco não estiver pronto.
- Quem recebeu a senha temporária do `v0-tami-forms` entra no PlanA, é obrigado a trocá-la e vê o plano gerado.
- Paciente sem senha não entra.
- O admin criado pelas variáveis entra, usa todas as telas de hoje e vê o cadastro completo de um paciente.
- "Esqueci a senha" funciona sem o n8n, por e-mail e WhatsApp, e o link só serve uma vez.
- Um paciente nunca tem dois planos `active`.
- Não há segredo no código, rota de setup aberta, nem referência a Supabase, AWS ou Docker.
- Testes, `typecheck` e `next build` passam nos dois projetos.
