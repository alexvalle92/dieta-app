import { describe, expect, it } from "vitest"
import { channelLabel, formatAnswer, notificationKindLabel, planOriginLabel } from "@/lib/admin/record-format"

describe("formatAnswer", () => {
  it("lista de respostas vira texto separado por vírgula", () => {
    expect(formatAnswer(["Pão", "Café"])).toBe("Pão, Café")
  })

  it("número e booleano viram texto legível", () => {
    expect(formatAnswer(75)).toBe("75")
    expect(formatAnswer(true)).toBe("Sim")
    expect(formatAnswer(false)).toBe("Não")
  })

  it.each([null, undefined, "", "   ", []])("%j → Não informado", (value) => {
    expect(formatAnswer(value)).toBe("Não informado")
  })

  it("objeto vira JSON compacto", () => {
    expect(formatAnswer({ a: 1 })).toBe('{"a":1}')
  })

  it("texto longo é cortado em 500 caracteres com reticências", () => {
    const result = formatAnswer("x".repeat(600))
    expect(result).toBe(`${"x".repeat(500)}…`)
  })

  it("texto de até 500 caracteres passa inteiro", () => {
    expect(formatAnswer("y".repeat(500))).toBe("y".repeat(500))
  })

  it("HTML aparece como texto cru (quem renderiza escapa)", () => {
    expect(formatAnswer("<script>alert(1)</script>")).toBe("<script>alert(1)</script>")
  })
})

describe("rótulos", () => {
  it("tipo de mensagem", () => {
    expect(notificationKindLabel("payment_link")).toBe("Link de pagamento")
    expect(notificationKindLabel("plan_ready")).toBe("Plano pronto")
    expect(notificationKindLabel("password_reset")).toBe("Redefinição de senha")
    expect(notificationKindLabel("algo_novo")).toBe("algo_novo")
  })

  it("canal", () => {
    expect(channelLabel("email")).toBe("E-mail")
    expect(channelLabel("whatsapp")).toBe("WhatsApp")
    expect(channelLabel("sms")).toBe("sms")
  })

  it("origem do plano", () => {
    expect(planOriginLabel("ai")).toBe("Gerado pela IA")
    expect(planOriginLabel("admin")).toBe("Criado pelo admin")
  })
})
