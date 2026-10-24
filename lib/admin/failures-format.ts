import type { Channel, FailedItemType } from "@/lib/repos/types"

// Importado pela página client: só tipos e funções puras, nada de servidor.

const TYPE_LABELS: Record<FailedItemType, string> = {
  payment: "Cobrança",
  plan_generation: "Geração de plano",
  notification: "Mensagem",
}

const CHANNEL_LABELS: Record<Channel, string> = { email: "E-mail", whatsapp: "WhatsApp" }

const KIND_LABELS: Record<string, string> = {
  payment_link: "link de pagamento",
  plan_ready: "plano pronto",
  password_reset: "redefinição de senha",
  plan_expiring_d5: "aviso de vencimento (5 dias)",
  plan_expiring_d2: "aviso de vencimento (2 dias)",
  plan_expiring_d0: "aviso de vencimento (no dia)",
}

const HINTS: Record<FailedItemType, string> = {
  payment: "Confira a chave do Asaas e os dados do paciente (CPF, e-mail, telefone).",
  plan_generation: "Confira a chave e o limite da Anthropic.",
  notification: "Confira o SMTP (e-mail) ou a Evolution API (WhatsApp) e o contato do paciente.",
}

export function failureTypeLabel(type: FailedItemType): string {
  return TYPE_LABELS[type]
}

/** `kind` desconhecido aparece como veio. */
export function notificationLabel(channel: Channel, kind: string): string {
  return `${TYPE_LABELS.notification} · ${CHANNEL_LABELS[channel]} · ${KIND_LABELS[kind] ?? kind}`
}

export function failureHint(type: FailedItemType): string {
  return HINTS[type]
}

const saoPauloParts = (seconds: boolean) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
    hourCycle: "h23",
  })

/** `dd/mm/aaaa hh:mm` (com `seconds`, `dd/mm/aaaa hh:mm:ss`) no horário de São Paulo. */
export function formatSaoPauloDateTime(iso: string, opts: { seconds?: boolean } = {}): string {
  const parts = Object.fromEntries(
    saoPauloParts(opts.seconds === true)
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  )
  const time = `${parts.hour}:${parts.minute}${opts.seconds ? `:${parts.second}` : ""}`
  return `${parts.day}/${parts.month}/${parts.year} ${time}`
}

/**
 * Dias de calendário de São Paulo (YYYY-MM-DD) → instantes ISO: `from` às 00:00:00.000 e `to` às 23:59:59.999
 * de São Paulo. UTC−3 fixo: o Brasil não tem horário de verão desde 2019.
 */
export function saoPauloDayRange(fromDay: string, toDay: string): { from: string; to: string } {
  return {
    from: new Date(`${fromDay}T00:00:00.000-03:00`).toISOString(),
    to: new Date(`${toDay}T23:59:59.999-03:00`).toISOString(),
  }
}
