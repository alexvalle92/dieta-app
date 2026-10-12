import { describe, expect, it, vi } from "vitest"
import type { RenewalCharge } from "@/lib/renewal/rules"
import type { MealPlanRepo, MealPlanRow, PatientRepo, PatientRow, RenewalRepo } from "@/lib/repos/types"
import { createRenewal } from "@/lib/services/renewal"
import type { RenewalAnswers } from "@/lib/validation/renewal"

// 2026-10-13T01:30:00Z é 22h30 do dia 12 em São Paulo: a data UTC já é o dia seguinte.
const NOW = new Date("2026-10-13T01:30:00Z")

const plan = (over: Partial<MealPlanRow> = {}): MealPlanRow => ({
  id: "plan-1",
  patientId: "patient-1",
  title: "Plano",
  description: null,
  startDate: "2026-09-12",
  endDate: "2026-10-12",
  status: "active",
  planData: {},
  createdAt: new Date("2026-09-12T12:00:00Z"),
  updatedAt: new Date("2026-09-12T12:00:00Z"),
  ...over,
})

const charge = (over: Partial<RenewalCharge> = {}): RenewalCharge => ({
  id: "pay-1",
  status: "PENDING",
  dueDate: "2026-10-12",
  paymentUrl: "https://pay.example/abc",
  paidAt: null,
  ...over,
})

type FormsResult = { ok: true; paymentUrl: string | null } | { ok: false }

const PATIENT: PatientRow = {
  id: "patient-1",
  name: "Ana Souza",
  cpf: "52998224725",
  email: "ana@example.com",
  phone: "11987654321",
  passwordHash: null,
  mustChangePassword: false,
  createdAt: new Date("2026-01-01T12:00:00Z"),
}

function setup(
  found: RenewalCharge | null,
  opts: {
    plan?: MealPlanRow | null
    patient?: PatientRow | null
    previous?: Record<string, unknown> | null
    forms?: FormsResult
  } = {},
) {
  const renewals = {
    latestChargeAfter: vi.fn(async (_patientId: string, _after: Date) => found),
    latestAnswers: vi.fn(async (_patientId: string) => opts.previous ?? null),
  } satisfies RenewalRepo
  const planFound = opts.plan === undefined ? plan() : opts.plan
  const mealPlans = {
    getForPatient: vi.fn(async (id: string, patientId: string) =>
      planFound && planFound.id === id && planFound.patientId === patientId ? planFound : null,
    ),
  }
  const patientFound = opts.patient === undefined ? PATIENT : opts.patient
  const patients = { getById: vi.fn(async (_id: string) => patientFound) }
  const forms = {
    submitRenewal: vi.fn(
      async (_body: { submissionId: string; answers: Record<string, unknown> }): Promise<FormsResult> =>
        opts.forms ?? { ok: true, paymentUrl: "https://pay.example/new" },
    ),
  }
  const renewal = createRenewal({
    renewals,
    mealPlans: mealPlans as unknown as MealPlanRepo,
    patients: patients as unknown as PatientRepo,
    forms,
    now: () => NOW,
  })
  return { renewals, mealPlans, patients, forms, renewal }
}

describe("renewal.stateFor", () => {
  it("plano que não está active → none, sem consultar o repositório", async () => {
    const s = setup(charge())

    expect(await s.renewal.stateFor(plan({ status: "completed" }))).toEqual({
      status: "none",
      paymentId: null,
      dueDate: null,
      paymentUrl: null,
    })
    expect(s.renewals.latestChargeAfter).not.toHaveBeenCalled()
  })

  it("cobrança PENDING com vencimento hoje em São Paulo → awaiting_payment (com a data UTC seria payment_expired)", async () => {
    const s = setup(charge({ status: "PENDING", dueDate: "2026-10-12" }))

    expect(await s.renewal.stateFor(plan())).toEqual({
      status: "awaiting_payment",
      paymentId: "pay-1",
      dueDate: "2026-10-12",
      paymentUrl: "https://pay.example/abc",
    })
  })

  it("plano active sem cobrança de renovação → none", async () => {
    const s = setup(null)
    expect((await s.renewal.stateFor(plan())).status).toBe("none")
  })
})

describe("renewal.decorate", () => {
  it("o plano ativo ganha o estado; os demais, none/null/null; a ordem é mantida", async () => {
    const s = setup(charge())
    const active = plan({ id: "a", createdAt: new Date("2026-09-12T12:00:00Z") })
    const old = plan({ id: "b", status: "completed" })
    const cancelled = plan({ id: "c", status: "cancelled" })

    const result = await s.renewal.decorate([old, active, cancelled])

    expect(result.map((p) => p.id)).toEqual(["b", "a", "c"])
    expect(result[1]).toMatchObject({
      renewalStatus: "awaiting_payment",
      dueDateNewMealPlan: "2026-10-12",
      paymentUrlNewMealPlan: "https://pay.example/abc",
    })
    for (const other of [result[0], result[2]]) {
      expect(other).toMatchObject({ renewalStatus: "none", dueDateNewMealPlan: null, paymentUrlNewMealPlan: null })
    }
    expect(s.renewals.latestChargeAfter).toHaveBeenCalledTimes(1)
    expect(s.renewals.latestChargeAfter).toHaveBeenCalledWith("patient-1", active.createdAt)
  })

  it("lista vazia → lista vazia", async () => {
    const s = setup(null)
    expect(await s.renewal.decorate([])).toEqual([])
  })
})

describe("renewal.check", () => {
  it("plano de outro paciente ou inexistente → not_found, sem consultar cobrança", async () => {
    const s = setup(null)
    expect(await s.renewal.check("plan-1", "outro-paciente")).toBe("not_found")
    expect(await s.renewal.check("inexistente", "patient-1")).toBe("not_found")
    expect(s.renewals.latestChargeAfter).not.toHaveBeenCalled()
  })

  it("plano completed → plan_not_active, com estado none", async () => {
    const s = setup(charge(), { plan: plan({ status: "completed", endDate: "2026-10-14" }) })
    expect(await s.renewal.check("plan-1", "patient-1")).toEqual({
      reason: "plan_not_active",
      state: { status: "none", paymentId: null, dueDate: null, paymentUrl: null },
    })
  })

  it("active com 3 dias para vencer → renewal_not_open", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-10-15" }) })
    expect(await s.renewal.check("plan-1", "patient-1")).toMatchObject({ reason: "renewal_not_open" })
  })

  it("active sem endDate → renewal_not_open", async () => {
    const s = setup(null, { plan: plan({ endDate: null }) })
    expect(await s.renewal.check("plan-1", "patient-1")).toMatchObject({ reason: "renewal_not_open" })
  })

  it("faltando 2 dias em São Paulo (a data UTC já seria o dia 13), abre", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-10-14" }) })
    expect(await s.renewal.check("plan-1", "patient-1")).toMatchObject({ reason: null })
  })

  it("aberto com cobrança paga → renewal_paid", async () => {
    const s = setup(charge({ paidAt: new Date("2026-10-12T10:00:00Z") }), { plan: plan({ endDate: "2026-10-14" }) })
    expect(await s.renewal.check("plan-1", "patient-1")).toMatchObject({
      reason: "renewal_paid",
      state: { status: "paid" },
    })
  })

  it("aberto sem cobrança → reason null e estado none", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-10-14" }) })
    expect(await s.renewal.check("plan-1", "patient-1")).toEqual({
      reason: null,
      state: { status: "none", paymentId: null, dueDate: null, paymentUrl: null },
    })
  })

  it("vencido há 40 dias → reason null (continua aberto)", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-09-02" }) })
    expect(await s.renewal.check("plan-1", "patient-1")).toMatchObject({ reason: null })
  })

  it("cobrança pendente não bloqueia: o paciente pode atualizar os dados", async () => {
    const s = setup(charge(), { plan: plan({ endDate: "2026-10-14" }) })
    expect(await s.renewal.check("plan-1", "patient-1")).toMatchObject({
      reason: null,
      state: { status: "awaiting_payment" },
    })
  })

  it("ordem das razões: plano inativo vence formulário fechado", async () => {
    const s = setup(null, { plan: plan({ status: "cancelled", endDate: "2026-12-31" }) })
    expect(await s.renewal.check("plan-1", "patient-1")).toMatchObject({ reason: "plan_not_active" })
  })
})

describe("renewal.form", () => {
  it("plano que não é do paciente → not_found", async () => {
    const s = setup(null)
    expect(await s.renewal.form("plan-1", "outro")).toBe("not_found")
  })

  it("aberto, com envio antigo: eligible, estado e respostas aproveitadas (peso em branco)", async () => {
    const s = setup(charge(), {
      plan: plan({ endDate: "2026-10-14" }),
      previous: { faixa_etaria: "25-34 anos", altura_cm: "165", peso_kg: "75", almoco: ["Carne de frango", "Velha"] },
    })

    expect(await s.renewal.form("plan-1", "patient-1")).toEqual({
      eligible: true,
      reason: null,
      answers: { faixa_etaria: "25-34 anos", altura_cm: 165, almoco: ["Carne de frango"] },
      renewal: { status: "awaiting_payment", dueDate: "2026-10-12", paymentUrl: "https://pay.example/abc" },
    })
    expect(s.renewals.latestAnswers).toHaveBeenCalledWith("patient-1")
  })

  it("paciente sem envio (criado pelo admin) → respostas vazias", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-10-14" }), previous: null })
    expect(await s.renewal.form("plan-1", "patient-1")).toEqual({
      eligible: true,
      reason: null,
      answers: {},
      renewal: { status: "none", dueDate: null, paymentUrl: null },
    })
  })

  it("fechado: eligible false com o motivo", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-10-20" }) })
    expect(await s.renewal.form("plan-1", "patient-1")).toMatchObject({
      eligible: false,
      reason: "renewal_not_open",
      renewal: { status: "none" },
    })
  })

  it("pago: eligible false e estado paid", async () => {
    const s = setup(charge({ paidAt: new Date("2026-10-12T10:00:00Z") }), { plan: plan({ endDate: "2026-10-14" }) })
    expect(await s.renewal.form("plan-1", "patient-1")).toMatchObject({
      eligible: false,
      reason: "renewal_paid",
      renewal: { status: "paid", dueDate: null, paymentUrl: null },
    })
  })

  it("resposta antiga com formato inesperado não derruba a tela", async () => {
    const s = setup(null, {
      plan: plan({ endDate: "2026-10-14" }),
      previous: ["lixo"] as unknown as Record<string, unknown>,
    })
    expect(await s.renewal.form("plan-1", "patient-1")).toMatchObject({ eligible: true, answers: {} })
  })
})

describe("renewal.submit", () => {
  const SUBMISSION_ID = "0b5f3a9e-8f5e-4d0c-9c0e-3b3f0f6a1c11"
  const answers: RenewalAnswers = {
    faixa_etaria: "25-34 anos",
    sexo_biologico: "Feminino",
    tipo_fisico: "Gordinho(a). Leve excesso de gordura corporal.",
    peso_comportamento: "Oscila com facilidade",
    sobremesa: "Sim",
    rotina_dia: "Passo a maior parte do tempo sentado(a)",
    sono: "5–6 horas",
    agua: "Mais de 6 copos",
    breakfast_foods: ["Ovo"],
    almoco: ["Carne de frango"],
    lanche_tarde: ["Fruta"],
    jantar: ["Sopa"],
    habitos: ["Como de madrugada"],
    altura_cm: 165,
    peso_kg: 75.5,
    meta_peso_30d: 70,
  }
  const call = { planId: "plan-1", patientId: "patient-1", submissionId: SUBMISSION_ID, answers }

  it("plano de outro paciente → not_found, sem chamar o v0-tami-forms", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-10-14" }) })
    expect(await s.renewal.submit({ ...call, patientId: "outro" })).toBe("not_found")
    expect(s.forms.submitRenewal).not.toHaveBeenCalled()
  })

  it.each([
    ["plan_not_active", plan({ status: "completed", endDate: "2026-10-14" }), null],
    ["renewal_not_open", plan({ endDate: "2026-10-20" }), null],
    ["renewal_paid", plan({ endDate: "2026-10-14" }), charge({ paidAt: new Date("2026-10-12T10:00:00Z") })],
  ] as const)("bloqueado por %s → { blocked }, sem chamar o v0-tami-forms", async (reason, p, found) => {
    const s = setup(found, { plan: p })
    expect(await s.renewal.submit(call)).toEqual({ blocked: reason })
    expect(s.forms.submitRenewal).not.toHaveBeenCalled()
  })

  it("sucesso: envia o submissionId e as respostas montadas com os dados do cadastro", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-10-14" }) })

    expect(await s.renewal.submit(call)).toEqual({ paymentUrl: "https://pay.example/new" })

    expect(s.patients.getById).toHaveBeenCalledWith("patient-1")
    expect(s.forms.submitRenewal).toHaveBeenCalledTimes(1)
    const sent = s.forms.submitRenewal.mock.calls[0][0]
    expect(sent.submissionId).toBe(SUBMISSION_ID)
    expect(sent.answers).toMatchObject({
      sono: "5–6 horas",
      altura_cm: "165",
      peso_kg: "75.5",
      meta_peso_30d: "70",
      imc: "27.73",
      nome_completo: "Ana Souza",
      email: "ana@example.com",
      whatsapp: "11987654321",
      cpf: "52998224725",
    })
  })

  it("renovação vencida há 40 dias também pode ser enviada", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-09-02" }) })
    expect(await s.renewal.submit(call)).toEqual({ paymentUrl: "https://pay.example/new" })
  })

  it("cobrança pendente existente: o envio segue (atualizar dados)", async () => {
    const s = setup(charge(), { plan: plan({ endDate: "2026-10-14" }) })
    expect(await s.renewal.submit(call)).toEqual({ paymentUrl: "https://pay.example/new" })
  })

  it("paymentUrl nulo → { paymentUrl: null }", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-10-14" }), forms: { ok: true, paymentUrl: null } })
    expect(await s.renewal.submit(call)).toEqual({ paymentUrl: null })
  })

  it("v0-tami-forms indisponível → forms_unavailable", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-10-14" }), forms: { ok: false } })
    expect(await s.renewal.submit(call)).toBe("forms_unavailable")
  })

  it("paciente que sumiu entre o plano e o envio → not_found, sem chamar o v0-tami-forms", async () => {
    const s = setup(null, { plan: plan({ endDate: "2026-10-14" }), patient: null })
    expect(await s.renewal.submit(call)).toBe("not_found")
    expect(s.forms.submitRenewal).not.toHaveBeenCalled()
  })
})
