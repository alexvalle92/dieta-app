// Contratos dos repositórios do PlanA. Só `lib/repos/` importa o Drizzle e o schema; serviços e rotas
// dependem destes tipos. Datas são `Date` (UTC); datas de calendário, `YYYY-MM-DD`.

export type Channel = "email" | "whatsapp"

export type PatientRow = {
  id: string
  name: string
  cpf: string
  email: string
  phone: string
  /** Nulo até a primeira geração do plano (ou até o admin definir uma senha). */
  passwordHash: string | null
  mustChangePassword: boolean
  createdAt: Date
}

export interface PatientRepo {
  findByCpf(cpf: string): Promise<PatientRow | null>
  /** No máximo 2 linhas: quem chama só precisa saber se há exatamente uma. */
  findByEmail(email: string): Promise<PatientRow[]>
  getById(id: string): Promise<PatientRow | null>
  /** `created_at` decrescente; `search` vazio lista todos; senão LIKE em nome, e-mail e CPF. */
  list(search: string): Promise<PatientRow[]>
  /** Grava `must_change_password = true` e `password_set_at`. */
  create(d: {
    name: string
    cpf: string
    email: string
    phone: string
    passwordHash: string
  }): Promise<PatientRow | "cpf_taken">
  update(id: string, d: { name: string; email: string; phone: string }): Promise<PatientRow | null>
  setPassword(id: string, d: { passwordHash: string; mustChangePassword: boolean }): Promise<boolean>
  /**
   * `has_history`: existe cobrança ou envio do quiz. Senão apaga tokens, mensagens e planos do
   * paciente, e o paciente, numa transação (§9.1 do spec).
   */
  delete(id: string): Promise<"deleted" | "not_found" | "has_history">
}

export type AdminRow = { id: string; name: string; email: string; passwordHash: string }

export interface AdminRepo {
  findByEmail(email: string): Promise<AdminRow | null>
  getById(id: string): Promise<AdminRow | null>
  count(): Promise<number>
  create(d: { name: string; email: string; passwordHash: string }): Promise<"created" | "email_taken">
  setPassword(id: string, passwordHash: string): Promise<boolean>
}

export interface ResetTokenRepo {
  /** Uma transação: o token e uma mensagem `password_reset` por destinatário (§7.1, passo 4). */
  createRequest(d: {
    patientId: string
    tokenHash: string
    expiresAt: Date
    link: string
    recipients: { channel: Channel; recipient: string }[]
    now: Date
  }): Promise<{ notificationIds: string[] }>
  /** Uma transação (§7.2, passo 3). `invalid`: inexistente ou usado. `expired`: `expires_at <= now`. */
  redeem(d: { tokenHash: string; passwordHash: string; now: Date }): Promise<"ok" | "invalid" | "expired">
}
