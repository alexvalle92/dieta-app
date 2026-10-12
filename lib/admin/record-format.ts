const MAX_ANSWER_CHARS = 500

/**
 * Texto de uma resposta do quiz para a tela do admin. Sempre texto puro: quem renderiza o coloca
 * num nó de texto do React, que escapa o HTML (as respostas vêm da internet).
 */
export function formatAnswer(value: unknown): string {
  if (value === null || value === undefined) return "Não informado"
  if (typeof value === "boolean") return value ? "Sim" : "Não"
  if (typeof value === "number") return String(value)

  let text: string
  if (typeof value === "string") text = value
  else if (Array.isArray(value)) text = value.map((item) => formatAnswer(item)).filter((item) => item !== "Não informado").join(", ")
  else text = JSON.stringify(value)

  if (text.trim() === "") return "Não informado"
  return text.length > MAX_ANSWER_CHARS ? `${text.slice(0, MAX_ANSWER_CHARS)}…` : text
}

const KIND_LABELS: Record<string, string> = {
  payment_link: "Link de pagamento",
  plan_ready: "Plano pronto",
  password_reset: "Redefinição de senha",
}

const CHANNEL_LABELS: Record<string, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
}

export const notificationKindLabel = (kind: string): string => KIND_LABELS[kind] ?? kind

export const channelLabel = (channel: string): string => CHANNEL_LABELS[channel] ?? channel

export const planOriginLabel = (origin: "ai" | "admin"): string =>
  origin === "ai" ? "Gerado pela IA" : "Criado pelo admin"
