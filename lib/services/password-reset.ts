import { maskEmail } from "@/lib/log"
import type { Channel, PatientRepo, ResetTokenRepo } from "@/lib/repos/types"
import { isValidCpf, onlyDigits } from "@/lib/validation/cpf"
import { isAcceptablePassword } from "@/lib/validation/password"

/** O link de redefinição vale 1 hora (§7.1 do spec). */
export const RESET_TOKEN_TTL_MS = 3_600_000

export type ResetRequestResult =
  | { kind: "invalid_cpf" }
  | { kind: "not_found" }
  | { kind: "sent"; maskedEmail: string; notificationIds: string[] }

/**
 * Pedido de "esqueci a senha" (§7.1): grava o token (só o hash) e uma mensagem por canal ativo.
 * O envio fica com o v0-tami-forms; quem chama pede o envio imediato com `notificationIds`.
 * Paciente sem telefone recebe só por e-mail: nunca se enfileira WhatsApp para o destinatário "55".
 */
export function createRequestPasswordReset(d: {
  patients: Pick<PatientRepo, "findByCpf">
  resetTokens: Pick<ResetTokenRepo, "createRequest">
  newToken: () => { token: string; hash: string }
  now: () => Date
  appUrl: string
  channels: Channel[]
}): (cpf: unknown) => Promise<ResetRequestResult> {
  return async function requestPasswordReset(cpf) {
    if (typeof cpf !== "string" || !isValidCpf(cpf)) return { kind: "invalid_cpf" }

    const patient = await d.patients.findByCpf(onlyDigits(cpf))
    if (!patient) return { kind: "not_found" }

    const recipients: { channel: Channel; recipient: string }[] = []
    for (const channel of d.channels) {
      if (channel === "email") recipients.push({ channel, recipient: patient.email })
      else if (patient.phone) recipients.push({ channel, recipient: `55${patient.phone}` })
    }

    const now = d.now()
    const { token, hash } = d.newToken()
    const { notificationIds } = await d.resetTokens.createRequest({
      patientId: patient.id,
      tokenHash: hash,
      expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
      link: `${d.appUrl.replace(/\/+$/, "")}/cliente/redefinir-senha/${token}`,
      recipients,
      now,
    })
    return { kind: "sent", maskedEmail: maskEmail(patient.email), notificationIds }
  }
}

/** Redefinição com o token do link (§7.2): senha nova de 8 a 200 caracteres; token de uso único. */
export function createRedeemPasswordReset(d: {
  resetTokens: Pick<ResetTokenRepo, "redeem">
  hashPassword: (password: string) => Promise<string>
  hashToken: (token: string) => string
  now: () => Date
}): (input: { token?: unknown; newPassword?: unknown }) => Promise<"ok" | "invalid_new" | "invalid" | "expired"> {
  return async function redeemPasswordReset(input) {
    if (!isAcceptablePassword(input.newPassword)) return "invalid_new"
    if (typeof input.token !== "string" || input.token === "") return "invalid"

    return d.resetTokens.redeem({
      tokenHash: d.hashToken(input.token),
      passwordHash: await d.hashPassword(input.newPassword),
      now: d.now(),
    })
  }
}
