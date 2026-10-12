import type { RenewalBlock } from "@/lib/renewal/messages"
import { daysLeft, isRenewalOpen, renewalState, type RenewalState, type RenewalStatus } from "@/lib/renewal/rules"
import { todayInSaoPaulo } from "@/lib/time"
import type { SubmitRenewalResult } from "@/lib/forms-client"
import type { ClientMealPlan, MealPlanRepo, MealPlanRow, PatientRepo, RenewalRepo } from "@/lib/repos/types"
import { buildSubmissionAnswers, prefillAnswers, type RenewalAnswers } from "@/lib/validation/renewal"

export type Renewal = {
  /** Estado da renovação de um plano; `none` para plano que não está `active`. */
  stateFor(plan: MealPlanRow): Promise<RenewalState>
  /** Os planos do paciente com o estado da renovação, na mesma ordem. */
  decorate(plans: MealPlanRow[]): Promise<ClientMealPlan[]>
  /**
   * Se o paciente pode renovar este plano agora (§8.2, passo 3) e o estado da renovação.
   * `reason` nulo: pode. Plano de outro paciente ou inexistente: `not_found`.
   */
  check(planId: string, patientId: string): Promise<"not_found" | { reason: RenewalBlock | null; state: RenewalState }>
  /** Dados da tela do formulário: permissão, respostas do último envio e estado da renovação. */
  form(
    planId: string,
    patientId: string,
  ): Promise<
    | "not_found"
    | {
        eligible: boolean
        reason: RenewalBlock | null
        answers: Partial<RenewalAnswers>
        renewal: { status: RenewalStatus; dueDate: string | null; paymentUrl: string | null }
      }
  >
  /** Refaz o `check` e, liberado, envia o formulário ao v0-tami-forms com os dados do cadastro. */
  submit(d: {
    planId: string
    patientId: string
    submissionId: string
    answers: RenewalAnswers
  }): Promise<"not_found" | { blocked: RenewalBlock } | "forms_unavailable" | { paymentUrl: string | null }>
}

const NONE: RenewalState = { status: "none", paymentId: null, dueDate: null, paymentUrl: null }

export function createRenewal(d: {
  renewals: RenewalRepo
  mealPlans: MealPlanRepo
  patients: PatientRepo
  forms: {
    submitRenewal(body: { submissionId: string; answers: Record<string, unknown> }): Promise<SubmitRenewalResult>
  }
  now: () => Date
}): Renewal {
  async function stateFor(plan: MealPlanRow): Promise<RenewalState> {
    // Só o plano ativo tem renovação (§4); os demais ficam sem consultar o banco.
    if (plan.status !== "active") return NONE
    const charge = await d.renewals.latestChargeAfter(plan.patientId, plan.createdAt)
    // "Hoje" é a data em São Paulo, não a UTC: às 22h30 de São Paulo a data UTC já é o dia seguinte.
    return renewalState(charge, todayInSaoPaulo(d.now()))
  }

  async function check(planId: string, patientId: string) {
    const plan = await d.mealPlans.getForPatient(planId, patientId)
    if (!plan) return "not_found" as const

    if (plan.status !== "active") return { reason: "plan_not_active" as const, state: NONE }

    const state = await stateFor(plan)
    // Vencido há dias também está aberto: `isRenewalOpen` vale para dias negativos (§4).
    if (!isRenewalOpen(daysLeft(plan.endDate, todayInSaoPaulo(d.now())))) {
      return { reason: "renewal_not_open" as const, state }
    }
    if (state.status === "paid") return { reason: "renewal_paid" as const, state }
    return { reason: null, state }
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

    check,

    async form(planId, patientId) {
      const result = await check(planId, patientId)
      if (result === "not_found") return "not_found"

      const previous = await d.renewals.latestAnswers(patientId)
      return {
        eligible: result.reason === null,
        reason: result.reason,
        answers: prefillAnswers(previous),
        renewal: {
          status: result.state.status,
          dueDate: result.state.dueDate,
          paymentUrl: result.state.paymentUrl,
        },
      }
    },

    async submit({ planId, patientId, submissionId, answers }) {
      // A permissão é conferida de novo: a rota já chamou `check`, mas o estado pode ter mudado
      // (pagamento confirmado) e o `submit` é a última barreira antes de pedir a cobrança.
      const result = await check(planId, patientId)
      if (result === "not_found") return "not_found"
      if (result.reason) return { blocked: result.reason }

      const patient = await d.patients.getById(patientId)
      if (!patient) return "not_found"

      const sent = await d.forms.submitRenewal({
        submissionId,
        answers: buildSubmissionAnswers(
          { name: patient.name, email: patient.email, phone: patient.phone, cpf: patient.cpf },
          answers,
        ),
      })
      if (!sent.ok) return "forms_unavailable"
      return { paymentUrl: sent.paymentUrl }
    },
  }
}
