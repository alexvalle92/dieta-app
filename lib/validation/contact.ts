import { z } from "zod"

const emailSchema = z.string().email().max(254)

/** E-mail aparado e em minúsculas, ou `null` se o formato é inválido (ou passa de 254 caracteres). */
export function normalizeEmail(raw: string): string | null {
  const parsed = emailSchema.safeParse(raw.trim().toLowerCase())
  return parsed.success ? parsed.data : null
}

/**
 * Telefone como o quiz grava (`patients.phone`): só dígitos, sem o DDI 55, com 10 ou 11 dígitos
 * (DDD + número). O envio de WhatsApp acrescenta o 55; um número fora dessa forma iria para a
 * pessoa errada. Vazio ("" ou só espaços) = sem telefone; `null` = preenchido e inválido.
 */
export function normalizePhone(raw: string | undefined): string | null {
  if (raw === undefined || raw.trim() === "") return ""
  const digits = raw.replace(/\D/g, "")
  const national = (digits.length === 12 || digits.length === 13) && digits.startsWith("55") ? digits.slice(2) : digits
  return national.length === 10 || national.length === 11 ? national : null
}
