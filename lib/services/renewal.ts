import { renewalState, type RenewalState } from "@/lib/renewal/rules"
import { todayInSaoPaulo } from "@/lib/time"
import type { ClientMealPlan, MealPlanRow, RenewalRepo } from "@/lib/repos/types"

export type Renewal = {
  /** Estado da renovação de um plano; `none` para plano que não está `active`. */
  stateFor(plan: MealPlanRow): Promise<RenewalState>
  /** Os planos do paciente com o estado da renovação, na mesma ordem. */
  decorate(plans: MealPlanRow[]): Promise<ClientMealPlan[]>
}

const NONE: RenewalState = { status: "none", paymentId: null, dueDate: null, paymentUrl: null }

export function createRenewal(d: { renewals: RenewalRepo; now: () => Date }): Renewal {
  async function stateFor(plan: MealPlanRow): Promise<RenewalState> {
    // Só o plano ativo tem renovação (§4); os demais ficam sem consultar o banco.
    if (plan.status !== "active") return NONE
    const charge = await d.renewals.latestChargeAfter(plan.patientId, plan.createdAt)
    // "Hoje" é a data em São Paulo, não a UTC: às 22h30 de São Paulo a data UTC já é o dia seguinte.
    return renewalState(charge, todayInSaoPaulo(d.now()))
  }

  return {
    stateFor,

    async decorate(plans) {
      return Promise.all(
        plans.map(async (plan) => {
          const state = await stateFor(plan)
          return {
            ...plan,
            renewalStatus: state.status,
            dueDateNewMealPlan: state.dueDate,
            paymentUrlNewMealPlan: state.paymentUrl,
          }
        }),
      )
    },
  }
}
