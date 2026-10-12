# PlanA

Aplicação onde o cliente vê o plano alimentar depois de pagar, e onde a nutricionista administra os cadastros.

## 1. O que é

O PlanA é a continuação do quiz (`v0-tami-forms`). O quiz recebe as respostas, cobra no Asaas e, quando o pagamento é confirmado, gera o plano alimentar e cria uma senha temporária. O PlanA é onde essa pessoa entra.

- **Cliente:** entra com CPF e senha, é obrigado a trocar a senha temporária no primeiro acesso, vê o plano ativo e os anteriores, as receitas liberadas e seus dados. Recupera a senha por link enviado por e-mail e WhatsApp.
- **Admin:** cadastra pacientes, planos, receitas e configurações de refeição, redefine senhas e consulta o cadastro completo de cada paciente (respostas do quiz, cobranças, planos e mensagens).

**Os dois apps usam o mesmo MySQL.**

| | `v0-tami-forms` | PlanA (este) |
|---|---|---|
| Cria e altera as tabelas | **sim** (todas as migrations) | não |
| Envia e-mail e WhatsApp | **sim** (fila + job) | não: pede o envio ao `v0-tami-forms` |
| Fala com Asaas e IA | sim | não |
| Mostra o plano ao cliente | não | sim |

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
4. Em `DATABASE_URL`, use a **URL interna** do serviço MySQL. Em `FORMS_INTERNAL_URL`, a URL interna do `v0-tami-forms`.
5. Cadastre as variáveis da seção 4.
6. Health check: caminho `/api/health` (200 com o banco acessível, 503 sem).
7. Configure o domínio no proxy do Easypanel.

Se o PlanA subir antes do `v0-tami-forms` num banco novo, ele encerra com `boot.schema_missing` listando as tabelas que faltam; o Easypanel o reinicia até o banco estar pronto.

## 7. Schema

`lib/db/schema.ts` é uma **cópia** de `../v0-tami-forms/lib/db/schema.ts`, que é a fonte. O PlanA não tem migrations. Depois de mudar o schema no `v0-tami-forms`:

```bash
corepack pnpm db:sync-schema
```

Um teste confere que as duas cópias são iguais (quando o `v0-tami-forms` está ao lado).

## 8. Segurança

- O app deve ser acessível **só pelo proxy do Easypanel**. Os limites de tentativa (10 logins a cada 10 minutos e 5 pedidos de "esqueci a senha" a cada 15, por IP) usam o primeiro valor de `x-forwarded-for`, que qualquer um forja se acessar o app direto. Os limites ficam na memória e valem por instância.
- Nenhum segredo fica no código. `.env.local` é ignorado pelo Git.
- **Troque as senhas do Supabase e considere o segredo de sessão antigo comprometido.** Os arquivos `configEasypanel.md` (removido) e `.replit` (o bloco `[userenv]` foi removido) traziam as URLs de conexão do Supabase de desenvolvimento e de produção, com senha, e um `JWT_SECRET`, e ficaram no histórico do Git. Os dois PRDs em `attached_assets/` também traziam a chave `anon` e a `service_role` do Supabase (a `service_role` dá acesso total ao projeto, ignorando as regras de acesso por linha); as três linhas foram apagadas dos arquivos. Apagar os arquivos não apaga o histórico, e trocar a senha do banco **não** revoga essas chaves: no Supabase, gere um novo JWT secret do projeto (ou apague os projetos) e nunca reutilize aquele `JWT_SECRET`.
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

`docs/superpowers/specs` e `docs/superpowers/plans`.
