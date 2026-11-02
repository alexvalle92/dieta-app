import { describe, expect, it } from "vitest"
import { mealOptions } from "@/lib/meal-plan/options"

const base = { name: "Jantar", time: "19:00", foods: "Arroz — 100 g\n\n  Frango — 120 g  ", calories: "450" }

describe("mealOptions", () => {
  it("sem substitutes devolve só a principal, com linhas limpas", () => {
    expect(mealOptions(base)).toEqual([{ foods: ["Arroz — 100 g", "Frango — 120 g"], calories: "450" }])
  })

  it("substitutes vazio equivale a ausente", () => {
    expect(mealOptions({ ...base, substitutes: [] })).toHaveLength(1)
  })

  it("principal primeiro, depois a substituta", () => {
    const opts = mealOptions({ ...base, substitutes: [{ foods: "Rap10 — 1 un\nCarne — 100 g", calories: "430" }] })
    expect(opts).toEqual([
      { foods: ["Arroz — 100 g", "Frango — 120 g"], calories: "450" },
      { foods: ["Rap10 — 1 un", "Carne — 100 g"], calories: "430" },
    ])
  })

  it("ignora substitutas malformadas", () => {
    const opts = mealOptions({ ...base, substitutes: [null, "x", { foods: 3 }, { foods: "  \n " }, { foods: "Ovo — 1 un" }] })
    expect(opts).toEqual([opts[0], { foods: ["Ovo — 1 un"], calories: null }])
  })

  it("substitutes que não é lista vira vazio", () => {
    expect(mealOptions({ ...base, substitutes: { foods: "Ovo — 1 un" } })).toHaveLength(1)
  })

  it("calorias numéricas viram texto; vazias ou de outro tipo viram null", () => {
    expect(mealOptions({ ...base, calories: 300 })[0].calories).toBe("300")
    expect(mealOptions({ ...base, calories: "" })[0].calories).toBeNull()
    expect(mealOptions({ ...base, calories: true })[0].calories).toBeNull()
  })

  it("principal sem foods vira lista vazia, mas continua sendo uma opção", () => {
    expect(mealOptions({ name: "Ceia" })).toEqual([{ foods: [], calories: null }])
  })

  it("refeição que não é objeto devolve []", () => {
    expect(mealOptions(null)).toEqual([])
    expect(mealOptions("Almoço")).toEqual([])
  })
})
