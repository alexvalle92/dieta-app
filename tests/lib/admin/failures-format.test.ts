import { describe, expect, it } from "vitest"
import {
  failureHint,
  failureTypeLabel,
  formatSaoPauloDateTime,
  notificationLabel,
  saoPauloDayRange,
} from "@/lib/admin/failures-format"

describe("failureTypeLabel", () => {
  it("rótulos dos tipos", () => {
    expect(failureTypeLabel("payment")).toBe("Cobrança")
    expect(failureTypeLabel("plan_generation")).toBe("Geração de plano")
    expect(failureTypeLabel("notification")).toBe("Mensagem")
  })
})

describe("notificationLabel", () => {
  it.each([
    ["email", "payment_link", "Mensagem · E-mail · link de pagamento"],
    ["whatsapp", "plan_ready", "Mensagem · WhatsApp · plano pronto"],
    ["email", "password_reset", "Mensagem · E-mail · redefinição de senha"],
    ["email", "plan_expiring_d5", "Mensagem · E-mail · aviso de vencimento (5 dias)"],
    ["whatsapp", "plan_expiring_d2", "Mensagem · WhatsApp · aviso de vencimento (2 dias)"],
    ["email", "plan_expiring_d0", "Mensagem · E-mail · aviso de vencimento (no dia)"],
    ["email", "novo_tipo", "Mensagem · E-mail · novo_tipo"],
  ] as const)("notificationLabel(%s, %s)", (channel, kind, expected) => {
    expect(notificationLabel(channel, kind)).toBe(expected)
  })
})

describe("failureHint", () => {
  it("dicas por tipo", () => {
    expect(failureHint("payment")).toBe("Confira a chave do Asaas e os dados do paciente (CPF, e-mail, telefone).")
    expect(failureHint("plan_generation")).toBe("Confira a chave e o limite da Anthropic.")
    expect(failureHint("notification")).toBe(
      "Confira o SMTP (e-mail) ou a Evolution API (WhatsApp) e o contato do paciente.",
    )
  })
})

describe("formatSaoPauloDateTime", () => {
  it("formata no horário de São Paulo", () => {
    expect(formatSaoPauloDateTime("2026-10-24T13:05:00.000Z")).toBe("24/10/2026 10:05")
    expect(formatSaoPauloDateTime("2026-10-25T02:30:00.000Z")).toBe("24/10/2026 23:30")
    expect(formatSaoPauloDateTime("2026-10-24T13:05:00.000Z", { seconds: true })).toBe("24/10/2026 10:05:00")
  })
})

describe("saoPauloDayRange", () => {
  it("inclui o dia inteiro de São Paulo", () => {
    expect(saoPauloDayRange("2026-10-24", "2026-10-24")).toEqual({
      from: "2026-10-24T03:00:00.000Z",
      to: "2026-10-25T02:59:59.999Z",
    })
  })

  it("um erro às 23h30 de São Paulo cai dentro do dia", () => {
    const { from, to } = saoPauloDayRange("2026-10-24", "2026-10-24")
    const ts = new Date("2026-10-25T02:30:00.000Z")
    expect(ts >= new Date(from) && ts < new Date(to)).toBe(true)
  })
})
