import type { AdminRepo, PatientRepo } from "@/lib/repos/types"
import { isAcceptablePassword } from "@/lib/validation/password"

export type ChangePasswordResult = "ok" | "wrong_current" | "invalid_new" | "not_found"

type HashPassword = (password: string) => Promise<string>
type VerifyPassword = (password: string, stored: string) => Promise<boolean>

async function currentMatches(verify: VerifyPassword, current: unknown, stored: string | null): Promise<boolean> {
  return typeof current === "string" && current !== "" && stored !== null && (await verify(current, stored))
}

/**
 * Troca de senha com a senha atual (cliente). A nova precisa ter 8 a 200 caracteres; o
 * `mustChangePassword` volta a falso, o que libera a navegação depois do primeiro acesso.
 */
export function createChangePatientPassword(d: {
  patients: Pick<PatientRepo, "getById" | "setPassword">
  hashPassword: HashPassword
  verifyPassword: VerifyPassword
}): (patientId: string, input: { currentPassword?: unknown; newPassword?: unknown }) => Promise<ChangePasswordResult> {
  return async function changePatientPassword(patientId, input) {
    if (!isAcceptablePassword(input.newPassword)) return "invalid_new"

    const patient = await d.patients.getById(patientId)
    if (!patient) return "not_found"
    if (!(await currentMatches(d.verifyPassword, input.currentPassword, patient.passwordHash))) return "wrong_current"

    const updated = await d.patients.setPassword(patientId, {
      passwordHash: await d.hashPassword(input.newPassword),
      mustChangePassword: false,
    })
    return updated ? "ok" : "not_found"
  }
}

/** Troca de senha do admin, com as mesmas regras. */
export function createChangeAdminPassword(d: {
  admins: Pick<AdminRepo, "getById" | "setPassword">
  hashPassword: HashPassword
  verifyPassword: VerifyPassword
}): (adminId: string, input: { currentPassword?: unknown; newPassword?: unknown }) => Promise<ChangePasswordResult> {
  return async function changeAdminPassword(adminId, input) {
    if (!isAcceptablePassword(input.newPassword)) return "invalid_new"

    const admin = await d.admins.getById(adminId)
    if (!admin) return "not_found"
    if (!(await currentMatches(d.verifyPassword, input.currentPassword, admin.passwordHash))) return "wrong_current"

    const updated = await d.admins.setPassword(adminId, await d.hashPassword(input.newPassword))
    return updated ? "ok" : "not_found"
  }
}
