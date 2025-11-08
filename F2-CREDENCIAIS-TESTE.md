# F2 - Credenciais de Teste

## Pacientes de Teste

Todos os pacientes usam a senha: `senha123`

### Login com CPF (apenas números ou formatado)

1. **Maria Silva**
   - CPF: `123.456.789-01` ou `12345678901`
   - Email: maria.silva@email.com
   - Senha: `senha123`

2. **João Santos**
   - CPF: `234.567.890-12` ou `23456789012`
   - Email: joao.santos@email.com
   - Senha: `senha123`

3. **Ana Paula Oliveira**
   - CPF: `345.678.901-23` ou `34567890123`
   - Email: ana.oliveira@email.com
   - Senha: `senha123`

4. **Carlos Eduardo Lima**
   - CPF: `456.789.012-34` ou `45678901234`
   - Email: carlos.lima@email.com
   - Senha: `senha123`

5. **Fernanda Costa**
   - CPF: `567.890.123-45` ou `56789012345`
   - Email: fernanda.costa@email.com
   - Senha: `senha123`

## Admin (Nutricionista)

A credencial do admin é definida durante o setup em `/setup`.

Use o email e senha que você configurou durante o primeiro acesso.

## Páginas de Teste

- **Login do Cliente**: `/cliente/login`
- **Login do Admin**: `/admin/login`
- **Redefinir Senha (Cliente)**: `/cliente/recuperar-senha` (requer autenticação)
- **Dashboard Cliente**: `/cliente/dashboard` (protegido)
- **Dashboard Admin**: `/admin/dashboard` (protegido)

## APIs Implementadas

### Autenticação
- `POST /api/auth/login-cliente` - Login de paciente com CPF + senha
- `POST /api/auth/login-admin` - Login de admin com email + senha
- `POST /api/auth/logout` - Logout (limpa sessão)
- `GET /api/auth/session` - Verifica sessão atual

### Senha
- `POST /api/auth/reset-password` - Cliente redefinir própria senha
- `POST /api/admin/reset-patient-password` - Admin redefinir senha de paciente

### Pacientes
- `POST /api/patients/create` - Admin criar novo paciente

## Segurança

- Sessões assinadas com JWT (jose library)
- Cookies HTTP-only
- Senhas hash com bcrypt (10 rounds)
- JWT_SECRET obrigatório com mínimo 32 caracteres
- Middleware protege rotas `/cliente/*` e `/admin/*`
