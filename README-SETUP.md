# NutriPlan - Guia de Configuração Inicial (F1)

## Passo 1: Configurar o Banco de Dados

### Opção A: Via SQL Editor do Supabase (Recomendado)

1. Acesse seu projeto no Supabase: https://supabase.com/dashboard
2. Vá para **SQL Editor**
3. Copie e execute o conteúdo do arquivo `supabase/schema.sql`
4. Aguarde a conclusão da execução

### Opção B: Via API

Faça uma requisição POST para:
```bash
curl -X POST https://SEU-DOMINIO/api/setup/init-db
```

## Passo 2: Configurar o Primeiro Administrador

1. Acesse: `https://SEU-DOMINIO/setup`
2. Preencha o formulário com os dados da nutricionista:
   - Nome completo
   - E-mail
   - CPF
   - Telefone
   - CRN (registro profissional)
   - Senha

3. Clique em "Criar Administrador e Inicializar Sistema"

4. O sistema automaticamente:
   - Criará o administrador
   - Criará 5 pacientes fictícios para testes
   - Redirecionará para a página de login

## Passo 3: Testar o Sistema

### Pacientes Fictícios Criados

Todos os pacientes têm a senha padrão: `senha123`

1. **Maria Silva**
   - Email: maria.silva@email.com
   - CPF: 123.456.789-01

2. **João Santos**
   - Email: joao.santos@email.com
   - CPF: 234.567.890-12

3. **Ana Paula Oliveira**
   - Email: ana.oliveira@email.com
   - CPF: 345.678.901-23

4. **Carlos Eduardo Lima**
   - Email: carlos.lima@email.com
   - CPF: 456.789.012-34

5. **Fernanda Costa**
   - Email: fernanda.costa@email.com
   - CPF: 567.890.123-45

### Testar Login

- **Área do Cliente**: Use qualquer e-mail dos pacientes acima com senha `senha123`
- **Área Admin**: Use o e-mail e senha que você cadastrou no setup

## Estrutura do Banco de Dados

### Tabelas Criadas:

- **admins**: Administradores (nutricionistas)
- **patients**: Pacientes (já existia, adicionado campo password)
- **meal_plans**: Planos alimentares
- **recipes**: Receitas
- **payments**: Pagamentos (já existia)

## Próximos Passos (F2 em diante)

Após concluir F1, você estará pronto para:
- F2: Implementar autenticação funcional
- F3: Gerenciamento de pacientes
- F4: Gerenciamento de planos alimentares
- F5: Gerenciamento de receitas
