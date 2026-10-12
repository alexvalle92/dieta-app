import type { Session } from "@/lib/auth/session-token"
import type { AdminRepo, PatientRepo } from "@/lib/repos/types"
import { normalizeEmail } from "@/lib/validation/contact"
import { onlyDigits } from "@/lib/validation/cpf"
import { MAX_PASSWORD_LENGTH } from "@/lib/validation/password"

export type LoginResult = { ok: true; session: Session } | { ok: false }

type VerifyPassword = (password: string, stored: string) => Promise<boolean>

const REFUSED: LoginResult = { ok: false }

/** Senha de login: texto não vazio de até 200 caracteres (um corpo gigante nunca chega ao scrypt). */
const isLoginPassword = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= MAX_PASSWORD_LENGTH

/**
 * Login do cliente por CPF (11 dígitos) ou e-mail (só se um único paciente o usa).
 * Toda recusa é igual: CPF/e-mail desconhecido, e-mail repetido, paciente sem senha (ainda não
 * pagou) e senha errada. Quando não há credencial para conferir, o scrypt roda contra um hash
 * fixo, para o tempo de resposta não revelar se o CPF existe.
 */
export function createLoginPatient(d: {
  patients: Pick<PatientRepo, "findByCpf" | "findByEmail">
  verifyPassword: VerifyPassword
  /** Hash scrypt fixo, verificado quando não há paciente. */
  dummyHash: string
}): (input: { cpf?: unknown; email?: unknown; password?: unknown }) => Promise<LoginResult> {
  return async function loginPatient(input) {
    if (!isLoginPassword(input.password)) return REFUSED
    const password = input.password

    let patient = null
    if (typeof input.cpf === "string" && input.cpf !== "") {
      const digits = onlyDigits(input.cpf)
      if (digits.length === 11) patient = await d.patients.findByCpf(digits)
    } else if (typeof input.email === "string") {
      const email = normalizeEmail(input.email)
      if (email) {
        const rows = await d.patients.findByEmail(email)
        if (rows.length === 1) patient = rows[0]
      }
    } else {
      return REFUSED
    }

    if (!patient || !patient.passwordHash) {
      await d.verifyPassword(password, d.dummyHash)
      return REFUSED
    }
    if (!(await d.verifyPassword(password, patient.passwordHash))) return REFUSED

    return {
      ok: true,
      session: {
        userId: patient.id,
        userType: "patient",
        name: patient.name,
        email: patient.email,
        mustChangePassword: patient.mustChangePassword,
      },
    }
  }
}

/** Login do admin por e-mail (único) e senha, com a mesma recusa genérica. */
export function createLoginAdmin(d: {
  admins: Pick<AdminRepo, "findByEmail">
  verifyPassword: VerifyPassword
  dummyHash: string
}): (input: { email?: unknown; password?: unknown }) => Promise<LoginResult> {
  return async function loginAdmin(input) {
    if (!isLoginPassword(input.password) || typeof input.email !== "string") return REFUSED
    const password = input.password

    const email = normalizeEmail(input.email)
    const admin = email ? await d.admins.findByEmail(email) : null

    if (!admin) {
      await d.verifyPassword(password, d.dummyHash)
      return REFUSED
    }
    if (!(await d.verifyPassword(password, admin.passwordHash))) return REFUSED

    return {
      ok: true,
      session: {
        userId: admin.id,
        userType: "admin",
        name: admin.name,
        email: admin.email,
        mustChangePassword: false,
      },
    }
  }
}
