// Qual alerta de vencimento o cliente vê (spec de vencimento e renovação, §8.3).
// Função pura: a decisão sai do estado da renovação, não de datas de cobrança.
import { expiryStage, type RenewalStatus } from "./rules"

export type AlertStage = "d2" | "d0" | "expired"

export type AlertView =
  | { kind: "d5" }
  | { kind: "form"; stage: AlertStage }
  | { kind: "pay"; stage: AlertStage; paymentUrl: string | null }
  | { kind: "payment_expired" }
  | { kind: "paid" }

export function alertView(d: {
  variant: "list" | "detail"
  daysLeft: number | null
  renewalStatus: RenewalStatus
  paymentUrl: string | null
}): AlertView | null {
  const stage = expiryStage(d.daysLeft)
  if (stage === null) return null

  // Na listagem só aparecem o dia do vencimento e o plano vencido.
  if (d.variant === "list" && (stage === "d5" || stage === "d2")) return null

  // Pago vale em qualquer estágio em que o alerta aparece.
  if (d.renewalStatus === "paid") return { kind: "paid" }

  // No detalhe, faltando de 3 a 5 dias, só há o aviso.
  if (stage === "d5") return { kind: "d5" }

  if (d.renewalStatus === "awaiting_payment") {
    // No detalhe de um plano já vencido o alerta volta ao formulário.
    if (d.variant === "detail" && stage === "expired") return { kind: "form", stage }
    return { kind: "pay", stage, paymentUrl: d.paymentUrl }
  }

  // O prazo de pagamento vencido só tem aviso próprio na listagem, com o plano vencido.
  if (d.renewalStatus === "payment_expired" && d.variant === "list" && stage === "expired") {
    return { kind: "payment_expired" }
  }

  return { kind: "form", stage }
}
