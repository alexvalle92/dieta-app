import { z } from "zod"

const emailSchema = z.string().email().max(254)

/** E-mail aparado e em minúsculas, ou `null` se o formato é inválido (ou passa de 254 caracteres). */
export function normalizeEmail(raw: string): string | null {
  const parsed = emailSchema.safeParse(raw.trim().toLowerCase())
  return parsed.success ? parsed.data : null
}

/** Só os dígitos do telefone; "" quando ausente ou com mais de 13 dígitos (limite da coluna). */
export function normalizePhone(raw: string | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "")
  return digits.length > 13 ? "" : digits
}
