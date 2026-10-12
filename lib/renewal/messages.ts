// Motivos pelos quais a renovação não é permitida e os textos mostrados ao paciente (§8.1).

export type RenewalBlock = "plan_not_active" | "renewal_not_open" | "renewal_paid"

export const RENEWAL_BLOCK_MESSAGES: Record<RenewalBlock, string> = {
  plan_not_active: "Este plano não está mais ativo.",
  renewal_not_open:
    "O formulário de atualização fica disponível a partir de 2 dias antes do vencimento do seu plano.",
  renewal_paid: "Recebemos seu pagamento. Seu novo plano está sendo preparado.",
}
