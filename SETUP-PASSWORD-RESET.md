# Configuração da Funcionalidade "Esqueci Minha Senha"

## ⚠️ Ação Necessária: Criar Tabela no Supabase

A funcionalidade de recuperação de senha requer a criação da tabela `password_reset_tokens` no seu banco de dados Supabase.

## Como Criar a Tabela

### Passo 1: Acessar o SQL Editor do Supabase

1. Acesse seu projeto no Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto: **pcqteeblywfqlrbnqrjd**
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar o SQL de Criação

Copie e cole o seguinte SQL no editor e clique em **RUN**:

```sql
-- Criar tabela para tokens de recuperação de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_patient_id ON password_reset_tokens(patient_id);

-- Adicionar comentário na tabela
COMMENT ON TABLE password_reset_tokens IS 'Tokens temporários para recuperação de senha (validade: 1 hora)';
```

### Passo 3: Verificar Criação

Após executar o SQL, você deve ver uma mensagem de sucesso. Você pode verificar se a tabela foi criada:

1. No menu lateral, clique em **Table Editor**
2. Procure pela tabela **password_reset_tokens**
3. Você deve ver as colunas: id, patient_id, token, expires_at, used, created_at

## Como Funciona

### Fluxo de Recuperação de Senha

1. **Paciente acessa** `/cliente/esqueci-senha`
2. **Informa o CPF** cadastrado
3. **Sistema gera** um token único com validade de 1 hora
4. **Sistema retorna** um link de recuperação (em produção, este link seria enviado por email/SMS)
5. **Paciente clica** no link `/cliente/redefinir-senha/[token]`
6. **Sistema valida** o token (se está válido, não expirado, não usado)
7. **Paciente define** nova senha
8. **Token é marcado** como usado para evitar reutilização

### Segurança

- ✅ Tokens únicos (UUID v4)
- ✅ Expiração automática em 1 hora
- ✅ Tokens de uso único (flag `used`)
- ✅ Tokens antigos invalidados ao solicitar novo reset
- ✅ Validação de CPF antes de gerar token
- ✅ Hash bcrypt na nova senha

## Testando a Funcionalidade

Após criar a tabela:

1. Acesse: `http://localhost:5000/cliente/login`
2. Clique em **"Esqueci minha senha"**
3. Informe um CPF válido (ex: `12345678901` - paciente teste)
4. Copie o link de recuperação retornado
5. Cole o link no navegador
6. Defina uma nova senha
7. Faça login com a nova senha

## Estrutura da Tabela

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Identificador único do token |
| `patient_id` | UUID | Referência ao paciente (FK) |
| `token` | VARCHAR(255) | Token único para recuperação |
| `expires_at` | TIMESTAMPTZ | Data/hora de expiração |
| `used` | BOOLEAN | Indica se o token já foi usado |
| `created_at` | TIMESTAMPTZ | Data/hora de criação |

## Observações

- Esta tabela também está documentada em `supabase/schema.sql`
- Em produção, o link de recuperação seria enviado via email/SMS (integração futura)
- Tokens expirados são mantidos no banco para auditoria
- A limpeza de tokens antigos pode ser feita periodicamente via cron job
