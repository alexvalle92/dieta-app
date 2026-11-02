// Texto do Início quando o paciente não tem plano ativo. Quem já teve planos não pode ler que o
// nutricionista "ainda não criou nenhum plano": a mesma tela lista os planos anteriores logo abaixo.

export type NoPlanMessage = { title: string; description: string | null }

export function noActivePlanMessage(planCount: number): NoPlanMessage {
  if (planCount > 0) return { title: "Você não tem um plano ativo no momento", description: null }
  return {
    title: "Nenhum plano alimentar encontrado",
    description: "Seu nutricionista ainda não criou nenhum plano alimentar para você.",
  }
}
