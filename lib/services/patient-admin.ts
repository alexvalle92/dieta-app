import type { PatientRepo, PatientRow } from "@/lib/repos/types"
import { normalizeEmail, normalizePhone } from "@/lib/validation/contact"
import { isValidCpf, onlyDigits } from "@/lib/validation/cpf"
import { isAcceptablePassword } from "@/lib/validation/password"

/** `patients.name` é VARCHAR(200). */
const MAX_NAME_LENGTH = 200

export type CreatePatientResult =
  | { ok: true; patient: PatientRow }
  | {
      ok: false
      reason:
        | "missing_fields"
        | "invalid_name"
        | "invalid_cpf"
        | "invalid_email"
        | "invalid_phone"
        | "invalid_password"
        | "cpf_taken"
    }

export type PatientInput = { name?: unknown; cpf?: unknown; email?: unknown; phone?: unknown; password?: unknown }

const nonEmptyText = (value: unknown): value is string => typeof value === "string" && value.trim() !== ""

/** Telefone opcional: ausente → ""; texto → normalizado; outro tipo ou formato → `null` (inválido). */
const phoneOf = (value: unknown): string | null =>
  value === undefined || value === null ? "" : typeof value === "string" ? normalizePhone(value) : null

/**
 * Cadastro e manutenção de pacientes pelo admin (§9.1 do spec). A identidade é o CPF: o e-mail
 * pode repetir. Todo paciente criado ou com a senha redefinida pelo admin precisa trocá-la no
 * primeiro acesso (`mustChangePassword`).
 */
export function createPatientAdmin(d: {
  patients: PatientRepo
  hashPassword: (password: string) => Promise<string>
}) {
  return {
    async create(input: PatientInput): Promise<CreatePatientResult> {
      if (
        !nonEmptyText(input.name) ||
        !nonEmptyText(input.cpf) ||
        !nonEmptyText(input.email) ||
        typeof input.password !== "string" ||
        input.password === ""
      ) {
        return { ok: false, reason: "missing_fields" }
      }

      const name = input.name.trim()
      if (name.length > MAX_NAME_LENGTH) return { ok: false, reason: "invalid_name" }
      if (!isValidCpf(input.cpf)) return { ok: false, reason: "invalid_cpf" }
      const email = normalizeEmail(input.email)
      if (!email) return { ok: false, reason: "invalid_email" }
      const phone = phoneOf(input.phone)
      if (phone === null) return { ok: false, reason: "invalid_phone" }
      if (!isAcceptablePassword(input.password)) return { ok: false, reason: "invalid_password" }

      const created = await d.patients.create({
        name,
        cpf: onlyDigits(input.cpf),
        email,
        phone,
        passwordHash: await d.hashPassword(input.password),
      })
      if (created === "cpf_taken") return { ok: false, reason: "cpf_taken" }
      return { ok: true, patient: created }
    },

    async update(
      id: string,
      input: { name?: unknown; email?: unknown; phone?: unknown },
    ): Promise<PatientRow | "not_found" | "missing_fields" | "invalid_name" | "invalid_email" | "invalid_phone"> {
      if (!nonEmptyText(input.name) || !nonEmptyText(input.email)) return "missing_fields"
      const name = input.name.trim()
      if (name.length > MAX_NAME_LENGTH) return "invalid_name"
      const email = normalizeEmail(input.email)
      if (!email) return "invalid_email"
      const phone = phoneOf(input.phone)
      if (phone === null) return "invalid_phone"

      const updated = await d.patients.update(id, { name, email, phone })
      return updated ?? "not_found"
    },

    remove(id: string): Promise<"deleted" | "not_found" | "has_history"> {
      return d.patients.delete(id)
    },

    /** Grava a senha e marca a troca obrigatória (§6.5 do spec). */
    async resetPassword(id: string, newPassword: unknown): Promise<"ok" | "invalid_password" | "not_found"> {
      if (!isAcceptablePassword(newPassword)) return "invalid_password"
      const updated = await d.patients.setPassword(id, {
        passwordHash: await d.hashPassword(newPassword),
        mustChangePassword: true,
      })
      return updated ? "ok" : "not_found"
    },
  }
}

export type PatientAdmin = ReturnType<typeof createPatientAdmin>
