import { describe, expect, it } from "vitest"
import { readSubstitutes, toMealPayload } from "@/lib/admin/meal-substitutes"

describe("readSubstitutes", () => {
  it("mantém as entradas com foods em texto não vazio, calorias como texto", () => {
    const meal = {
      substitutes: [{ foods: "Ovo — 1 un", calories: "300" }, { foods: "Pão — 50 g", calories: 280 }, { foods: " " }, null],
    }
    expect(readSubstitutes(meal)).toEqual([
      { foods: "Ovo — 1 un", calories: "300" },
      { foods: "Pão — 50 g", calories: "280" },
    ])
  })

  it("sem substitutes, ou não lista, ou refeição inválida → []", () => {
    expect(readSubstitutes({})).toEqual([])
    expect(readSubstitutes({ substitutes: "x" })).toEqual([])
    expect(readSubstitutes(null)).toEqual([])
  })
})

describe("toMealPayload", () => {
  const meal = { name: "Jantar", time: "19:00", calories: "450", foods: "Arroz — 100 g" }

  it("com substitutas, envia a chave intacta", () => {
    const substitutes = [{ foods: "Rap10 — 1 un", calories: "430" }]
    expect(toMealPayload({ ...meal, substitutes })).toEqual({ ...meal, substitutes })
  })

  it("sem substitutas, omite a chave", () => {
    expect(toMealPayload({ ...meal, substitutes: [] })).toEqual(meal)
    expect("substitutes" in toMealPayload({ ...meal, substitutes: [] })).toBe(false)
  })
})
