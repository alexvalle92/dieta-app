import { describe, expect, it, vi } from "vitest"
import type { RenewalCharge } from "@/lib/renewal/rules"
import type { MealPlanRow, RenewalRepo } from "@/lib/repos/types"
import { createRenewal } from "@/lib/services/renewal"

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

function setup(found: RenewalCharge | null) {
  const renewals = {
    latestChargeAfter: vi.fn(async (_patientId: string, _after: Date) => found),
    latestAnswers: vi.fn(async (_patientId: string) => null),
  } satisfies RenewalRepo
  return { renewals, renewal: createRenewal({ renewals, now: () => NOW }) }
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
