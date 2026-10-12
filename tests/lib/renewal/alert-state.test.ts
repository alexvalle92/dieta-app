import { describe, expect, it } from "vitest"
import { alertView } from "@/lib/renewal/alert-state"
import type { RenewalStatus } from "@/lib/renewal/rules"

const PAY_URL = "https://pay/1"

function view(variant: "list" | "detail", daysLeft: number | null, renewalStatus: RenewalStatus, paymentUrl: string | null = PAY_URL) {
  return alertView({ variant, daysLeft, renewalStatus, paymentUrl })
}

describe("alertView: lista", () => {
  it("não mostra nada com mais de 5 dias, d5 e d2, em qualquer estado", () => {
    for (const days of [30, 6, 5, 4, 3, 2, 1]) {
      for (const status of ["none", "awaiting_payment", "payment_expired", "paid"] as const) {
        expect(view("list", days, status)).toBeNull()
      }
    }
  })

  it("d0 segue o estado da renovação", () => {
    expect(view("list", 0, "none")).toEqual({ kind: "form", stage: "d0" })
    expect(view("list", 0, "awaiting_payment")).toEqual({ kind: "pay", stage: "d0", paymentUrl: PAY_URL })
    expect(view("list", 0, "payment_expired")).toEqual({ kind: "form", stage: "d0" })
    expect(view("list", 0, "paid")).toEqual({ kind: "paid" })
  })

  it("vencido segue o estado da renovação", () => {
    expect(view("list", -1, "none")).toEqual({ kind: "form", stage: "expired" })
    expect(view("list", -1, "awaiting_payment")).toEqual({ kind: "pay", stage: "expired", paymentUrl: PAY_URL })
    expect(view("list", -10, "payment_expired")).toEqual({ kind: "payment_expired" })
    expect(view("list", -1, "paid")).toEqual({ kind: "paid" })
  })
})

describe("alertView: detalhe", () => {
  it("não mostra nada com mais de 5 dias, em qualquer estado", () => {
    for (const days of [30, 6]) {
      for (const status of ["none", "awaiting_payment", "payment_expired", "paid"] as const) {
        expect(view("detail", days, status)).toBeNull()
      }
    }
  })

  it("d5 só avisa, qualquer que seja a renovação, menos paga", () => {
    for (const days of [5, 4, 3]) {
      expect(view("detail", days, "none")).toEqual({ kind: "d5" })
      expect(view("detail", days, "awaiting_payment")).toEqual({ kind: "d5" })
      expect(view("detail", days, "payment_expired")).toEqual({ kind: "d5" })
      expect(view("detail", days, "paid")).toEqual({ kind: "paid" })
    }
  })

  it("d2 e d0 seguem o estado da renovação", () => {
    for (const [days, stage] of [[2, "d2"], [1, "d2"], [0, "d0"]] as const) {
      expect(view("detail", days, "none")).toEqual({ kind: "form", stage })
      expect(view("detail", days, "awaiting_payment")).toEqual({ kind: "pay", stage, paymentUrl: PAY_URL })
      expect(view("detail", days, "payment_expired")).toEqual({ kind: "form", stage })
      expect(view("detail", days, "paid")).toEqual({ kind: "paid" })
    }
  })

  it("vencido volta ao formulário em todos os estados, menos pago", () => {
    expect(view("detail", -1, "none")).toEqual({ kind: "form", stage: "expired" })
    expect(view("detail", -1, "awaiting_payment")).toEqual({ kind: "form", stage: "expired" })
    expect(view("detail", -1, "payment_expired")).toEqual({ kind: "form", stage: "expired" })
    expect(view("detail", -1, "paid")).toEqual({ kind: "paid" })
  })
})

describe("alertView: casos gerais", () => {
  it("sem data de fim não mostra nada", () => {
    for (const variant of ["list", "detail"] as const) {
      for (const status of ["none", "awaiting_payment", "payment_expired", "paid"] as const) {
        expect(view(variant, null, status)).toBeNull()
      }
    }
  })

  it("repassa o link de pagamento, inclusive nulo", () => {
    expect(view("list", 0, "awaiting_payment", null)).toEqual({ kind: "pay", stage: "d0", paymentUrl: null })
    expect(view("detail", 2, "awaiting_payment", "https://x")).toEqual({ kind: "pay", stage: "d2", paymentUrl: "https://x" })
  })
})
