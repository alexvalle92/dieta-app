# Configuração AWS Parameter Store para NutriPlan

Este guia explica como configurar as variáveis de ambiente do NutriPlan usando AWS Systems Manager Parameter Store.

## 📋 Pré-requisitos

1. Conta AWS ativa
2. AWS CLI instalado e configurado localmente (opcional)
3. Permissões IAM para acessar o Parameter Store

## 🔐 Variáveis de Ambiente Necessárias

As seguintes variáveis devem ser armazenadas no AWS Parameter Store:

### Supabase (Obrigatórias)
- `NEXT_PUBLIC_SUPABASE_URL` - URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave pública do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (privada) do Supabase

### Autenticação (Obrigatória)
- `JWT_SECRET` - Chave secreta para assinatura de JWT (mínimo 32 caracteres)

### Asaas (Opcional)
- `ASAAS_API_KEY` - Chave da API do Asaas
- `ASAAS_SANDBOX` - Modo sandbox (`true` ou `false`)

## 🚀 Configuração no AWS Parameter Store

### Opção 1: Via AWS Console

1. Acesse o [AWS Systems Manager Console](https://console.aws.amazon.com/systems-manager/)
2. No menu lateral, selecione **Parameter Store**
3. Clique em **Create parameter**

Para cada variável, configure:
- **Name**: `/nutriplan/NOME_DA_VARIAVEL` (ex: `/nutriplan/JWT_SECRET`)
- **Description**: Descrição da variável (opcional)
- **Type**: 
  - `String` para variáveis públicas (`NEXT_PUBLIC_*`)
  - `SecureString` para variáveis sensíveis (recomendado para todas as outras)
- **Value**: O valor da variável
- **Tags** (opcional): `Environment=production`, `App=nutriplan`

### Opção 2: Via AWS CLI

Execute os comandos abaixo substituindo os valores:

```bash
# Supabase
aws ssm put-parameter \
  --name "/nutriplan/NEXT_PUBLIC_SUPABASE_URL" \
  --value "https://seu-projeto.supabase.co" \
  --type "String" \
  --description "URL do projeto Supabase"

aws ssm put-parameter \
  --name "/nutriplan/NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --value "sua-chave-publica-supabase" \
  --type "String" \
  --description "Chave pública do Supabase"

aws ssm put-parameter \
  --name "/nutriplan/SUPABASE_SERVICE_ROLE_KEY" \
  --value "sua-chave-privada-supabase" \
  --type "SecureString" \
  --description "Chave de serviço do Supabase"

# Autenticação
aws ssm put-parameter \
  --name "/nutriplan/JWT_SECRET" \
  --value "sua-chave-jwt-secreta-minimo-32-caracteres" \
  --type "SecureString" \
  --description "Chave secreta para JWT"

# Asaas (opcional)
aws ssm put-parameter \
  --name "/nutriplan/ASAAS_API_KEY" \
  --value "sua-chave-asaas" \
  --type "SecureString" \
  --description "Chave da API Asaas"

aws ssm put-parameter \
  --name "/nutriplan/ASAAS_SANDBOX" \
  --value "true" \
  --type "String" \
  --description "Modo sandbox do Asaas"
```

## 🔑 Configuração de Credenciais AWS no Replit

Para que a aplicação acesse o Parameter Store, configure as credenciais AWS como **Secrets** no Replit:

1. No Replit, vá em **Tools** > **Secrets**
2. Adicione os seguintes secrets:

```
AWS_REGION=us-east-1  # ou sua região AWS
AWS_ACCESS_KEY_ID=sua-access-key-id
AWS_SECRET_ACCESS_KEY=sua-secret-access-key
AWS_PARAMETER_PREFIX=/nutriplan  # prefixo dos parâmetros (opcional)
```

### Criar IAM User para a Aplicação

1. No AWS Console, vá em **IAM** > **Users** > **Create user**
2. Nome: `nutriplan-app`
3. Em **Set permissions**, selecione **Attach policies directly**
4. Adicione a política abaixo (ou crie uma custom policy):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/nutriplan/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "*"
    }
  ]
}
```

5. Após criar o usuário, vá em **Security credentials** > **Create access key**
6. Selecione **Application running outside AWS**
7. Copie `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`
8. Cole esses valores nos Secrets do Replit

## 📝 Variáveis de Ambiente Locais

Para desenvolvimento local, use o arquivo `.env.local` (já configurado):

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://pcqteeblywfqlrbnqrjd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-privada
JWT_SECRET=sua-chave-jwt
ASAAS_API_KEY=sua-chave-asaas
ASAAS_SANDBOX=true
```

## 🔄 Como Funciona

1. **Desenvolvimento (local)**: A aplicação lê as variáveis de `.env.local`
2. **Produção (Replit)**: A aplicação detecta `NODE_ENV=production` e busca automaticamente as variáveis do AWS Parameter Store usando as credenciais configuradas

O código em `lib/aws-config.ts` gerencia isso automaticamente com cache para melhor performance.

## ✅ Verificação

Para verificar se está funcionando:

```bash
# No Replit, adicione um endpoint de teste (temporário)
# ou verifique os logs da aplicação durante o startup
```

## 🔒 Segurança

- ✅ Use `SecureString` para todas as variáveis sensíveis
- ✅ Nunca commite `.env.local` no Git (já está no `.gitignore`)
- ✅ Rotacione as chaves regularmente
- ✅ Use IAM roles com permissões mínimas necessárias
- ✅ Monitore acessos ao Parameter Store via CloudTrail

## 📚 Recursos

- [AWS Parameter Store Documentation](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

## ❓ Troubleshooting

### Erro: "No parameters found in AWS Parameter Store"
- Verifique se os parâmetros foram criados com o prefixo correto (`/nutriplan/`)
- Confirme a região AWS configurada

### Erro: "Access Denied"
- Verifique se as credenciais AWS estão corretas
- Confirme se a política IAM tem permissões de `ssm:GetParameters` e `kms:Decrypt`

### Erro: "Failed to load environment variables"
- Verifique a conexão com a AWS
- Confirme se `AWS_REGION` está configurado
- Verifique os logs para detalhes do erro
