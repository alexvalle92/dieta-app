import { describe, expect, it } from "vitest"
import { parsePlanFields } from "@/lib/validation/meal-plan"

const DATES_ERROR = "Datas devem estar no formato AAAA-MM-DD"

describe("parsePlanFields", () => {
  it("converte os campos do corpo (snake_case) para os do plano", () => {
    const result = parsePlanFields({
      title: "  Plano de Outubro ",
      description: "Observações",
      start_date: "2026-10-12",
      end_date: "2026-11-11",
      status: "active",
      plan_data: { meals: [], calories: 1800 },
    })

    expect(result).toEqual({
      ok: true,
      value: {
        title: "Plano de Outubro",
        description: "Observações",
        startDate: "2026-10-12",
        endDate: "2026-11-11",
        status: "active",
        planData: { meals: [], calories: 1800 },
      },
    })
  })

  it("campos ausentes ficam de fora (atualização parcial)", () => {
    expect(parsePlanFields({ title: "Só o título" })).toEqual({ ok: true, value: { title: "Só o título" } })
  })

  it.each([null, ""])("description e end_date %j viram null", (empty) => {
    const result = parsePlanFields({ description: empty, end_date: empty })
    expect(result).toEqual({ ok: true, value: { description: null, endDate: null } })
  })

  it.each(["12/10/2026", "2026-13-01", "2026-02-30", "2026-10-12T00:00:00Z", "ontem", 20261012])(
    "start_date %j → erro de formato",
    (start_date) => {
      expect(parsePlanFields({ start_date })).toEqual({ ok: false, error: DATES_ERROR })
    },
  )

  it("end_date inválida → erro de formato", () => {
    expect(parsePlanFields({ end_date: "31/12/2026" })).toEqual({ ok: false, error: DATES_ERROR })
  })

  it.each(["ativo", "", 1])("status %j → erro", (status) => {
    expect(parsePlanFields({ status })).toEqual({
      ok: false,
      error: "status deve ser active, completed ou cancelled",
    })
  })

  it.each(["active", "completed", "cancelled"])("status %s é aceito", (status) => {
    expect(parsePlanFields({ status })).toEqual({ ok: true, value: { status } })
  })

  it.each(["texto", 5, [], true])("plan_data %j (não é objeto) → erro", (plan_data) => {
    expect(parsePlanFields({ plan_data })).toEqual({ ok: false, error: "plan_data deve ser um objeto JSON válido" })
  })

  it("title com mais de 200 caracteres → erro", () => {
    expect(parsePlanFields({ title: "T".repeat(201) })).toEqual({
      ok: false,
      error: "O título deve ter até 200 caracteres",
    })
  })

  it("description que não é texto → erro", () => {
    expect(parsePlanFields({ description: 42 })).toEqual({ ok: false, error: "description deve ser texto" })
  })
})
